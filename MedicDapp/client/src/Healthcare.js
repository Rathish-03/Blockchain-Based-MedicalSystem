import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import HealthcareRecords from "./contracts/HealthcareRecords.json";

export const registerPatient = async (contract, account, patientID) => {
  const tx = await contract.registerPatient(patientID);
  await tx.wait();
};

export const grantConsent = async (contract, account, patientID, doctor) => {
  const tx = await contract.grantConsent(patientID, doctor);
  await tx.wait();
};

export const revokeConsent = async (contract, account, patientID, doctor) => {
  const tx = await contract.revokeConsent(patientID, doctor);
  await tx.wait();
};


const Healthcare = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(null);
  const [ipfs, setIpfs] = useState(null);

  // form states
  const [patientID, setPatientID] = useState("");
  const [patientName, setPatientName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorAddress, setDoctorAddress] = useState("");
  const [patientRecords, setPatientRecords] = useState([]);
  const [providerAddress, setProviderAddress] = useState("");

  // file upload states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadPatientID, setUploadPatientID] = useState("");
  const [uploadRecordID, setUploadRecordID] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const connectWallet = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        setProvider(provider);
        setSigner(signer);

        const accountAddress = await signer.getAddress();
        setAccount(accountAddress);

        const network = await provider.getNetwork();
        const networkId = network.chainId.toString();

        const deployedNetwork = HealthcareRecords.networks[networkId];
        if (!deployedNetwork) {
          alert(`Smart contract not deployed on chain ID ${networkId}`);
          return;
        }

        const contract = new ethers.Contract(
          deployedNetwork.address,
          HealthcareRecords.abi,
          signer
        );
        setContract(contract);

        // Initialize Pinata JWT token
        // Get your JWT token from https://pinata.cloud/ (Dashboard → API Keys)
        const pinataJwt = process.env.REACT_APP_PINATA_JWT;

        if (pinataJwt) {
          setIpfs({ jwt: pinataJwt });
        } else {
          console.warn("Pinata JWT token not found. Please add it to .env file.");
        }

        const ownerAddress = await contract.getOwner();
        setIsOwner(accountAddress.toLowerCase() === ownerAddress.toLowerCase());
      } catch (error) {
        console.error("Error connecting to wallet: ", error);
      }
    };

    connectWallet();
  }, []);

  const fetchPatientRecords = async () => {
    try {
      setPatientRecords([]);
      if (!patientID) {
        alert("Enter a patient ID first");
        return;
      }
      const records = await contract.getPatientRecords(patientID);
      setPatientRecords(records);
    } catch (error) {
      console.error("Error fetching patient records", error);
    }
  };  

  const addRecord = async () => {
    try {
      if (!patientID || !patientName || !gender || !age || !bloodGroup || !diagnosis || !treatment || !doctorName) {
        alert("Please fill all fields");
        return;
      }
      const tx = await contract.addRecord(
        patientID,
        patientName,
        gender,
        age,
        bloodGroup,
        diagnosis,
        treatment,
        doctorName
      );
      await tx.wait();
      alert("Patient record added successfully");

      // reset
      setPatientID("");
      setPatientName("");
      setGender("");
      setAge("");
      setBloodGroup("");
      setDiagnosis("");
      setTreatment("");
      setDoctorName("");
      setPatientRecords([]);
    } catch (error) {
      console.error("Error adding records", error);
    }
  };

  const authorizeMyAccount = async () => {
    try {
      if (!contract) {
        alert("Contract not loaded yet");
        return;
      }

      // Try to authorize - the contract will reject if not owner
      const tx = await contract.authorizeDoctor(account);
      await tx.wait();
      alert(`Your account (${account}) has been authorized as doctor`);
    } catch (error) {
      console.error("Error authorizing account:", error);
      alert("Failed to authorize your account. Make sure you are contract owner.");
    }
  };

  const authorizeProvider = async () => {
    try {
      if (!providerAddress) {
        alert("Enter a doctor address");
        return;
      }

      // Try to authorize - the contract will reject if not owner
      const tx = await contract.authorizeDoctor(providerAddress);
      await tx.wait();
      alert(`Doctor ${providerAddress} authorized successfully`);
      setProviderAddress("");
    } catch (error) {
      console.error("Error authorizing doctor:", error);
      alert("Failed to authorize doctor. Make sure you're the contract owner.");
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const uploadFiles = async () => {
    if (!uploadPatientID || !uploadRecordID || selectedFiles.length === 0) {
      alert("Please fill all fields and select files");
      return;
    }

    if (!ipfs || !ipfs.jwt) {
      alert("Pinata JWT token not configured. Please check your .env file.");
      return;
    }

    setUploading(true);
    try {
      const fileHashes = [];
      const fileNames = [];
      const fileTypes = [];

      // Upload files to Pinata (IPFS pinning service)
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Create FormData for Pinata upload
        const formData = new FormData();
        formData.append("file", file);

        // Upload to Pinata
        const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ipfs.jwt}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinata upload failed (${response.status}): ${response.statusText || errorText}`);
        }

        const data = await response.json();
        const cid = data.IpfsHash;

        fileHashes.push(cid);
        fileNames.push(file.name);
        fileTypes.push(file.type || 'unknown');
      }

      // Store file hashes on blockchain
      const tx = await contract.addFilesToRecord(
        uploadPatientID,
        uploadRecordID,
        fileHashes,
        fileNames,
        fileTypes
      );
      await tx.wait();

      alert("Files uploaded successfully to IPFS!");
      setSelectedFiles([]);
      setUploadPatientID("");
      setUploadRecordID("");

      // Refresh records if we're viewing the same patient
      if (patientID === uploadPatientID) {
        fetchPatientRecords();
      }

    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`Failed to upload files to IPFS: ${error.message}. Please check your Pinata API keys.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Healthcare Records DApp</h1>
      {account && <p className="account-info">Connected Account: {account}</p>}
      {isOwner && <p className="owner-info">You are the contract owner</p>}

      <div className="form-section">
        <h2>Fetch Patient Records</h2>
        <input
          type="text"
          placeholder="Enter Patient ID"
          value={patientID}
          onChange={(e) => setPatientID(e.target.value)}
        />
        <button className="green-btn" onClick={fetchPatientRecords}>Fetch Records</button>
      </div>

      <div className="form-section">
        <h2>Add Patient Record</h2>
        <input type="number" placeholder="Patient ID" value={patientID} onChange={(e) => setPatientID(e.target.value)} />
        <input type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
        <input type="text" placeholder="Gender" value={gender} onChange={(e) => setGender(e.target.value)} />
        <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} />
        <input type="text" placeholder="Blood Group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} />
        <input type="text" placeholder="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        <input type="text" placeholder="Treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} />
        <input type="text" placeholder="Doctor Name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
        <button className="green-btn" onClick={addRecord}>Add Record</button>
      </div>

      <div className="form-section">
        <h2>Authorize Doctor</h2>
        <input
          type="text"
          placeholder="Doctor Address"
          value={providerAddress}
          onChange={(e) => setProviderAddress(e.target.value)}
        />
        <button className="green-btn" onClick={authorizeProvider}>Authorize Doctor</button>
      </div>

      <div className="form-section">
        <h2>Authorize Yourself</h2>
        <button className="green-btn" onClick={authorizeMyAccount}>Authorize My Account</button>
      </div>
    
      <div className="form-section">
        <h3>Register Patient</h3>

        <input
          type="number"
          placeholder="Patient ID"
          value={patientID}
          onChange={(e) => setPatientID(e.target.value)}
        />

        <button
          className="green-btn"
          onClick={() =>
            registerPatient(contract, account, patientID)
          }
        >
          Register Patient
        </button>
      </div>

      <div className="form-section">
        <h3>Grant Consent</h3>

        <input
          type="number"
          placeholder="Patient ID"
          onChange={(e) => setPatientID(e.target.value)}
        />

        <input
          type="text"
          placeholder="Doctor Address"
          onChange={(e) => setDoctorAddress(e.target.value)}
        />

        <button
          className="green-btn"
          onClick={() =>
            grantConsent(contract, account, patientID, doctorAddress)
          }
        >
          Grant Consent
        </button>

        <button
          className="green-btn"
          onClick={() =>
            revokeConsent(contract, account, patientID, doctorAddress)
          }
        >
          Revoke Consent
        </button>
      </div>

      <div className="form-section">
        <h3>Upload Files to Record</h3>
        <input
          type="number"
          placeholder="Patient ID"
          value={uploadPatientID}
          onChange={(e) => setUploadPatientID(e.target.value)}
        />
        <input
          type="number"
          placeholder="Record ID"
          value={uploadRecordID}
          onChange={(e) => setUploadRecordID(e.target.value)}
        />
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
        />
        {selectedFiles.length > 0 && (
          <div>
            <p>Selected files: {selectedFiles.map(f => f.name).join(', ')}</p>
          </div>
        )}
        <button
          className="green-btn"
          onClick={uploadFiles}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </div>

      <div className="records-section">
        <h2>Patient Records</h2>
        {patientRecords.length === 0 && <p>No records found</p>}
        {patientRecords.map((record, index) => (
          <div key={index} className="record-card">
            <p><strong>Record ID:</strong> {Number(record.recordID)}</p>
            <p><strong>Patient Name:</strong> {record.patientName}</p>
            <p><strong>Gender:</strong> {record.gender}</p>
            <p><strong>Age:</strong> {Number(record.age)}</p>
            <p><strong>Blood Group:</strong> {record.bloodGroup}</p>
            <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
            <p><strong>Treatment:</strong> {record.treatment}</p>
            <p><strong>Doctor:</strong> {record.doctorName}</p>
            <p><strong>Timestamp:</strong> {new Date(Number(record.timestamp) * 1000).toLocaleString()}</p>

            {record.fileHashes && record.fileHashes.length > 0 && (
              <div className="files-section">
                <h4>Attached Files:</h4>
                {record.fileHashes.map((hash, fileIndex) => (
                  <div key={fileIndex} className="file-item">
                    <span>{record.fileNames[fileIndex]} ({record.fileTypes[fileIndex]})</span>
                    <a
                      href={`https://ipfs.io/ipfs/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-link"
                    >
                      View/Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .container {
          max-width: 900px;
          margin: auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .title {
          text-align: center;
          margin-bottom: 20px;
        }
        .account-info, .owner-info {
          text-align: center;
          font-weight: bold;
        }
        .form-section, .records-section {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          background: #f9f9f9;
        }
        .form-section h2, .records-section h2 {
          margin-bottom: 10px;
        }
        input {
          margin: 5px;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
        .green-btn {
          background-color: green;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          margin: 5px;
        }
        .green-btn:hover {
          background-color: darkgreen;
        }
        .record-card {
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 10px;
          background: white;
        }
        .files-section {
          margin-top: 10px;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .files-section h4 {
          margin: 0 0 8px 0;
          color: #333;
        }
        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid #eee;
        }
        .file-item:last-child {
          border-bottom: none;
        }
        .file-link {
          color: #007bff;
          text-decoration: none;
          font-size: 14px;
        }
        .file-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default Healthcare;
