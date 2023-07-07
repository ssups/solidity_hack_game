// SPDX-License-Identifier: MIT 

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor(address[] memory users) ERC20("TestToken", "TTK") {
        for (uint i = 0; i < users.length; i++) {
        _mint(users[i], (i + 1) * 100 ether);
        }
    }

}
