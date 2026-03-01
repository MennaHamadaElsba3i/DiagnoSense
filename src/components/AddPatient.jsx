import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addPatientAPI } from "./mockAPI";
import ProcessingReports from "../components/ProcessingReports";
import logo from "../assets/Logo_Diagnoo.png";
import "../css/AddPatient.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";

const AddPatient = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showProcessingScreen, setShowProcessingScreen] = useState(false);
  const [selectedGender, setSelectedGender] = useState(null);
  const [isSmoker, setIsSmoker] = useState(null);
  const [hasSurgeries, setHasSurgeries] = useState(null);
  const [selectedChronicDiseases, setSelectedChronicDiseases] = useState([]);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [fileManager, setFileManager] = useState({
    lab: [],
    history: [],
    radiology: [],
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    age: "",
    phone: "",
    nationalId: "",
    surgeryText: "",
    medications: "",
    allergies: "",
    familyHistory: "",
    ChiefComplaint: "",
  });

  const isStep1Valid =
    formData.fullName.trim() &&
    formData.email.trim() &&
    formData.age &&
    selectedGender &&
    formData.phone.trim() &&
    formData.nationalId.trim() &&
    Object.keys(fieldErrors).length === 0;

  const isStep2Valid = true;

  const hasAtLeastOneFile =
    fileManager.lab.length > 0 ||
    fileManager.history.length > 0 ||
    fileManager.radiology.length > 0;

  useEffect(() => {
    const categories = ["lab", "history", "radiology"];
    categories.forEach((category) => {
      const dropzone = document.querySelector(`[data-category="${category}"]`);
      if (dropzone) {
        const handleDragOver = (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "#2A66FF";
          dropzone.style.background = "#E9F0FF";
        };
        const handleDragLeave = () => {
          dropzone.style.borderColor = "#C5CBD6";
          dropzone.style.background = "#FFFFFF";
        };
        const handleDrop = (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "#C5CBD6";
          dropzone.style.background = "#FFFFFF";
          handleFiles(category, e.dataTransfer.files);
        };
        dropzone.addEventListener("dragover", handleDragOver);
        dropzone.addEventListener("dragleave", handleDragLeave);
        dropzone.addEventListener("drop", handleDrop);
        return () => {
          dropzone.removeEventListener("dragover", handleDragOver);
          dropzone.removeEventListener("dragleave", handleDragLeave);
          dropzone.removeEventListener("drop", handleDrop);
        };
      }
    });
  }, []);

  const extractFieldErrors = (result) => {
    const backendFieldMap = {
      email: "email",
      phone: "phone",
      national_id: "nationalId",
      name: "fullName",
      age: "age",
    };

    const newFieldErrors = {};

    if (result.errors) {
      Object.entries(result.errors).forEach(([backendKey, messages]) => {
        const frontendKey = backendFieldMap[backendKey] || backendKey;
        newFieldErrors[frontendKey] = Array.isArray(messages) ? messages[0] : messages;
      });
    }

    const message = result.message || "";
    if (
      message.includes("users_phone_unique") ||
      (message.includes("Duplicate entry") && message.includes("phone"))
    ) {
      newFieldErrors.phone = "Phone number already exists.";
    }
    if (
      message.includes("users_email_unique") ||
      (message.includes("Duplicate entry") && message.includes("email"))
    ) {
      newFieldErrors.email = "Email already exists.";
    }
    if (message.includes("national_id") && message.includes("Duplicate entry")) {
      newFieldErrors.nationalId = "National ID already exists.";
    }

    return newFieldErrors;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    let newValue = value;
    let newErrors = { ...fieldErrors };

    if (id === "phone" || id === "nationalId" || id === "age") {
      newValue = value.replace(/\D/g, "");
    } else if (id === "fullName") {
      newValue = value.replace(/[0-9]/g, "");
    }

    if (newErrors[id]) {
      delete newErrors[id];
    }

    setFieldErrors(newErrors);
    setFormData((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleSmokerSelect = (value) => setIsSmoker(value === "yes");
  const handleSurgerySelect = (value) => setHasSurgeries(value === "yes");
  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  const handleChronicDiseaseToggle = (value) => {
    setSelectedChronicDiseases((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  const handleFiles = (category, files) => {
    const validFiles = Array.from(files).filter((file) => {
      const validTypes =
        category === "radiology"
          ? [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png", ".dcm"]
          : [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];
      const fileExt = "." + file.name.split(".").pop().toLowerCase();
      return validTypes.includes(fileExt) && file.size <= 10 * 1024 * 1024;
    });
    setFileManager((prev) => ({
      ...prev,
      [category]: [...prev[category], ...validFiles],
    }));
  };

  const handleFileInputChange = (category, e) => {
    handleFiles(category, e.target.files);
    e.target.value = "";
  };

  const removeFile = (category, index) => {
    setFileManager((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const goToStep = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep1Next = () => {
    setError("");
    goToStep(2);
  };

  const handleProcess = async () => {
    setIsProcessing(true); 
    setError("");

    try {
      const apiFormData = new FormData();

      apiFormData.append("name", formData.fullName);
      apiFormData.append("email", formData.email);
      apiFormData.append("phone", formData.phone);
      apiFormData.append("age", formData.age);
      apiFormData.append("gender", selectedGender);
      apiFormData.append("national_id", formData.nationalId);

      apiFormData.append("is_smoker", isSmoker ? "1" : "0");
      apiFormData.append("previous_surgeries", hasSurgeries ? "1" : "0");
      apiFormData.append("previous_surgeries_name", formData.surgeryText || "");

      if (selectedChronicDiseases.length > 0) {
        selectedChronicDiseases.forEach((disease) => {
          apiFormData.append("chronic_diseases[]", disease);
        });
      } else {
        apiFormData.append("chronic_diseases[]", "");
      }

      apiFormData.append("medications", formData.medications || "");
      apiFormData.append("allergies", formData.allergies || "");
      apiFormData.append("family_history", formData.familyHistory || "");
      apiFormData.append("current_complaint", formData.ChiefComplaint || "");

      fileManager.lab.forEach((file) => apiFormData.append("lab[]", file));
      fileManager.history.forEach((file) => apiFormData.append("medical_history[]", file));
      fileManager.radiology.forEach((file) => apiFormData.append("radiology[]", file));

      const result = await addPatientAPI(apiFormData);
      console.log("Add Patient Result:", result);

      if (result.success) {
        localStorage.setItem(
          "currentPatient",
          JSON.stringify({
            patient_id: result.patient_id,
            patientInfo: {
              fullName: formData.fullName,
              age: formData.age,
              gender: selectedGender,
              phone: formData.phone,
              nationalId: formData.nationalId,
            },
            medicalHistory: {
              isSmoker,
              hasSurgeries,
              surgeryText: formData.surgeryText,
              chronicDiseases: selectedChronicDiseases,
              medications: formData.medications,
              allergies: formData.allergies,
              familyHistory: formData.familyHistory,
            },
            files: {
              lab: fileManager.lab.length,
              history: fileManager.history.length,
              radiology: fileManager.radiology.length,
            },
            analysisData: result.data || {},
          })
        );

        setShowProcessingScreen(true); 
        navigate("/patient-profile", {
          state: {
            patientId: result.patient_id,
            message: result.message,
          },
        });

      } else {
        const newFieldErrors = extractFieldErrors(result);

        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);

          const step1Fields = ["email", "phone", "nationalId", "fullName", "age"];
          const hasStep1Errors = Object.keys(newFieldErrors).some((key) =>
            step1Fields.includes(key)
          );

          if (hasStep1Errors) {
            goToStep(1); 
          }

          setError("Please fix the highlighted fields before continuing.");
        } else {
          setError(result.message || "Failed to process patient data. Please try again.");
        }

        setIsProcessing(false); 
      }

    } catch (err) {
      console.error("Processing error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }

  };

  if (showProcessingScreen) {
    return <ProcessingReports />;
  }

  return (
    <div>
      <div className="background-pattern"></div>

      <div className="ai-waves">
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
      </div>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text">
            <img src={logo} alt="" />
          </span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-main">
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              <a href="/dashboard" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </span>
                <span>Overview</span>
              </a>
              <a href="/patients" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span>Patients</span>
              </a>
              <a href="#" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <span>Subscription</span>
              </a>
              <a href="#" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </span>
                <span>Support</span>
              </a>
              <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); openLogoutModal(); }}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M10 16l4-4-4-4"></path>
                    <path d="M14 12H8"></path>
                  </svg>
                </span>
                <span>Logout</span>
              </a>
            </div>
          </div>
        </nav>
      </aside>

      <nav className="top-navbar">
        <div className="navbar-right">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span>Online</span>
          </div>
          <div className="credits-badge">
            <span className="credits-icon">
              <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", stroke: "currentColor", fill: "none", strokeWidth: 2 }}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </span>
            <span>Credits: 1,247</span>
          </div>
          <button className="icon-btn">
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge"></span>
          </button>
          <div className="user-avatar">LA</div>
        </div>
      </nav>

      <LogoutConfirmation isOpen={isLogoutModalOpen} onClose={closeLogoutModal} />

      <div className="main-content">
        <div className="page-header"></div>

        <div className="wizard-card">
          <div className="wizard-header">
            <div className="step-indicator">
              <div className={`step-item ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
                <div className="step-circle">
                  {currentStep > 1 ? (
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : "01"}
                </div>
                <span className="step-label">Patient Info</span>
              </div>
              <div className={`step-connector ${currentStep > 1 ? "completed" : ""}`}></div>
              <div className={`step-item ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
                <div className="step-circle">
                  {currentStep > 2 ? (
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : "02"}
                </div>
                <span className="step-label">Medical History</span>
              </div>
              <div className={`step-connector ${currentStep > 2 ? "completed" : ""}`}></div>
              <div className={`step-item ${currentStep === 3 ? "active" : ""}`}>
                <div className="step-circle">03</div>
                <span className="step-label">Upload Reports</span>
              </div>
            </div>
          </div>

          <div className="wizard-body">

            {error && (
              <div style={{
                padding: "12px 16px",
                marginBottom: "20px",
                backgroundColor: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: "8px",
                color: "#991B1B",
                fontSize: "14px",
              }}>
                {error}
              </div>
            )}

            <div className={`step-content ${currentStep === 1 ? "active" : ""}`}>
              <div className="step-header">
                <h2 className="step-title">Patient Personal Information</h2>
                <p className="step-subtitle">Enter basic patient details to create a new record</p>
              </div>

              <div className="form-grid add-patient-step1">

                <div className="form-group">
                  <label className="form-label required">Full Name</label>
                  <input
                    type="text"
                    className={`form-input${fieldErrors.fullName ? " target-error" : ""}`}
                    id="fullName"
                    placeholder="Enter patient's full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                  {fieldErrors.fullName && (
                    <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.fullName}</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label required">Email</label>
                  <input
                    type="email"
                    className={`form-input${fieldErrors.email ? " target-error" : ""}`}
                    id="email"
                    placeholder="Enter patient's email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                  {fieldErrors.email && (
                    <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.email}</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label required">Age</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`form-input${fieldErrors.age ? " target-error" : ""}`}
                    id="age"
                    placeholder="Enter age"
                    value={formData.age}
                    onChange={handleInputChange}
                  />
                  {fieldErrors.age && (
                    <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.age}</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label required">Gender</label>
                  <div className={`custom-select-container ${isGenderOpen ? "is-open" : ""}`}>
                    <div
                      className={`form-input custom-select-trigger ${!selectedGender ? "placeholder" : ""}`}
                      onClick={() => setIsGenderOpen(!isGenderOpen)}
                    >
                      {selectedGender ? selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1) : "Select gender"}
                      <svg className="arrow-icon" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                    {isGenderOpen && (
                      <div className="custom-options-list">
                        {[
                          { value: "male", label: "Male" },
                          { value: "female", label: "Female" },
                          { value: "other", label: "Other" },
                          { value: "prefer_not_to_say", label: "Prefer not to say" },
                        ].map((opt) => (
                          <div
                            key={opt.value}
                            className={`custom-option ${selectedGender === opt.value ? "selected" : ""}`}
                            onClick={() => { setSelectedGender(opt.value); setIsGenderOpen(false); }}
                          >
                            {opt.label}
                            {selectedGender === opt.value && (
                              <svg className="check-icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Phone Number</label>
                  <input
                    type="tel"
                    className={`form-input${fieldErrors.phone ? " target-error" : ""}`}
                    id="phone"
                    inputMode="numeric"
                    placeholder="+20 XXX XXX XXXX"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                  {fieldErrors.phone && (
                    <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.phone}</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label required">National ID</label>
                  <input
                    type="text"
                    className={`form-input${fieldErrors.nationalId ? " target-error" : ""}`}
                    id="nationalId"
                    inputMode="numeric"
                    placeholder="Enter ID number"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                  />
                  {fieldErrors.nationalId && (
                    <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.nationalId}</div>
                  )}
                </div>

              </div>

              <div className="wizard-actions">
                <button className="back" onClick={() => navigate("/patients")}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  className="next"
                  disabled={!isStep1Valid}
                  onClick={handleStep1Next}
                >
                  Next Step
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={`step-content ${currentStep === 2 ? "active" : ""}`}>
              <div className="step-header">
                <h2 className="step-title">Medical History Intake</h2>
                <p className="step-subtitle">Complete the medical questionnaire to assist diagnosis</p>
              </div>

              <div className="toggle-section medhist">
                <div className="tog-item">
                  <label className="toggle-label">Is the patient a smoker?</label>
                  <div className="radio-group">
                    <div className={`radio-button ${isSmoker === true ? "selected" : ""}`} onClick={() => handleSmokerSelect("yes")}>Yes</div>
                    <div className={`radio-button ${isSmoker === false ? "selected" : ""}`} onClick={() => handleSmokerSelect("no")}>No</div>
                  </div>
                </div>
                <div className="tog-item">
                  <label className="toggle-label">Previous surgeries?</label>
                  <div className="radio-group">
                    <div className={`radio-button ${hasSurgeries === true ? "selected" : ""}`} onClick={() => handleSurgerySelect("yes")}>Yes</div>
                    <div className={`radio-button ${hasSurgeries === false ? "selected" : ""}`} onClick={() => handleSurgerySelect("no")}>No</div>
                  </div>
                </div>
              </div>

              <div className="section-divider"></div>

              <div className="toggle-section">
                <label className="toggle-label">Any chronic diseases?</label>
                <div className="toggle-pills">
                  {["diabetes", "hypertension", "asthma", "heart", "kidney", "liver", "thyroid", "cancer"].map((disease) => (
                    <div
                      key={disease}
                      className={`pill ${selectedChronicDiseases.includes(disease) ? "selected" : ""}`}
                      onClick={() => handleChronicDiseaseToggle(disease)}
                    >
                      {disease.charAt(0).toUpperCase() +
                        disease.slice(1)
                          .replace("heart", "Heart Disease")
                          .replace("kidney", "Kidney Disease")
                          .replace("liver", "Liver Disease")}
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-divider"></div>

              {hasSurgeries && (
                <div className="form-group" id="surgeryDetails">
                  <label className="form-label">Please specify surgeries</label>
                  <textarea className="form-textarea" id="surgeryText" placeholder="List previous surgeries and approximate dates..." value={formData.surgeryText} onChange={handleInputChange}></textarea>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Regular Medications</label>
                <textarea className="form-textarea" id="medications" placeholder="List any medications the patient takes regularly..." value={formData.medications} onChange={handleInputChange}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Known Allergies</label>
                <textarea className="form-textarea" id="allergies" placeholder="List any known drug or food allergies..." value={formData.allergies} onChange={handleInputChange}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Family Medical History</label>
                <textarea className="form-textarea" id="familyHistory" placeholder="Note any relevant family history (e.g., diabetes in parents, heart disease in siblings)..." value={formData.familyHistory} onChange={handleInputChange}></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Chief Complaint</label>
                <textarea className="form-textarea" id="ChiefComplaint" placeholder="Describe the main problem the patient is experiencing..." value={formData.ChiefComplaint} onChange={handleInputChange}></textarea>
              </div>

              <div className="wizard-actions">
                <button className="back" onClick={() => goToStep(1)}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button className="next" disabled={!isStep2Valid} onClick={() => goToStep(3)}>
                  Next Step
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={`step-content ${currentStep === 3 ? "active" : ""}`}>
              <div className="step-header">
                <h2 className="step-title">Upload Medical Documents</h2>
                <p className="step-subtitle">Upload lab tests, medical records, and radiology reports for AI analysis</p>
              </div>

              <div className="upload-cards-grid">
                {["lab", "history", "radiology"].map((category) => (
                  <div key={category} className="upload-card">
                    <div className="upload-card-header">
                      <div className="upload-card-title">
                        <span className={`category-badge ${category}`}>
                          {category === "lab" ? "Lab" : category === "history" ? "History" : "Radiology"}
                        </span>
                        <h4>
                          {category === "lab" ? "Lab Tests" : category === "history" ? "Medical History" : "Radiology Reports"}
                        </h4>
                      </div>
                      <p className="upload-card-subtitle">
                        {category === "lab" ? "Blood work, urinalysis, biochemistry panels"
                          : category === "history" ? "Patient records, visit notes, prescriptions"
                          : "X-rays, CT scans, MRI, DICOM images"}
                      </p>
                    </div>

                    <div className="dropzone" data-category={category} onClick={() => document.getElementById(`${category}Input`).click()}>
                      <svg className="dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="dropzone-text">Click to upload or drag files</div>
                      <div className="dropzone-formats">
                        {category === "radiology" ? "PDF, DOCX, JPG, PNG, DICOM (Max 10MB)" : "PDF, DOCX, JPG, PNG (Max 10MB)"}
                      </div>
                    </div>

                    <input
                      type="file"
                      className="file-input-hidden"
                      id={`${category}Input`}
                      multiple
                      accept={category === "radiology" ? ".pdf,.docx,.doc,.jpg,.jpeg,.png,.dcm" : ".pdf,.docx,.doc,.jpg,.jpeg,.png"}
                      onChange={(e) => handleFileInputChange(category, e)}
                    />

                    <div className="uploaded-files-list">
                      {fileManager[category].map((file, index) => (
                        <div key={index} className="uploaded-file-item">
                          <div className="file-type-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="file-name">{file.name}</span>
                          <svg className="file-status-check" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <button className="file-remove-btn" onClick={() => removeFile(category, index)}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!hasAtLeastOneFile && (
                <p style={{ color: "#EF4444", fontSize: "13px", textAlign: "center", marginTop: "12px" }}>
                  Please upload at least one file to proceed.
                </p>
              )}

              <div className="wizard-actions" style={{ gap: "50%" }}>
                <button className="back" onClick={() => goToStep(2)} disabled={isProcessing}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <button
                  className={`next ${isProcessing ? "loading" : ""}`}
                  onClick={handleProcess}
                  disabled={isProcessing || !hasAtLeastOneFile}
                >
                  {isProcessing ? (
                    <>
                      <svg style={{ animation: "spin 1s linear infinite", width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Process & Analyze Reports
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPatient;