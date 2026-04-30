import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addPatientAPI } from "./mockAPI";
import UploadFileItem from "./UploadFileItem";
import ProcessingReports from "../components/ProcessingReports";
import logo from "../assets/Logo_Diagnoo.png";
import stethoscope from "../assets/Stethoscope.png";
import closeIcon from "../assets/close.png";
import openIcon from "../assets/open.png";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../css/AddPatient.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import { getCookie } from "./cookieUtils";
import { useNotifications } from "./NotificationsContext";
import { getDoctorInitials } from "./Dashboard";
import { useTranscription } from "../hooks/useTranscription";
import { getDirection, getTextAlign } from "../utils/textUtils";

const AddPatient = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const { unreadCount, openNotifications } = useNotifications();
  const [showProcessingScreen, setShowProcessingScreen] = useState(false);
  const [pollingInfo, setPollingInfo] = useState({
    patientId: null,
    token: null,
  });
  const [selectedGender, setSelectedGender] = useState(null);
  const [isSmoker, setIsSmoker] = useState(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target)
      ) {
        setIsAvatarMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);
  const [hasSurgeries, setHasSurgeries] = useState(null);
  const [selectedChronicDiseases, setSelectedChronicDiseases] = useState([]);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  // fileManager stores { file: File, blobUrl: string } objects
  const [fileManager, setFileManager] = useState({
    lab: [],
    history: [],
    radiology: [],
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const { credits, isCreditsLoading, refreshCredits } = useSubscription();

  const [fieldErrors, setFieldErrors] = useState({});

  const { isRecording, isConnecting, toggleRecording } = useTranscription(
    useCallback((text) => {
      setFormData((prev) => ({
        ...prev,
        ChiefComplaint: prev.ChiefComplaint + text,
      }));
    }, []),
  );

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

  // Only block Step 1's Next button for Step 1-specific field errors.
  // Errors from other steps (step 2/3) or _general must NOT block Step 1.
  const step1ErrorFields = [
    "fullName",
    "email",
    "phone",
    "age",
    "nationalId",
    "gender",
    "is_smoker",
  ];
  const hasStep1Errors = Object.keys(fieldErrors).some((k) =>
    step1ErrorFields.includes(k),
  );

  const isStep1Valid =
    formData.fullName.trim() &&
    (formData.email.trim() || formData.phone.trim()) &&
    formData.age &&
    selectedGender &&
    formData.nationalId.trim() &&
    !hasStep1Errors;

  console.log("[step1] nextDisabled", {
    currentStep,
    nextDisabled: !isStep1Valid,
    hasErrors: hasStep1Errors,
    national_id: formData.nationalId,
    err: fieldErrors.nationalId,
  });

  // Step 2 is valid unless surgeries=YES and the name field is empty
  const isStep2Valid = !(hasSurgeries === true && !formData.surgeryText.trim());

  console.log("[step2] surgeries validation", {
    hasSurgeries,
    surgeryText: formData.surgeryText,
    canNext: isStep2Valid,
  });

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
      gender: "gender",
      is_smoker: "is_smoker",
      previous_surgeries: "previous_surgeries",
      previous_surgeries_name: "surgeryText",
      chronic_diseases: "chronic_diseases",
      medications: "medications",
      allergies: "allergies",
      family_history: "familyHistory",
      current_complaint: "ChiefComplaint",
      lab: "lab",
      radiology: "radiology",
      medical_history: "medical_history",
    };

    const newFieldErrors = {};

    if (result.errors) {
      Object.entries(result.errors).forEach(([backendKey, messages]) => {
        // Handle indexed keys like "lab.0" -> "lab"
        const baseKey = backendKey.split(".")[0];
        const frontendKey = backendFieldMap[baseKey] || baseKey;
        if (!newFieldErrors[frontendKey]) {
          newFieldErrors[frontendKey] = Array.isArray(messages)
            ? messages[0]
            : messages;
        }
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
    if (
      message.includes("national_id") &&
      message.includes("Duplicate entry")
    ) {
      newFieldErrors.nationalId = "National ID already exists.";
    }

    return newFieldErrors;
  };

  // Determine which step contains the first error and navigate to it.
  // All errors are kept in state; only the *current step* changes.
  const navigateToErrorStep = (errors) => {
    const step1Fields = [
      "fullName",
      "email",
      "phone",
      "age",
      "nationalId",
      "gender",
      "is_smoker",
    ];
    const step2Fields = [
      "surgeryText",
      "previous_surgeries",
      "previous_surgeries_name",
      "chronic_diseases",
      "medications",
      "allergies",
      "familyHistory",
      "ChiefComplaint",
    ];
    const step3Fields = ["lab", "radiology", "medical_history"];
    const errorKeys = Object.keys(errors);

    // Debug: show which errors landed on which step
    console.log("[422] errors keys", errorKeys);
    console.log("[422] stepWithErrors", {
      step1: errorKeys.filter((k) => step1Fields.includes(k)),
      step2: errorKeys.filter((k) => step2Fields.includes(k)),
      step3: errorKeys.filter((k) => step3Fields.includes(k)),
    });

    let targetStep = null;
    let firstFieldId = null;

    for (const key of errorKeys) {
      if (step1Fields.includes(key)) {
        targetStep = 1;
        firstFieldId = key;
        break;
      }
    }
    if (!targetStep) {
      for (const key of errorKeys) {
        if (step2Fields.includes(key)) {
          targetStep = 2;
          firstFieldId = key;
          break;
        }
      }
    }
    if (!targetStep) {
      for (const key of errorKeys) {
        if (step3Fields.includes(key)) {
          targetStep = 3;
          firstFieldId = key;
          break;
        }
      }
    }

    if (targetStep) {
      setCurrentStep(targetStep);
      setTimeout(() => {
        const el =
          document.getElementById(firstFieldId) ||
          document.querySelector(`[name="${firstFieldId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus?.();
        }
      }, 100);
    }
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

    // Email/Phone mutual exclusivity: clear the other when one is typed
    if (id === "email") {
      delete newErrors.phone;
      setFieldErrors(newErrors);
      setFormData((prev) => ({ ...prev, email: newValue, phone: "" }));
      return;
    }
    if (id === "phone") {
      delete newErrors.email;
      setFieldErrors(newErrors);
      setFormData((prev) => ({ ...prev, phone: newValue, email: "" }));
      return;
    }

    setFieldErrors(newErrors);
    setFormData((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleSmokerSelect = (value) => setIsSmoker(value === "yes");
  const handleSurgerySelect = (value) => {
    const isYes = value === "yes";
    setHasSurgeries(isYes);
    if (!isYes) {
      setFormData((prev) => ({ ...prev, surgeryText: "" }));
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n.surgeryText;
        return n;
      });
    }
  };
  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  const handleChronicDiseaseToggle = (value) => {
    setSelectedChronicDiseases((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  };

  const ALLOWED_EXTS = [".pdf", ".jpg", ".jpeg"];
  const ALLOWED_MIME = ["application/pdf", "image/jpeg"];

  const handleFiles = (category, files) => {
    const validEntries = Array.from(files)
      .filter((file) => {
        const ext = "." + file.name.split(".").pop().toLowerCase();
        return ALLOWED_EXTS.includes(ext) && file.size <= 10 * 1024 * 1024;
      })
      .map((file) => ({ file, blobUrl: URL.createObjectURL(file) }));

    const categoryErrorKey =
      category === "history" ? "medical_history" : category;
    if (validEntries.length > 0) {
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[categoryErrorKey];
        return n;
      });
    }
    setFileManager((prev) => ({
      ...prev,
      [category]: [...prev[category], ...validEntries],
    }));
  };

  const handleFileInputChange = (category, e) => {
    handleFiles(category, e.target.files);
    e.target.value = "";
  };

  const removeFile = (category, index) => {
    const entry = fileManager[category][index];
    const fileName = entry?.file?.name ?? entry?.name ?? "unknown";
    console.log("[file-remove] clicked", { section: category, fileName });
    // Revoke blob URL to free memory
    if (entry?.blobUrl) URL.revokeObjectURL(entry.blobUrl);
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
    setFieldErrors({});
    goToStep(2);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setFieldErrors({});

    try {
      const apiFormData = new FormData();

      apiFormData.append("name", formData.fullName);
      if (formData.email.trim()) apiFormData.append("email", formData.email);
      if (formData.phone.trim()) apiFormData.append("phone", formData.phone);
      apiFormData.append("age", formData.age);
      apiFormData.append("gender", selectedGender);
      apiFormData.append("national_id", formData.nationalId);

      apiFormData.append("is_smoker", isSmoker ? "1" : "0");
      apiFormData.append("previous_surgeries", hasSurgeries ? "1" : "0");
      if (hasSurgeries) {
        apiFormData.append(
          "previous_surgeries_name",
          formData.surgeryText || "",
        );
      }

      if (selectedChronicDiseases.length > 0) {
        selectedChronicDiseases.forEach((disease) => {
          apiFormData.append("chronic_diseases[]", disease);
        });
      }
      // else {
      //   apiFormData.append("chronic_diseases[]", "");
      // }

      apiFormData.append("medications", formData.medications || "");
      apiFormData.append("allergies", formData.allergies || "");
      apiFormData.append("family_history", formData.familyHistory || "");
      apiFormData.append("current_complaint", formData.ChiefComplaint || "");

      fileManager.lab.forEach((entry) =>
        apiFormData.append("lab[]", entry.file),
      );
      fileManager.history.forEach((entry) =>
        apiFormData.append("medical_history[]", entry.file),
      );
      fileManager.radiology.forEach((entry) =>
        apiFormData.append("radiology[]", entry.file),
      );

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
          }),
        );

        // ── Invalidate patient list + dashboard caches so both re-fetch on next visit ──
        window.dispatchEvent(new CustomEvent("patientListInvalidated"));
        window.dispatchEvent(new CustomEvent("dashboardInvalidated"));

        refreshCredits(); // Update top bar credits

        const token = getCookie("user_token");
        setPollingInfo({ patientId: result.data.data.patient_id, token });
        setShowProcessingScreen(true);
      } else {
        // Log the raw 422 body so we can see every field the backend flagged
        console.log("[add-patient] 422 raw response:", {
          message: result.message,
          errors: result.errors,
        });

        const newFieldErrors = extractFieldErrors(result);

        if (Object.keys(newFieldErrors).length > 0) {
          // Store ALL parsed errors at once — user sees every highlighted field
          // across steps without needing multiple re-submits
          setFieldErrors(newFieldErrors);
          navigateToErrorStep(newFieldErrors);
        } else {
          setFieldErrors({
            _general:
              result.message ||
              "Failed to process patient data. Please try again.",
          });
        }

        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Processing error:", err);
      setFieldErrors({
        _general: "An unexpected error occurred. Please try again.",
      });
      setIsProcessing(false);
    }
  };

  if (showProcessingScreen) {
    return (
      <ProcessingReports
        patientId={pollingInfo.patientId}
        token={pollingInfo.token}
        onSuccess={(data) => {
          navigate(`/patient-profile/${pollingInfo.patientId}`, {
            state: { keyInfoData: data, patientId: pollingInfo.patientId },
          });
        }}
        onFailure={(msg) => {
          setShowProcessingScreen(false);
          setIsProcessing(false);
          setFieldErrors({
            _general: msg || "AI analysis failed. Please try again.",
          });
          setCurrentStep(1); // Ensure user goes back to the beginning on failure
        }}
        onStop={() => {
          // User manually stopped — return them to the Upload Reports step
          setShowProcessingScreen(false);
          setIsProcessing(false);
          setCurrentStep(3);
        }}
      />
    );
  }

  return (
    <div>
      <div className="background-pattern"></div>

      <div className="ai-waves">
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
      </div>

      <Sidebar activePage="addpatient" />

      <Navbar
        isSidebarCollapsed={isSidebarCollapsed}
        credits={credits}
        isCreditsLoading={isCreditsLoading}
        unreadCount={unreadCount}
        getDoctorInitials={getDoctorInitials}
        openNotifications={openNotifications}
        setIsLogoutModalOpen={setIsLogoutModalOpen}
      />

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
      />

      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="page-header"></div>

        <div className="wizard-card">
          <div className="wizard-header">
            <div className="step-indicator">
              <div
                className={`step-item ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}
              >
                <div className="step-circle">
                  {currentStep > 1 ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    "01"
                  )}
                </div>
                <span className="step-label">Patient Info</span>
              </div>
              <div
                className={`step-connector ${currentStep > 1 ? "completed" : ""}`}
              ></div>
              <div
                className={`step-item ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}
              >
                <div className="step-circle">
                  {currentStep > 2 ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    "02"
                  )}
                </div>
                <span className="step-label">Medical History</span>
              </div>
              <div
                className={`step-connector ${currentStep > 2 ? "completed" : ""}`}
              ></div>
              <div className={`step-item ${currentStep === 3 ? "active" : ""}`}>
                <div className="step-circle">03</div>
                <span className="step-label">Upload Reports</span>
              </div>
            </div>
          </div>

          <div className="wizard-body">
            {fieldErrors._general && (
              <div
                style={{
                  padding: "12px 16px",
                  marginBottom: "20px",
                  backgroundColor: "#FEE2E2",
                  border: "1px solid #FCA5A5",
                  borderRadius: "8px",
                  color: "#991B1B",
                  fontSize: "14px",
                }}
              >
                {fieldErrors._general}
              </div>
            )}

            <div
              className={`step-content ${currentStep === 1 ? "active" : ""}`}
            >
              <div className="step-header">
                <h2 className="step-title">Patient Personal Information</h2>
                <p className="step-subtitle">
                  Enter basic patient details to create a new record
                </p>
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
                    dir={getDirection(formData.fullName)}
                    style={{ textAlign: getTextAlign(formData.fullName) }}
                  />
                  {fieldErrors.fullName && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.fullName}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label
                    className={`form-label ${!formData.phone.trim() ? "required" : ""}`}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    className={`form-input${fieldErrors.email ? " target-error" : ""}`}
                    id="email"
                    placeholder="Enter patient's email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!!formData.phone.trim()}
                  />
                  {fieldErrors.email && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.email}
                    </div>
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
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.age}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label required">Gender</label>
                  <div
                    className={`custom-select-container ${isGenderOpen ? "is-open" : ""}`}
                  >
                    <div
                      className={`form-input custom-select-trigger ${!selectedGender ? "placeholder" : ""}`}
                      onClick={() => setIsGenderOpen(!isGenderOpen)}
                    >
                      {selectedGender
                        ? selectedGender.charAt(0).toUpperCase() +
                          selectedGender.slice(1)
                        : "Select gender"}
                      <svg className="arrow-icon" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                    {isGenderOpen && (
                      <div className="custom-options-list">
                        {[
                          { value: "male", label: "Male" },
                          { value: "female", label: "Female" },
                        ].map((opt) => (
                          <div
                            key={opt.value}
                            className={`custom-option ${selectedGender === opt.value ? "selected" : ""}`}
                            onClick={() => {
                              setSelectedGender(opt.value);
                              setIsGenderOpen(false);
                            }}
                          >
                            {opt.label}
                            {selectedGender === opt.value && (
                              <svg className="check-icon" viewBox="0 0 24 24">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label
                    className={`form-label ${!formData.email.trim() ? "required" : ""}`}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className={`form-input${fieldErrors.phone ? " target-error" : ""}`}
                    id="phone"
                    inputMode="numeric"
                    placeholder="+20 XXX XXX XXXX"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!!formData.email.trim()}
                  />
                  {fieldErrors.phone && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.phone}
                    </div>
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
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.nationalId}
                    </div>
                  )}
                </div>
              </div>

              <div className="wizard-actions">
                <button className="back" onClick={() => navigate("/patients")}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              className={`step-content ${currentStep === 2 ? "active" : ""}`}
            >
              <div className="step-header">
                <h2 className="step-title">Medical History Intake</h2>
                <p className="step-subtitle">
                  Complete the medical questionnaire to assist diagnosis
                </p>
              </div>

              <div className="toggle-section medhist">
                <div className="tog-item">
                  <label className="toggle-label">
                    Is the patient a smoker?
                  </label>
                  <div className="radio-group">
                    <div
                      className={`radio-button ${isSmoker === true ? "selected" : ""}`}
                      onClick={() => handleSmokerSelect("yes")}
                    >
                      Yes
                    </div>
                    <div
                      className={`radio-button ${isSmoker === false ? "selected" : ""}`}
                      onClick={() => handleSmokerSelect("no")}
                    >
                      No
                    </div>
                  </div>
                </div>
                <div className="tog-item">
                  <label className="toggle-label">Previous surgeries?</label>
                  <div className="radio-group">
                    <div
                      className={`radio-button ${hasSurgeries === true ? "selected" : ""}`}
                      onClick={() => handleSurgerySelect("yes")}
                    >
                      Yes
                    </div>
                    <div
                      className={`radio-button ${hasSurgeries === false ? "selected" : ""}`}
                      onClick={() => handleSurgerySelect("no")}
                    >
                      No
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-divider"></div>

              <div className="toggle-section">
                <label className="toggle-label">Any chronic diseases?</label>
                <div className="toggle-pills">
                  {[
                    "diabetes",
                    "hypertension",
                    "asthma",
                    "heart",
                    "kidney",
                    "liver",
                    "thyroid",
                    "cancer",
                  ].map((disease) => (
                    <div
                      key={disease}
                      className={`pill ${selectedChronicDiseases.includes(disease) ? "selected" : ""}`}
                      onClick={() => handleChronicDiseaseToggle(disease)}
                    >
                      {disease.charAt(0).toUpperCase() +
                        disease
                          .slice(1)
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
                  <label className="form-label required">
                    Please specify surgeries{" "}
                    <span className="provided-hint">Provided</span>
                  </label>
                  <textarea
                    className={`form-textarea${fieldErrors.surgeryText ? " target-error" : ""}`}
                    id="surgeryText"
                    placeholder="List previous surgeries and approximate dates..."
                    value={formData.surgeryText}
                    onChange={handleInputChange}
                    dir={getDirection(formData.surgeryText)}
                    style={{ textAlign: getTextAlign(formData.surgeryText) }}
                  ></textarea>
                  {fieldErrors.surgeryText && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.surgeryText}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Regular Medications</label>
                <textarea
                  className="form-textarea"
                  id="medications"
                  placeholder="List any medications the patient takes regularly..."
                  value={formData.medications}
                  onChange={handleInputChange}
                  dir={getDirection(formData.medications)}
                  style={{ textAlign: getTextAlign(formData.medications) }}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Known Allergies</label>
                <textarea
                  className="form-textarea"
                  id="allergies"
                  placeholder="List any known drug or food allergies..."
                  value={formData.allergies}
                  onChange={handleInputChange}
                  dir={getDirection(formData.allergies)}
                  style={{ textAlign: getTextAlign(formData.allergies) }}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Family Medical History</label>
                <textarea
                  className="form-textarea"
                  id="familyHistory"
                  placeholder="Note any relevant family history (e.g., diabetes in parents, heart disease in siblings)..."
                  value={formData.familyHistory}
                  onChange={handleInputChange}
                  dir={getDirection(formData.familyHistory)}
                  style={{ textAlign: getTextAlign(formData.familyHistory) }}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Chief Complaint</label>
                <div className="chief-complaint-wrapper">
                  <textarea
                    className="form-textarea chief-complaint-textarea"
                    id="ChiefComplaint"
                    placeholder="Describe the main problem the patient is experiencing..."
                    value={formData.ChiefComplaint}
                    onChange={handleInputChange}
                    dir={getDirection(formData.ChiefComplaint)}
                    style={{ textAlign: getTextAlign(formData.ChiefComplaint) }}
                  ></textarea>

                  {isRecording && (
                    <div className="voice-visualization">
                      <span
                        className="voice-bar"
                        style={{ backgroundColor: "#2A66FF" }}
                      ></span>
                      <span
                        className="voice-bar"
                        style={{ backgroundColor: "#2A66FF" }}
                      ></span>
                      <span
                        className="voice-bar"
                        style={{ backgroundColor: "#2A66FF" }}
                      ></span>
                      <span
                        className="voice-bar"
                        style={{ backgroundColor: "#2A66FF" }}
                      ></span>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`mic-button ${isRecording ? "recording" : ""} ${isConnecting ? "connecting" : ""}`}
                    onClick={toggleRecording}
                    title={
                      isRecording
                        ? "Stop Recording"
                        : isConnecting
                          ? "Connecting..."
                          : "Start Voice Input"
                    }
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="spin-icon"
                      >
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line
                          x1="16.24"
                          y1="16.24"
                          x2="19.07"
                          y2="19.07"
                        ></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                      </svg>
                    ) : isRecording ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="6"
                          y="6"
                          width="12"
                          height="12"
                          rx="2"
                          ry="2"
                        ></rect>
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2A66FF"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="wizard-actions">
                <button className="back" onClick={() => goToStep(1)}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
                <button
                  className="next"
                  disabled={!isStep2Valid}
                  onClick={() => goToStep(3)}
                >
                  Next Step
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              className={`step-content ${currentStep === 3 ? "active" : ""}`}
            >
              <div className="step-header">
                <h2 className="step-title">Upload Medical Documents</h2>
                <p className="step-subtitle">
                  Upload lab tests, medical records, and radiology reports for
                  AI analysis
                </p>
              </div>

              <div className="upload-cards-grid">
                {["lab", "history", "radiology"].map((category) => (
                  <div key={category} className="upload-card">
                    <div className="upload-card-header">
                      <div className="upload-card-title">
                        <span className={`category-badge ${category}`}>
                          {category === "lab"
                            ? "Lab"
                            : category === "history"
                              ? "History"
                              : "Radiology"}
                        </span>
                        <h4>
                          {category === "lab"
                            ? "Lab Tests"
                            : category === "history"
                              ? "Medical History"
                              : "Radiology Reports"}
                        </h4>
                      </div>
                      <p className="upload-card-subtitle">
                        {category === "lab"
                          ? "Blood work, urinalysis, biochemistry panels"
                          : category === "history"
                            ? "Patient records, visit notes, prescriptions"
                            : "X-rays, CT scans, MRI, DICOM images"}
                      </p>
                    </div>

                    <div
                      className="dropzone"
                      data-category={category}
                      onClick={() =>
                        document.getElementById(`${category}Input`).click()
                      }
                    >
                      <svg
                        className="dropzone-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <div className="dropzone-text">
                        Click to upload or drag files
                      </div>
                      <div className="dropzone-formats">
                        PDF, JPG (Max 10MB)
                      </div>
                    </div>

                    <input
                      type="file"
                      className="file-input-hidden"
                      id={`${category}Input`}
                      multiple
                      accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg"
                      onChange={(e) => handleFileInputChange(category, e)}
                    />

                    <div className="uploaded-files-list">
                      {fileManager[category].map((entry, index) => (
                        <UploadFileItem
                          key={index}
                          fileName={entry.file.name}
                          viewUrl={entry.blobUrl}
                          onRemove={() => removeFile(category, index)}
                          style={{
                            borderColor: "#BBF7D0",
                            background: "#F0FDF4",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {(fieldErrors.lab ||
                fieldErrors.radiology ||
                fieldErrors.medical_history) && (
                <div
                  style={{
                    color: "#EF4444",
                    fontSize: "14px",
                    marginBottom: "20px",
                    textAlign: "center",
                    fontWeight: "500",
                    backgroundColor: "#FEF2F2",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px dashed #FCA5A5",
                  }}
                >
                  {fieldErrors.lab ||
                    fieldErrors.radiology ||
                    fieldErrors.medical_history}
                </div>
              )}

              <div className="wizard-actions">
                <button
                  className="back"
                  onClick={() => goToStep(2)}
                  disabled={isProcessing}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>

                <button
                  className={`next ${isProcessing ? "loading" : ""}`}
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <svg
                        style={{
                          animation: "spin 1s linear infinite",
                          width: "20px",
                          height: "20px",
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span className="btn-text-full">Processing...</span>
                      <span className="btn-text-short">...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="btn-text-full">
                        Process &amp; Analyze Reports
                      </span>
                      <span className="btn-text-short">Process</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddPatient;
