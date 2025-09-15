// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title USDCmock
/// @notice Prosty mock USDC (6 dec) do testów i demo.
/// @dev Dodane walidacje mint(to!=0), oraz mechanizmy burn/burnFrom.
contract USDCmock is ERC20, Ownable {
    uint8 private constant DEC = 6;

    constructor() ERC20("USDC Mock", "USDC") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return DEC;
    }

    /// @notice Mint dla testów (tylko owner)
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "mint to zero");
        _mint(to, amount); // ERC20 emituje Transfer(0x0 -> to, amount)
    }

    /// @notice Spal własne środki
    function burn(uint256 amount) external {
        _burn(msg.sender, amount); // emituje Transfer(from -> 0x0, amount)
    }

    /// @notice Spal środki z czyjegoś konta (wymaga allowance)
    function burnFrom(address from, uint256 amount) external {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }
}
