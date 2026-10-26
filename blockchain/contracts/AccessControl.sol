// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AccessControl {
    enum Role { Public, Operator, Administrator, Emergency }

    mapping(address => Role) public userRoles;
    address[] public emergencyCommittee;
    
    // Multi-sig state for emergency operations (e.g., 3-of-5 approvals)
    mapping(address => bool) public isCommitteeMember;
    mapping(address => bool) public pauseApprovals;
    mapping(address => bool) public resumeApprovals;
    uint256 public pauseApprovalCount;
    uint256 public resumeApprovalCount;
    bool public isPaused;

    event RoleAssigned(address indexed user, Role role);
    event EmergencyPauseRequested(address indexed member, uint256 approvals);
    event EmergencyResumeRequested(address indexed member, uint256 approvals);
    event SystemPaused();
    event SystemResumed();

    modifier onlyAdmin() {
        require(userRoles[msg.sender] == Role.Administrator, "AccessControl: Only Administrator permitted");
        _;
    }

    modifier onlyOperator() {
        require(
            userRoles[msg.sender] == Role.Operator || 
            userRoles[msg.sender] == Role.Administrator, 
            "AccessControl: Only Operator or Administrator permitted"
        );
        _;
    }

    modifier onlyEmergency() {
        require(isCommitteeMember[msg.sender], "AccessControl: Only Emergency Committee member permitted");
        _;
    }

    modifier whenNotPaused() {
        require(!isPaused, "AccessControl: System is currently paused due to an emergency");
        _;
    }

    modifier whenPaused() {
        require(isPaused, "AccessControl: System is not paused");
        _;
    }

    constructor() {
        // Deployer is the initial Administrator
        userRoles[msg.sender] = Role.Administrator;
        emit RoleAssigned(msg.sender, Role.Administrator);
    }

    // Assign roles (Administrator only)
    function setRole(address _user, Role _role) public onlyAdmin {
        userRoles[_user] = _role;
        emit RoleAssigned(_user, _role);

        if (_role == Role.Emergency) {
            if (!isCommitteeMember[_user]) {
                isCommitteeMember[_user] = true;
                emergencyCommittee.push(_user);
            }
        } else {
            if (isCommitteeMember[_user]) {
                isCommitteeMember[_user] = false;
                // Remove from committee list (optional cleanup)
            }
        }
    }

    // Configure the list of emergency committee members (Administrator only)
    function setEmergencyCommittee(address[] memory _members) public onlyAdmin {
        require(_members.length >= 3 && _members.length <= 5, "AccessControl: Committee must be 3-5 members");
        
        // Reset previous committee
        for (uint256 i = 0; i < emergencyCommittee.length; i++) {
            isCommitteeMember[emergencyCommittee[i]] = false;
        }
        delete emergencyCommittee;

        // Set new committee
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "AccessControl: Invalid address");
            isCommitteeMember[_members[i]] = true;
            emergencyCommittee.push(_members[i]);
            userRoles[_members[i]] = Role.Emergency;
            emit RoleAssigned(_members[i], Role.Emergency);
        }
        
        // Reset approvals
        _resetPauseApprovals();
        _resetResumeApprovals();
    }

    // Emergency Pause (Requires 3 approvals from committee members)
    function requestEmergencyPause() public onlyEmergency whenNotPaused {
        require(!pauseApprovals[msg.sender], "AccessControl: Already approved pause");
        pauseApprovals[msg.sender] = true;
        pauseApprovalCount++;

        emit EmergencyPauseRequested(msg.sender, pauseApprovalCount);

        if (pauseApprovalCount >= 3 || (emergencyCommittee.length < 3 && pauseApprovalCount == emergencyCommittee.length)) {
            isPaused = true;
            emit SystemPaused();
            _resetPauseApprovals(); // Clear for next cycle
        }
    }

    // Emergency Resume (Requires 3 approvals from committee members)
    function requestEmergencyResume() public onlyEmergency whenPaused {
        require(!resumeApprovals[msg.sender], "AccessControl: Already approved resume");
        resumeApprovals[msg.sender] = true;
        resumeApprovalCount++;

        emit EmergencyResumeRequested(msg.sender, resumeApprovalCount);

        if (resumeApprovalCount >= 3 || (emergencyCommittee.length < 3 && resumeApprovalCount == emergencyCommittee.length)) {
            isPaused = false;
            emit SystemResumed();
            _resetResumeApprovals(); // Clear for next cycle
        }
    }

    function _resetPauseApprovals() internal {
        for (uint256 i = 0; i < emergencyCommittee.length; i++) {
            pauseApprovals[emergencyCommittee[i]] = false;
        }
        pauseApprovalCount = 0;
    }

    function _resetResumeApprovals() internal {
        for (uint256 i = 0; i < emergencyCommittee.length; i++) {
            resumeApprovals[emergencyCommittee[i]] = false;
        }
        resumeApprovalCount = 0;
    }

    // Helpers to read emergency committee status
    function getEmergencyCommittee() public view returns (address[] memory) {
        return emergencyCommittee;
    }
}
