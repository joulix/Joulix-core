// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title MarketplaceUSDC
/// @notice Escrow marketplace dla ERC-1155 rozliczany w ERC-20 (USDC/EURC).
/// @dev Cena definiowana „za 1e18 jednostki” aktywa ERC-1155.
contract MarketplaceUSDC is ERC1155Holder, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Role ---
    bytes32 public constant ROLE_ADMIN  = DEFAULT_ADMIN_ROLE;
    bytes32 public constant ROLE_PAUSER = keccak256("ROLE_PAUSER");

    // --- State ---
    IERC20  public immutable quote;      // USDC/EURC (ERC-20)
    address public treasury;             // adres opłat (fee)
    uint96  public feeBps;               // fee w bps (100=1%)
    uint256 public nextId = 1;           // id kolejnych listingów

    // dozwolone kolekcje ERC-1155 (np. CarbonLedgerGoO)
    mapping(address => bool) public allowedCollection;

    struct Listing {
        address seller;
        address token;        // adres ERC1155
        uint256 tokenId;
        uint256 amount;       // ilość wystawiona (w 1e18 = 1 MWh)
        uint256 filled;       // ile sprzedano
        uint256 pricePerUnit; // cena w quote (6 dec) za 1e18 jednostki
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
    event Purchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 cost,
        uint256 fee
    );
    event Canceled(uint256 indexed listingId, uint256 remaining);
    event PartialCanceled(uint256 indexed listingId, uint256 amountReturned);
    event CollectionAllowed(address indexed token, bool allowed);
    event FeeUpdated(uint96 feeBps, address indexed treasury);
    event PriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice);

    // --- Errors ---
    error CollectionNotAllowed();
    error AmountZero();
    error PriceZero();
    error Inactive();
    error NotSeller();
    error InsufficientRemaining();
    error TreasuryZero();
    error FeeTooHigh();

    constructor(IERC20 _quote, address _admin, address _treasury, uint96 _feeBps) {
        if (address(_quote) == address(0)) revert TreasuryZero(); // minimalny reuse błędu
        if (_treasury == address(0)) revert TreasuryZero();
        if (_feeBps > 2_000) revert FeeTooHigh(); // 20% twardy limit

        quote    = _quote;
        treasury = _treasury;
        feeBps   = _feeBps;

        _grantRole(ROLE_ADMIN, _admin);
        _grantRole(ROLE_PAUSER, _admin);
    }

    // ---------- Admin ----------

    function setFee(uint96 _feeBps, address _treasury) external onlyRole(ROLE_ADMIN) {
        if (_treasury == address(0)) revert TreasuryZero();
        if (_feeBps > 2_000) revert FeeTooHigh();
        feeBps   = _feeBps;
        treasury = _treasury;
        emit FeeUpdated(_feeBps, _treasury);
    }

    function allowCollection(address token, bool allowed) external onlyRole(ROLE_ADMIN) {
        allowedCollection[token] = allowed;
        emit CollectionAllowed(token, allowed);
    }

    function pause()   external onlyRole(ROLE_PAUSER) { _pause(); }
    function unpause() external onlyRole(ROLE_PAUSER) { _unpause(); }

    // ---------- Sprzedaż ----------

    /// @notice Wystawienie oferty (escrow). Sprzedawca musi mieć setApprovalForAll na kontrakt marketplace.
    function list(
        address token,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit
    ) external nonReentrant whenNotPaused returns (uint256 id) {
        if (!allowedCollection[token]) revert CollectionNotAllowed();
        if (amount == 0)       revert AmountZero();
        if (pricePerUnit == 0) revert PriceZero();

        // [CEI] Najpierw zapis stanu, potem external call
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

        // escrow (revert cofnie zapis stanu)
        IERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        emit Listed(id, msg.sender, token, tokenId, amount, pricePerUnit);
    }

    /// @notice Zakup części/całości listing'u.
    function buy(uint256 id, uint256 amount) external nonReentrant whenNotPaused {
        Listing storage L = listings[id];
        if (!L.active)    revert Inactive();
        if (amount == 0)  revert AmountZero();

        uint256 rem = L.amount - L.filled;
        if (amount > rem) revert InsufficientRemaining();

        // koszt = amount * pricePerUnit / 1e18 (bezpiecznie, precyzyjnie)
        uint256 cost = Math.mulDiv(amount, L.pricePerUnit, 1e18);

        // fee split
        uint256 fee = (cost * feeBps) / 10_000;
        uint256 net = cost - fee;

        // płatność
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

    /// @notice Anulacja całości i zwrot niesprzedanej części.
    function cancel(uint256 id) external nonReentrant whenNotPaused {
        Listing storage L = listings[id];
        if (!L.active)         revert Inactive();
        if (msg.sender != L.seller) revert NotSeller();

        uint256 rem = L.amount - L.filled;
        L.active = false;

        if (rem > 0) {
            IERC1155(L.token).safeTransferFrom(address(this), L.seller, L.tokenId, rem, "");
        }

        emit Canceled(id, rem);
    }

    /// @notice Częściowa anulacja (zmniejszenie amount i zwrot towaru).
    function cancelPartial(uint256 id, uint256 amountToCancel) external nonReentrant whenNotPaused {
        Listing storage L = listings[id];
        if (!L.active)             revert Inactive();
        if (msg.sender != L.seller) revert NotSeller();

        uint256 rem = L.amount - L.filled;
        require(amountToCancel > 0 && amountToCancel <= rem, "invalid cancel amount");

        L.amount -= amountToCancel;
        IERC1155(L.token).safeTransferFrom(address(this), L.seller, L.tokenId, amountToCancel, "");

        if (L.filled == L.amount) {
            L.active = false;
        }

        emit PartialCanceled(id, amountToCancel);
    }

    /// @notice Aktualizacja ceny aktywnego listing'u przez sprzedawcę.
    function updatePrice(uint256 id, uint256 newPricePerUnit) external nonReentrant whenNotPaused {
        Listing storage L = listings[id];
        if (!L.active)             revert Inactive();
        if (msg.sender != L.seller) revert NotSeller();
        if (newPricePerUnit == 0)   revert PriceZero();

        uint256 old = L.pricePerUnit;
        L.pricePerUnit = newPricePerUnit;

        emit PriceUpdated(id, old, newPricePerUnit);
    }

    // ---------- Widoki ----------

    function remaining(uint256 id) external view returns (uint256) {
        Listing memory L = listings[id];
        if (!L.active) return 0;
        return L.amount - L.filled;
    }

    // ---------- Rescue (admin) ----------

    function rescueERC20(address token, address to, uint256 amount) external onlyRole(ROLE_ADMIN) {
        IERC20(token).safeTransfer(to, amount);
    }

    function rescueERC1155(
        address token,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(ROLE_ADMIN) {
        IERC1155(token).safeTransferFrom(address(this), to, tokenId, amount, data);
    }

    // ---------- Overrides ----------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC1155Holder)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
