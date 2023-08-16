// SPDX-License-Identifier: MIT 

// https://mixbytes.io/blog/pitfalls-of-using-cteate-cteate2-and-extcodesize-opcodes

pragma solidity 0.8.18;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "hardhat/console.sol";

contract S1_UpgradeWithoutProxyV1 {
    mapping(address => mapping(address => uint)) public balanceOf; // user => tokenCa => balance
    address destroyer;

    constructor(){
        destroyer = msg.sender;
    }

    event Deposit(address indexed tokenCa, address indexed user, uint amount);
    fallback() external {
        revert("function does not exist");
    }

    function deposit(address tokenCa, uint amount) external {
        require(tokenCa != address(0), "wrong token contract address");
        require(amount > 0, "deposit amount should bigger than 0");
        balanceOf[tokenCa][msg.sender] += amount;
        IERC20(tokenCa).transferFrom(msg.sender, address(this), amount);
        emit Deposit(tokenCa, msg.sender, amount);
    }

    function destroy() external {
        require(msg.sender == destroyer, "not destroyer");
        selfdestruct(payable(destroyer));
    }
}

contract S1_UpgradeWithoutProxyV2 {
    address private _owner;
    
    constructor(){
        _owner = tx.origin;
    }

    modifier onlyOwner(){
        require(msg.sender == _owner, "not owner");
        _;
    }

    function withdrawAll(address tokenCa) external onlyOwner() {
        IERC20(tokenCa).transfer(_owner, IERC20(tokenCa).balanceOf(address(this)));
    }
}

contract Factory2 {
    address parent;
    address deployedContract;

    constructor() {
        parent = msg.sender;
    }

    modifier onlyParent() {
        require(msg.sender == parent, "not parent contract");
        _;
    }

    function destroy() external onlyParent {
        S1_UpgradeWithoutProxyV1(deployedContract).destroy();
        selfdestruct(payable(parent));
    }

    // function deploy(bytes memory bytecode) external onlyParent returns(address) {
    //     address addr;
    //     assembly {
    //         addr := create(
    //             0, // amount to sent to new contract
    //             add(bytecode, 0x20), // ost
    //             mload(bytecode) // len
    //         )
    //     }
    //     deployedContract = addr;
    //     return addr;
    // }
    function deploy(bytes calldata bytecode) external onlyParent returns(address) {
        address addr;
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 68, bytecode.length) // 68 -> 4(selector) + 32(offset) + 32(length)
            addr := create(
                0, // amount to sent to new contract
                ptr, // ost
                bytecode.length // len
            )
        }
        deployedContract = addr;
        return addr;
    }
}
contract Factory1 {
    address owner;
    address deployedFactory2Ca;

    event Deploy(address contractAddr, address factory2Addr);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function destroy() external onlyOwner {
        S1_UpgradeWithoutProxyV1(deployedFactory2Ca).destroy();
    }

    function deploy(uint salt, bytes calldata bytecode) external onlyOwner {
        // using create2
        Factory2 factory2 = new Factory2{salt: bytes32(salt)}();
        deployedFactory2Ca = address(factory2);
        address addr = factory2.deploy(bytecode);
        emit Deploy(addr, address(factory2));
    }
}
