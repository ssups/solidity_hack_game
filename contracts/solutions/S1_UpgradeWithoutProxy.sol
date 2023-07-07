// SPDX-License-Identifier: MIT 

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract S1_UpgradeWithoutProxyV1 {
    mapping(address => mapping(address => uint)) public balanceOf; // user => tokenCa => balance

    event Deposit(address indexed tokenCa, address indexed user, uint amount);
    function deposit(address tokenCa, uint amount) external {
        require(tokenCa != address(0), "wrong token contract address");
        require(amount > 0, "deposit amount should bigger than 0");
        balanceOf[msg.sender][tokenCa] += amount;
        IERC20(tokenCa).transferFrom(msg.sender, address(this), amount);
        emit Deposit(tokenCa, msg.sender, amount);
    }

    fallback() external {
        revert("function does not exist");
    }
}

contract S1_UpgradeWithoutProxyV2 {
    address private _owner;
    
    constructor(){
        _owner = msg.sender;
    }

    modifier onlyOwner(){
        require(msg.sender == _owner, "not owner");
        _;
    }

    function withdrawAll(address tokenCa) external onlyOwner() {
        IERC20(tokenCa).transfer(_owner, IERC20(tokenCa).balanceOf(address(this)));
    }
}