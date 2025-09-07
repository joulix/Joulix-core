// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MarketplaceUSDC
/// @notice Prosty marketplace (escrow) dla ERC-1155 (np. CarbonLedgerGoO) z rozliczeniem w USDC/EURC.
/// @dev Cena definiowana jest "za 1e18 jednostki" aktywa ERC-1155 (skala = 1e18).
contract MarketplaceUSDC is ERC1155Holder, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Role ---
    bytes32 public constant ROLE_ADMIN  = DEFAULT_ADMIN_ROLE;
    bytes32 public constant ROLE_PAUSER = keccak256("ROLE_PAUSER");

    // --- State ---
    IERC20  public immutable quote;     // USDC/EURC (ERC-20)
    address public treasury;            // adres opłat (fee)
    uint96  public feeBps;              // fee w bazowych punktach (100 = 1%)
    uint256 public nextId = 1;          // id kolejnych listingów

    // dozwolone kolekcje ERC-1155 (np. nasz CarbonLedgerGoO)
    mapping(address => bool) public allowedCollection;

    struct Listing {
        address seller;
        address token;        // adres ERC1155
        uint256 tokenId;
        uint256 amount;       // ilość wystawiona łącznie (w jednostkach ERC1155, np. 1e18)
        uint256 filled;       // ile już sprzedano
        uint256 pricePerUnit; // cena w 'quote' za 1e18 jednostki
        bool    active;
    }

    mapping(uint256 => Listing) public listings;

    // --- Events ---
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed token,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit
    );
    event Purchased(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 cost, uint256 fee);
    event Canceled(uint256 indexed listingId, uint256 remaining);
    event CollectionAllowed(address indexed token, bool allowed);
    event FeeUpdated(uint96 feeBps, address indexed treasury);

    // --- Errors (czytelniejsze revert msg w krytycznych miejscach) ---
    error CollectionNotAllowed();
    error AmountZero();
    error PriceZero();
    error Inactive();
    error NotSeller();
    error InsufficientRemaining();
    error TreasuryZero();
    error FeeTooHigh();

    constructor(IERC20 _quote, address _admin, address _treasury, uint96 _feeBps) {
        if (address(_quote) == address(0)) revert TreasuryZero(); // używamy tego samego błędu dla uproszczenia
        if (_treasury == address(0)) revert TreasuryZero();
        if (_feeBps > 2_000) revert FeeTooHigh(); // 20% twardy limit

        quote = _quote;
        treasury = _treasury;
        feeBps = _feeBps;

        _grantRole(ROLE_ADMIN, _admin);
        _grantRole(ROLE_PAUSER, _admin);
    }

    // ---------- Admin ----------

    /// @notice Ustawienie opłaty i adresu trezora (fee recipient).
    function setFee(uint96 _feeBps, address _treasury) external onlyRole(ROLE_ADMIN) {
        if (_treasury == address(0)) revert TreasuryZero();
        if (_feeBps > 2_000) revert FeeTooHigh();
        feeBps = _feeBps;
        treasury = _treasury;
        emit FeeUpdated(_feeBps, _treasury);
    }

    /// @notice Zezwolenie/zabronienie kolekcji ERC1155.
    function allowCollection(address token, bool allowed) external onlyRole(ROLE_ADMIN) {
        allowedCollection[token] = allowed;
        emit CollectionAllowed(token, allowed);
    }

    function pause() external onlyRole(ROLE_PAUSER) { _pause(); }
    function unpause() external onlyRole(ROLE_PAUSER) { _unpause(); }

    // ---------- Sprzedaż ----------

    /// @notice Wystawienie oferty. Przed wywołaniem sprzedawca musi dać approval (setApprovalForAll) dla tego kontraktu.
    /// @param token  adres kolekcji ERC1155 (np. CarbonLedgerGoO)
    /// @param tokenId id aktywa
    /// @param amount ilość wystawiana (w jednostkach ERC1155, np. 1e18 = 1 MWh)
    /// @param pricePerUnit cena w quote (USDC/EURC) za 1e18 jednostki
    function list(address token, uint256 tokenId, uint256 amount, uint256 pricePerUnit)
        external
        whenNotPaused
        returns (uint256 id)
    {
        if (!allowedCollection[token]) revert CollectionNotAllowed();
        if (amount == 0) revert AmountZero();
        if (pricePerUnit == 0) revert PriceZero();

        // escrow: przenosimy towar do kontraktu
        IERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        id = nextId++;
        listings[id] = Listing({
            seller: msg.sender,
            token: token,
            tokenId: tokenId,
            amount: amount,
            filled: 0,
            pricePerUnit: pricePerUnit,
            active: true
        });

        emit Listed(id, msg.sender, token, tokenId, amount, pricePerUnit);
    }

    /// @notice Zakup części/całości listing'u.
    /// @param id id oferty
    /// @param amount żądana ilość (w jednostkach ERC1155, zgodnych z listingiem)
    function buy(uint256 id, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        Listing storage L = listings[id];
        if (!L.active) revert Inactive();
        if (amount == 0) revert AmountZero();

        uint256 rem = L.amount - L.filled;
        if (amount > rem) revert InsufficientRemaining();

        // koszt = amount * pricePerUnit / 1e18 (cena zdefiniowana per 1e18)
        uint256 cost = (amount * L.pricePerUnit) / 1e18;

        // fee
        uint256 fee = (cost * feeBps) / 10_000;
        uint256 net = cost - fee;

        // pobranie płatności od kupującego
        if (fee > 0) {
            quote.safeTransferFrom(msg.sender, treasury, fee);
        }
        quote.safeTransferFrom(msg.sender, L.seller, net);

        // wydanie towaru
        IERC1155(L.token).safeTransferFrom(address(this), msg.sender, L.tokenId, amount, "");

        // aktualizacja
        L.filled += amount;
        if (L.filled == L.amount) {
            L.active = false;
        }

        emit Purchased(id, msg.sender, amount, cost, fee);
    }

    /// @notice Anulacja i zwrot niesprzedanej ilości do sprzedawcy.
    function cancel(uint256 id)
        external
        nonReentrant
        whenNotPaused
    {
        Listing storage L = listings[id];
        if (!L.active) revert Inactive();
        if (msg.sender != L.seller) revert NotSeller();

        uint256 rem = L.amount - L.filled;
        L.active = false;

        if (rem > 0) {
            IERC1155(L.token).safeTransferFrom(address(this), L.seller, L.tokenId, rem, "");
        }

        emit Canceled(id, rem);
    }

    // ---------- Widoki pomocnicze ----------

    function remaining(uint256 id) external view returns (uint256) {
        Listing memory L = listings[id];
        if (!L.active) return 0;
        return L.amount - L.filled;
    }

    // ---------- Ratunkowe / odzysk środków (tylko admin) ----------

    /// @notice Odzyskanie omyłkowo wysłanych tokenów ERC20 (np. gdy ktoś wyśle quote bez buy).
    function rescueERC20(address token, address to, uint256 amount) external onlyRole(ROLE_ADMIN) {
        IERC20(token).safeTransfer(to, amount);
    }

    /// @notice Odzyskanie omyłkowo wysłanych tokenów ERC1155 (niezwiązanych z aktywnymi listingami).
    function rescueERC1155(address token, address to, uint256 id, uint256 amount, bytes calldata data)
        external
        onlyRole(ROLE_ADMIN)
    {
        IERC1155(token).safeTransferFrom(address(this), to, id, amount, data);
    }

    // ---------- Wymagane override ----------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC1155Holder)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
