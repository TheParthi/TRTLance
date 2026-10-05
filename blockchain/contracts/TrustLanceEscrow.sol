// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustLanceEscrow
 * @notice Non-custodial milestone escrow for TrustLance contracts, in the chain's native coin.
 *
 * Trust model
 *  - The client deposits every milestone up front with `fund`. Nobody — including the owner — can
 *    withdraw the balance; there is no emergency withdrawal.
 *  - Only the client can release a milestone to the freelancer (`release`).
 *  - Only the freelancer can return a milestone to the client (`refund`).
 *  - Either party can flag a milestone as disputed (`raiseDispute`). The arbiter can move funds
 *    *only* for flagged milestones (`resolveDispute`), splitting them by a percentage.
 *  - The owner can only rotate the arbiter (intended to be a multisig).
 *
 * Agreements are keyed by keccak256(abi.encode(client, ref)), where `ref` is the TrustLance
 * contract id. Including the client in the key means nobody can squat another client's reference.
 */
contract TrustLanceEscrow is Ownable2Step, ReentrancyGuard {
    enum MilestoneStatus { None, Funded, Released, Refunded, Disputed, Resolved }

    struct Agreement {
        address client;
        address freelancer;
        uint64 fundedAt;
        uint32 milestoneCount;
    }

    struct Milestone {
        uint256 amount;
        MilestoneStatus status;
    }

    uint256 public constant MAX_MILESTONES = 20;

    address public arbiter;
    mapping(bytes32 => Agreement) private _agreements;
    mapping(bytes32 => mapping(uint256 => Milestone)) private _milestones;

    event Funded(bytes32 indexed key, bytes32 indexed ref, address indexed client, address freelancer, uint256 total, uint256[] amounts);
    event Released(bytes32 indexed key, uint256 indexed index, address indexed to, uint256 amount);
    event Refunded(bytes32 indexed key, uint256 indexed index, address indexed to, uint256 amount);
    event DisputeRaised(bytes32 indexed key, uint256 indexed index, address indexed by);
    event DisputeResolved(bytes32 indexed key, uint256 indexed index, uint8 freelancerPct, uint256 freelancerAmount, uint256 clientAmount);
    event ArbiterChanged(address indexed previousArbiter, address indexed newArbiter);

    error AlreadyFunded();
    error InvalidAgreement();
    error InvalidAmount();
    error NotClient();
    error NotFreelancer();
    error NotParty();
    error NotArbiter();
    error InvalidStatus(MilestoneStatus status);
    error TransferFailed();

    constructor(address initialArbiter) Ownable(msg.sender) {
        if (initialArbiter == address(0)) revert InvalidAgreement();
        arbiter = initialArbiter;
        emit ArbiterChanged(address(0), initialArbiter);
    }

    // ------------------------------------------------------------------ views

    function keyFor(address client, bytes32 ref) public pure returns (bytes32) {
        return keccak256(abi.encode(client, ref));
    }

    function getAgreement(bytes32 key) external view returns (Agreement memory) {
        return _agreements[key];
    }

    function getMilestone(bytes32 key, uint256 index) external view returns (Milestone memory) {
        return _milestones[key][index];
    }

    // ------------------------------------------------------------------ actions

    /// @notice Deposit every milestone of an agreement. `msg.value` must equal the sum of `amounts`.
    function fund(bytes32 ref, address freelancer, uint256[] calldata amounts) external payable nonReentrant returns (bytes32 key) {
        if (freelancer == address(0) || freelancer == msg.sender) revert InvalidAgreement();
        uint256 count = amounts.length;
        if (count == 0 || count > MAX_MILESTONES) revert InvalidAgreement();

        key = keyFor(msg.sender, ref);
        if (_agreements[key].client != address(0)) revert AlreadyFunded();

        uint256 total;
        for (uint256 i = 0; i < count; i++) {
            if (amounts[i] == 0) revert InvalidAmount();
            total += amounts[i];
            _milestones[key][i] = Milestone({ amount: amounts[i], status: MilestoneStatus.Funded });
        }
        if (msg.value != total) revert InvalidAmount();

        _agreements[key] = Agreement({
            client: msg.sender,
            freelancer: freelancer,
            fundedAt: uint64(block.timestamp),
            milestoneCount: uint32(count)
        });
        emit Funded(key, ref, msg.sender, freelancer, total, amounts);
    }

    /// @notice Client pays a funded milestone to the freelancer.
    function release(bytes32 key, uint256 index) external nonReentrant {
        Agreement memory a = _agreement(key);
        if (msg.sender != a.client) revert NotClient();
        Milestone storage m = _funded(key, index);
        m.status = MilestoneStatus.Released;
        emit Released(key, index, a.freelancer, m.amount);
        _send(a.freelancer, m.amount);
    }

    /// @notice Freelancer returns a funded milestone to the client.
    function refund(bytes32 key, uint256 index) external nonReentrant {
        Agreement memory a = _agreement(key);
        if (msg.sender != a.freelancer) revert NotFreelancer();
        Milestone storage m = _funded(key, index);
        m.status = MilestoneStatus.Refunded;
        emit Refunded(key, index, a.client, m.amount);
        _send(a.client, m.amount);
    }

    /// @notice Either party freezes a funded milestone so only the arbiter can settle it.
    function raiseDispute(bytes32 key, uint256 index) external {
        Agreement memory a = _agreement(key);
        if (msg.sender != a.client && msg.sender != a.freelancer) revert NotParty();
        Milestone storage m = _funded(key, index);
        m.status = MilestoneStatus.Disputed;
        emit DisputeRaised(key, index, msg.sender);
    }

    /// @notice Arbiter settles a disputed milestone: `freelancerPct` percent to the freelancer, the rest to the client.
    function resolveDispute(bytes32 key, uint256 index, uint8 freelancerPct) external nonReentrant {
        if (msg.sender != arbiter) revert NotArbiter();
        if (freelancerPct > 100) revert InvalidAmount();
        Agreement memory a = _agreement(key);
        if (index >= a.milestoneCount) revert InvalidAgreement();
        Milestone storage m = _milestones[key][index];
        if (m.status != MilestoneStatus.Disputed) revert InvalidStatus(m.status);

        m.status = MilestoneStatus.Resolved;
        uint256 toFreelancer = (m.amount * freelancerPct) / 100;
        uint256 toClient = m.amount - toFreelancer;
        emit DisputeResolved(key, index, freelancerPct, toFreelancer, toClient);
        if (toFreelancer > 0) _send(a.freelancer, toFreelancer);
        if (toClient > 0) _send(a.client, toClient);
    }

    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert InvalidAgreement();
        emit ArbiterChanged(arbiter, newArbiter);
        arbiter = newArbiter;
    }

    /// @dev Ownership can never be renounced: the arbiter must always be rotatable.
    function renounceOwnership() public pure override {
        revert InvalidAgreement();
    }

    // ------------------------------------------------------------------ internals

    function _agreement(bytes32 key) private view returns (Agreement memory a) {
        a = _agreements[key];
        if (a.client == address(0)) revert InvalidAgreement();
    }

    function _funded(bytes32 key, uint256 index) private view returns (Milestone storage m) {
        if (index >= _agreements[key].milestoneCount) revert InvalidAgreement();
        m = _milestones[key][index];
        if (m.status != MilestoneStatus.Funded) revert InvalidStatus(m.status);
    }

    function _send(address to, uint256 amount) private {
        (bool ok, ) = payable(to).call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }

    receive() external payable {
        revert InvalidAgreement();
    }
}
