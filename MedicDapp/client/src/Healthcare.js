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
      `}</style>
    </div>
  );
};

export default Healthcare;
