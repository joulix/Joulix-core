// SPDX-License-Identifier: BSL-1.1
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CarbonLedgerGoO
 * @notice ERC-1155 do tokenizacji certyfikatów energii (np. 1 token = 1 MWh).
 *         - ROLE_ADMIN: zarządza rolami, URI i stanem pauzy
 *         - ROLE_ISSUER: może mintować certyfikaty
 *         - retire = spalenie (burn) – trwałe umorzenie certyfikatu
 *         - revoke  = blokada transferów dla danego tokenId (np. błąd wydania)
 */
contract CarbonLedgerGoO is ERC1155, ERC1155Supply, AccessControl, Pausable {
    bytes32 public constant ROLE_ADMIN  = DEFAULT_ADMIN_ROLE;
    bytes32 public constant ROLE_ISSUER = keccak256("ROLE_ISSUER");
    bytes32 public constant ROLE_PAUSER = keccak256("ROLE_PAUSER");

    // blokada transferów dla konkretnego tokenId (np. cofnięty/odwołany batch)
    mapping(uint256 => bool) public revoked;

    // Zdarzenia dziedzinowe
    event Retired(address indexed account, uint256 indexed id, uint256 value, string reason);
    event Revoked(uint256 indexed id, string reason);

    constructor(string memory baseURI, address admin, address initialIssuer) ERC1155(baseURI) {
        _grantRole(ROLE_ADMIN, admin);
        _grantRole(ROLE_PAUSER, admin);
        if (initialIssuer != address(0)) {
            _grantRole(ROLE_ISSUER, initialIssuer);
        }
    }

    // ---------- Admin / Konfiguracja ----------

    function setURI(string memory newuri) external onlyRole(ROLE_ADMIN) {
        _setURI(newuri);
    }

    function pause() external onlyRole(ROLE_PAUSER) { _pause(); }
    function unpause() external onlyRole(ROLE_PAUSER) { _unpause(); }

    function setRevoked(uint256 id, bool status, string calldata reason) external onlyRole(ROLE_ADMIN) {
        revoked[id] = status;
        if (status) emit Revoked(id, reason);
    }

    // ---------- Wydawanie (mint) ----------

    /// @dev value = ilość jednostek (np. 1e18 jeśli id reprezentuje 1 MWh z 18 miejscami)
    function mint(address to, uint256 id, uint256 value, bytes calldata data)
        external
        onlyRole(ROLE_ISSUER)
    {
        _mint(to, id, value, data);
    }

    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data)
        external
        onlyRole(ROLE_ISSUER)
    {
        _mintBatch(to, ids, values, data);
    }

    // ---------- Umorzenie (retire) = burn ----------
    function retire(uint256 id, uint256 value, string calldata reason) external {
        _burn(msg.sender, id, value);
        emit Retired(msg.sender, id, value, reason);
    }

    function retireBatch(uint256[] calldata ids, uint256[] calldata values, string calldata reason) external {
        _burnBatch(msg.sender, ids, values);
        // pojedyncze zdarzenie zbiorcze można emitować osobno, tu zdarzenia nie są batchowane dla prostoty
        for (uint256 i = 0; i < ids.length; i++) {
            emit Retired(msg.sender, ids[i], values[i], reason);
        }
    }

    // ---------- Hooki / Blokady ----------

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        // Pauza globalna
        require(!paused(), "paused");

        // Sprawdzenie odwołanych tokenId
        for (uint256 i = 0; i < ids.length; i++) {
            require(!revoked[ids[i]], "token revoked");
        }

        super._update(from, to, ids, values);
    }

    // Wymagane przez kompilator (wielokrotne dziedziczenie)
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
