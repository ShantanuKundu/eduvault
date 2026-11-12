// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./EduRegistry.sol";

contract TranscriptEscrow {
    IERC20 public eduToken;
    EduRegistry public registry;
    address public universityTreasury;

    uint256 public constant TRANSCRIPT_FEE = 50 * 10 ** 18; // 50 EDU per request
    uint256 public requestCounter;

    enum Status { Pending, Fulfilled, Refunded }

    struct TranscriptRequest {
        uint256 id;
        address employer;
        address student;
        uint256 amount;
        uint256 deadline;
        string transcriptHash;
        Status status;
    }

    mapping(uint256 => TranscriptRequest) public requests;

    event TranscriptRequested(uint256 indexed requestId, address indexed employer, address indexed student, uint256 deadline);
    event TranscriptFulfilled(uint256 indexed requestId, string transcriptHash);
    event EscrowRefunded(uint256 indexed requestId, address indexed employer, uint256 amount);

    constructor(address eduTokenAddress, address registryAddress, address treasuryAddress) {
        eduToken = IERC20(eduTokenAddress);
        registry = EduRegistry(registryAddress);
        universityTreasury = treasuryAddress;
    }

    // 1. Employer locks 50 $EDU into escrow with a timelock duration (in seconds)
    function requestTranscript(address student, uint256 durationInSeconds) external returns (uint256) {
        require(student != address(0), "Invalid student address");
        require(durationInSeconds > 0, "Duration must be greater than 0");

        require(
            eduToken.transferFrom(msg.sender, address(this), TRANSCRIPT_FEE),
            "EDU token transfer failed (check balance/approval)"
        );

        uint256 requestId = ++requestCounter;
        uint256 deadline = block.timestamp + durationInSeconds;

        requests[requestId] = TranscriptRequest({
            id: requestId,
            employer: msg.sender,
            student: student,
            amount: TRANSCRIPT_FEE,
            deadline: deadline,
            transcriptHash: "",
            status: Status.Pending
        });

        emit TranscriptRequested(requestId, msg.sender, student, deadline);
        return requestId;
    }

    // 2. Registrar fulfills request before deadline -> releases $EDU to university treasury
    function fulfillRequest(uint256 requestId, string calldata transcriptHash) external {
        require(
            registry.hasRole(registry.REGISTRAR_ROLE(), msg.sender),
            "Only Registrar can fulfill requests"
        );

        TranscriptRequest storage req = requests[requestId];
        require(req.id != 0, "Request does not exist");
        require(req.status == Status.Pending, "Request already closed");
        require(block.timestamp <= req.deadline, "Timelock expired; cannot fulfill");

        req.status = Status.Fulfilled;
        req.transcriptHash = transcriptHash;

        require(eduToken.transfer(universityTreasury, req.amount), "Treasury payout failed");
        emit TranscriptFulfilled(requestId, transcriptHash);
    }

    // 3. Employer reclaims 100% of $EDU if timelock expires without fulfillment
    function claimRefund(uint256 requestId) external {
        TranscriptRequest storage req = requests[requestId];
        require(req.id != 0, "Request does not exist");
        require(msg.sender == req.employer, "Only requesting employer can refund");
        require(req.status == Status.Pending, "Request already closed");
        require(block.timestamp > req.deadline, "Timelock has not expired yet");

        req.status = Status.Refunded;
        require(eduToken.transfer(req.employer, req.amount), "Refund transfer failed");
        emit EscrowRefunded(requestId, req.employer, req.amount);
    }
}