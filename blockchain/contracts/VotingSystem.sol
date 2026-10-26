// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AccessControl.sol";

contract VotingSystem is AccessControl {
    struct Voter {
        bool isRegistered;
        uint256 registeredAt;
        string registrationHash; // Encrypted or hashed identifier mapping (PII hidden)
    }

    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string title;
        uint256 startTime;
        uint256 endTime;
        bool exists;
    }

    uint256 public electionCount;
    mapping(address => Voter) public registeredVoters;
    
    // electionId => Election details
    mapping(uint256 => Election) public elections;
    
    // electionId => candidateId => Candidate
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    // electionId => number of candidates
    mapping(uint256 => uint256) public electionCandidateCount;

    // electionId => voterAddress => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Total votes cast globally (for dashboard metrics)
    uint256 public totalVotesCast;

    event VoterRegistered(address indexed voterAddress, string registrationHash);
    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name, string party);
    event VoteCast(uint256 indexed electionId, address indexed voterAddress, uint256 indexed candidateId, uint256 blockNumber);

    modifier electionExists(uint256 _electionId) {
        require(elections[_electionId].exists, "VotingSystem: Election does not exist");
        _;
    }

    modifier electionActive(uint256 _electionId) {
        require(block.timestamp >= elections[_electionId].startTime, "VotingSystem: Election has not started yet");
        require(block.timestamp <= elections[_electionId].endTime, "VotingSystem: Election has ended");
        _;
    }

    // Register a voter's wallet address (Operator/Admin only)
    // The registration hash separates biometric identity from wallet on-chain:
    // PII itself remains in the secure off-chain SQL database.
    function registerVoter(address _voterAddress, string memory _registrationHash) public onlyOperator whenNotPaused {
        require(_voterAddress != address(0), "VotingSystem: Invalid voter address");
        require(!registeredVoters[_voterAddress].isRegistered, "VotingSystem: Voter is already registered");

        registeredVoters[_voterAddress] = Voter({
            isRegistered: true,
            registeredAt: block.timestamp,
            registrationHash: _registrationHash
        });

        emit VoterRegistered(_voterAddress, _registrationHash);
    }

    // Create a new election (Admin only)
    function createElection(
        string memory _title,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyAdmin whenNotPaused {
        require(_startTime < _endTime, "VotingSystem: Start time must be before end time");
        require(_endTime > block.timestamp, "VotingSystem: End time must be in the future");

        electionCount++;
        elections[electionCount] = Election({
            id: electionCount,
            title: _title,
            startTime: _startTime,
            endTime: _endTime,
            exists: true
        });

        emit ElectionCreated(electionCount, _title, _startTime, _endTime);
    }

    // Add candidate to an election (Admin only)
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _party
    ) public onlyAdmin electionExists(_electionId) whenNotPaused {
        // Can only add candidates before election starts (commented out for PoC testing flexibility)
        // require(block.timestamp < elections[_electionId].startTime, "VotingSystem: Cannot add candidates after election starts");

        uint256 candidateId = electionCandidateCount[_electionId] + 1;
        candidates[_electionId][candidateId] = Candidate({
            id: candidateId,
            name: _name,
            party: _party,
            voteCount: 0
        });
        electionCandidateCount[_electionId] = candidateId;

        emit CandidateAdded(_electionId, candidateId, _name, _party);
    }

    // Cast a vote (Public/Voter only)
    function castVote(
        uint256 _electionId,
        uint256 _candidateId
    ) public electionExists(_electionId) electionActive(_electionId) whenNotPaused {
        require(registeredVoters[msg.sender].isRegistered, "VotingSystem: Voter address is not registered/eligible");
        require(!hasVoted[_electionId][msg.sender], "VotingSystem: Voter has already voted in this election");
        require(_candidateId > 0 && _candidateId <= electionCandidateCount[_electionId], "VotingSystem: Invalid candidate selection");

        // Mark as voted BEFORE modifying state further to prevent re-entrancy attacks
        hasVoted[_electionId][msg.sender] = true;
        candidates[_electionId][_candidateId].voteCount++;
        totalVotesCast++;

        emit VoteCast(_electionId, msg.sender, _candidateId, block.number);
    }

    // View candidate details & current count
    function getCandidate(uint256 _electionId, uint256 _candidateId) public view electionExists(_electionId) returns (uint256 id, string memory name, string memory party, uint256 voteCount) {
        require(_candidateId > 0 && _candidateId <= electionCandidateCount[_electionId], "VotingSystem: Invalid candidate ID");
        Candidate memory c = candidates[_electionId][_candidateId];
        return (c.id, c.name, c.party, c.voteCount);
    }

    // Check if voter has voted in a specific election
    function checkHasVoted(uint256 _electionId, address _voter) public view electionExists(_electionId) returns (bool) {
        return hasVoted[_electionId][_voter];
    }
}
