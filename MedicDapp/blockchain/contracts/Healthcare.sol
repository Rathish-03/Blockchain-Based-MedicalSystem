// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthcareRecords {

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    struct Record {
        uint256 recordID;
        string patientName;
        string gender;
        uint256 age;
        string bloodGroup;
        string diagnosis;
        string treatment;
        string doctorName;
        uint256 timestamp;
    }

    mapping(uint256 => Record[]) private records;

    // Roles
    mapping(address => bool) public doctors;

    // Patient ownership & consent
    mapping(uint256 => address) public patientOwner;
    mapping(uint256 => mapping(address => bool)) public consent;

    // Events
    event DoctorAuthorized(address doctor);
    event PatientRegistered(uint256 patientID, address patient);
    event ConsentGranted(uint256 patientID, address doctor);
    event ConsentRevoked(uint256 patientID, address doctor);
    event RecordAccessed(uint256 patientID, address accessor, uint256 time);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyDoctor() {
        require(doctors[msg.sender], "Not a doctor");
        _;
    }

    // Owner authorizes doctors
    function authorizeDoctor(address doctor) external onlyOwner {
        doctors[doctor] = true;
        emit DoctorAuthorized(doctor);
    }

    // Patient registers ownership
    function registerPatient(uint256 patientID) external {
        require(patientOwner[patientID] == address(0), "Already registered");
        patientOwner[patientID] = msg.sender;
        emit PatientRegistered(patientID, msg.sender);
    }

    // Patient grants consent
    function grantConsent(uint256 patientID, address doctor) external {
        require(msg.sender == patientOwner[patientID], "Not patient");
        consent[patientID][doctor] = true;
        emit ConsentGranted(patientID, doctor);
    }

    // Patient revokes consent
    function revokeConsent(uint256 patientID, address doctor) external {
        require(msg.sender == patientOwner[patientID], "Not patient");
        consent[patientID][doctor] = false;
        emit ConsentRevoked(patientID, doctor);
    }

    // Doctor adds record ONLY with consent
    function addRecord(
        uint256 patientID,
        string memory patientName,
        string memory gender,
        uint256 age,
        string memory bloodGroup,
        string memory diagnosis,
        string memory treatment,
        string memory doctorName
    ) external onlyDoctor {

        require(consent[patientID][msg.sender], "No patient consent");

        records[patientID].push(
            Record(
                records[patientID].length,
                patientName,
                gender,
                age,
                bloodGroup,
                diagnosis,
                treatment,
                doctorName,
                block.timestamp
            )
        );
    }

    // Secure record access
    function getPatientRecords(uint256 patientID)
        external
        view
        returns (Record[] memory)
    {
        require(
            msg.sender == patientOwner[patientID] ||
            consent[patientID][msg.sender],
            "Access denied"
        );

        return records[patientID];
    }
}
