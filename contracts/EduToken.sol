// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EduToken is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 500 * 10 ** 18; // 500 EDU

    constructor() ERC20("EduVault Utility Token", "EDU") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 100000 * 10 ** 18);
    }

    // Allows test accounts (Employers) to claim free test $EDU tokens for demo
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    // Admin mint function
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}