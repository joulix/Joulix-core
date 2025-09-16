// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDCmock is ERC20 {
    uint8 private constant DEC = 6;
    address public owner;

    constructor() ERC20("USD Coin Mock", "USDCm") {
        owner = msg.sender;
    }

    function decimals() public pure override returns (uint8) {
        return DEC;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "not owner");
        _mint(to, amount);
    }
}
