// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEscrow {
    function refund(bytes32 key, uint256 index) external;
    function release(bytes32 key, uint256 index) external;
}

/// @dev Test helper: tries to re-enter the escrow when it receives funds.
contract ReentrantReceiver {
    IEscrow private immutable escrow;
    bytes32 private key;
    uint256 private index;

    constructor(address escrow_) {
        escrow = IEscrow(escrow_);
    }

    function setTarget(bytes32 key_, uint256 index_) external {
        key = key_;
        index = index_;
    }

    receive() external payable {
        escrow.refund(key, index);
    }
}
