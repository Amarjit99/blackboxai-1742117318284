// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LandRegistry {
    // Structs
    struct Land {
        uint256 id;
        address owner;
        string ownerName;
        uint256 area;
        string location;
        uint256 value;
        string description;
        bool isVerified;
    }

    struct Transfer {
        address from;
        address to;
        uint256 value;
        uint256 timestamp;
    }

    // State variables
    address public admin;
    uint256 private landCounter;
    mapping(uint256 => Land) public lands;
    mapping(uint256 => Transfer[]) public transferHistory;
    mapping(address => bool) public verifiers;
    mapping(address => uint256[]) private ownerLands;

    // Events
    event LandRegistered(uint256 indexed id, address indexed owner, string location, uint256 value, uint256 timestamp);
    event LandVerified(uint256 indexed id, address indexed verifier);
    event LandTransferred(uint256 indexed id, address indexed from, address indexed to, uint256 value);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    // Constructor
    constructor() {
        admin = msg.sender;
    }

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Only verifier can perform this action");
        _;
    }

    modifier landExists(uint256 _landId) {
        require(_landId > 0 && _landId <= landCounter, "Land does not exist");
        _;
    }

    modifier onlyLandOwner(uint256 _landId) {
        require(lands[_landId].owner == msg.sender, "Only land owner can perform this action");
        _;
    }

    // Admin functions
    function addVerifier(address _verifier) external onlyAdmin {
        require(!verifiers[_verifier], "Verifier already exists");
        verifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }

    function removeVerifier(address _verifier) external onlyAdmin {
        require(verifiers[_verifier], "Verifier does not exist");
        verifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }

    // Main functions
    function registerLand(
        string memory _ownerName,
        uint256 _area,
        string memory _location,
        uint256 _value,
        string memory _description
    ) external returns (uint256) {
        landCounter++;
        
        Land storage newLand = lands[landCounter];
        newLand.id = landCounter;
        newLand.owner = msg.sender;
        newLand.ownerName = _ownerName;
        newLand.area = _area;
        newLand.location = _location;
        newLand.value = _value;
        newLand.description = _description;
        newLand.isVerified = false;

        ownerLands[msg.sender].push(landCounter);

        emit LandRegistered(landCounter, msg.sender, _location, _value, block.timestamp);
        return landCounter;
    }

    function verifyLand(uint256 _landId) external onlyVerifier landExists(_landId) {
        require(!lands[_landId].isVerified, "Land is already verified");
        lands[_landId].isVerified = true;
        emit LandVerified(_landId, msg.sender);
    }

    function transferLand(
        uint256 _landId,
        address _newOwner,
        uint256 _newValue
    ) external landExists(_landId) onlyLandOwner(_landId) {
        require(lands[_landId].isVerified, "Land is not verified");
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != msg.sender, "Cannot transfer to self");

        Land storage land = lands[_landId];
        address previousOwner = land.owner;
        
        // Update land details
        land.owner = _newOwner;
        land.value = _newValue;

        // Update owner lands mapping
        removeFromOwnerLands(previousOwner, _landId);
        ownerLands[_newOwner].push(_landId);

        // Record transfer history
        Transfer memory newTransfer = Transfer({
            from: previousOwner,
            to: _newOwner,
            value: _newValue,
            timestamp: block.timestamp
        });
        transferHistory[_landId].push(newTransfer);

        emit LandTransferred(_landId, previousOwner, _newOwner, _newValue);
    }

    // View functions
    function getLandDetails(uint256 _landId) external view landExists(_landId) returns (Land memory) {
        return lands[_landId];
    }

    function getOwnerLands(address _owner) external view returns (uint256[] memory) {
        return ownerLands[_owner];
    }

    function getLandTransferHistory(uint256 _landId) external view landExists(_landId) returns (Transfer[] memory) {
        return transferHistory[_landId];
    }

    // Helper functions
    function removeFromOwnerLands(address _owner, uint256 _landId) private {
        uint256[] storage userLands = ownerLands[_owner];
        for (uint256 i = 0; i < userLands.length; i++) {
            if (userLands[i] == _landId) {
                // Move the last element to the position being deleted
                userLands[i] = userLands[userLands.length - 1];
                // Remove the last element
                userLands.pop();
                break;
            }
        }
    }
}
