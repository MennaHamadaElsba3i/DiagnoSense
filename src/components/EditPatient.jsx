import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientForEditAPI, updatePatientAPI } from "./mockAPI";
import UploadFileItem from "./UploadFileItem";
import logo from "../assets/Logo_Diagnoo.png";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar"
import "../css/AddPatient.css";
import "../css/EditPatient.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import { getCookie } from "./cookieUtils";
import { useNotifications } from "./NotificationsContext";
import { getDoctorInitials } from './Dashboard';
import ProcessingReports from "./ProcessingReports";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map backend `existing_files[].type` to our fileManager category key */
const fileTypeToCategory = (type) => {
  if (type === "medical_history") return "history";
  if (type === "lab") return "lab";
  if (type === "radiology") return "radiology";
  return "history"; // fallback
};

/** Map form's category key back to the backend field name used in multipart */
const categoryToBackendField = (category) => {
  if (category === "history") return "medical_history[]";
  if (category === "lab") return "lab[]";
  if (category === "radiology") return "radiology[]";
  return "medical_history[]";
};

const CHRONIC_DISEASE_OPTIONS = [
  "diabetes", "hypertension", "asthma", "heart",
  "kidney", "liver", "thyroid", "cancer",
];

const diseaseLabel = (d) => {
  const map = { heart: "Heart Disease", kidney: "Kidney Disease", liver: "Liver Disease" };
  return map[d] || (d.charAt(0).toUpperCase() + d.slice(1));
};

// ─── Component ──────────────────────────────────────────────────────────────

const EditPatient = () => {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { unreadCount, openNotifications } = useNotifications();
  const { isSidebarCollapsed } = useSidebar();
  const { credits, isCreditsLoading } = useSubscription();

  // ── Fetch / loading state ──
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // ── Step navigation ──
  const [currentStep, setCurrentStep] = useState(1);

  // ── UI state ──
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successToast, setSuccessToast] = useState(null);
  const [showProcessingScreen, setShowProcessingScreen] = useState(false);
  const [pollingInfo, setPollingInfo] = useState({ patientId: null, token: null });

  // ── Step 1: Personal Info ──
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    age: "",
    nationalId: "",
    // Step 2
    surgeryText: "",
    medications: "",
    allergies: "",
    familyHistory: "",
    ChiefComplaint: "",
  });
  const [selectedGender, setSelectedGender] = useState(null);

  // ── Step 2: Medical History ──
  const [isSmoker, setIsSmoker] = useState(null);
  const [hasSurgeries, setHasSurgeries] = useState(null);
  const [selectedChronicDiseases, setSelectedChronicDiseases] = useState([]);

  // ── Step 3: Files ──
  // existingFiles: full array from backend
  const [existingFiles, setExistingFiles] = useState([]); // [{ id, type, name, url }]
  // removedExistingIds: set of IDs the doctor soft-removed
  const [removedExistingIds, setRemovedExistingIds] = useState(new Set());
  // newFiles: locally picked files as { file: File, blobUrl: string }
  const [fileManager, setFileManager] = useState({ lab: [], history: [], radiology: [] });

  const ALLOWED_EXTS_EDIT = [".pdf", ".jpg", ".jpeg"];

  // ── Original snapshot for change detection ──
  const [originalSnapshot, setOriginalSnapshot] = useState(null);

  // ── Close avatar menu on outside click ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setIsAvatarMenuOpen(false);
      }
    };
    const handleEscape = (e) => { if (e.key === "Escape") setIsAvatarMenuOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // ── Drag-and-drop on file dropzones ──
  useEffect(() => {
    const categories = ["lab", "history", "radiology"];
    const cleanups = [];
    categories.forEach((category) => {
      const dropzone = document.querySelector(`[data-category="${category}"]`);
      if (!dropzone) return;
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
        handleNewFiles(category, e.dataTransfer.files);
      };
      dropzone.addEventListener("dragover", handleDragOver);
      dropzone.addEventListener("dragleave", handleDragLeave);
      dropzone.addEventListener("drop", handleDrop);
      cleanups.push(() => {
        dropzone.removeEventListener("dragover", handleDragOver);
        dropzone.removeEventListener("dragleave", handleDragLeave);
        dropzone.removeEventListener("drop", handleDrop);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [currentStep]); // re-bind when step 3 mounts

  // ─────────────────────────────────────────────
  // Fetch patient data for pre-fill on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!patientId) {
      setFetchError("No patient ID provided.");
      setIsFetching(false);
      return;
    }

    const fetchPatient = async () => {
      setIsFetching(true);
      setFetchError(null);
      const res = await getPatientForEditAPI(patientId);

      if (!res.success) {
        const is401 =
          res.message?.toLowerCase().includes("unauthenticated") ||
          res.message?.includes("401");
        if (is401) {
          navigate("/login");
          return;
        }
        setFetchError(res.message || "Failed to load patient data.");
        setIsFetching(false);
        return;
      }

      const d = res.data;
      const pi = d?.personal_info || {};
      const mh = d?.medical_history || {};
      const ef = Array.isArray(d?.existing_files) ? d.existing_files : [];

      // Pre-fill personal info
      const newFormData = {
        fullName: pi.name || "",
        email: pi.email || "",
        phone: pi.phone || "",
        age: pi.age != null ? String(pi.age) : "",
        nationalId: pi.national_id || "",
        // Medical history textareas
        surgeryText: mh.previous_surgeries_name || "",
        medications: mh.medications || "",
        allergies: mh.allergies || "",
        familyHistory: mh.family_history || "",
        ChiefComplaint: mh.current_complaint || "",
      };
      setFormData(newFormData);
      setSelectedGender(pi.gender || null);

      // Pre-fill medical history toggles
      if (mh.is_smoker != null) setIsSmoker(!!mh.is_smoker);
      if (mh.previous_surgeries != null) setHasSurgeries(!!mh.previous_surgeries);
      setSelectedChronicDiseases(Array.isArray(mh.chronic_diseases) ? mh.chronic_diseases : []);

      // Pre-fill existing files
      setExistingFiles(ef);

      // Store original snapshot for change detection
      setOriginalSnapshot({
        personalInfo: {
          name: pi.name || "",
          email: pi.email || "",
          phone: pi.phone || "",
          age: pi.age != null ? String(pi.age) : "",
          nationalId: pi.national_id || "",
          gender: pi.gender || "",
        },
        medicalHistory: {
          current_complaint: mh.current_complaint || "",
          is_smoker: mh.is_smoker ?? null,
          previous_surgeries: mh.previous_surgeries ?? null,
          chronic_diseases: Array.isArray(mh.chronic_diseases) ? [...mh.chronic_diseases] : [],
          previous_surgeries_name: mh.previous_surgeries_name || "",
          medications: mh.medications || "",
          allergies: mh.allergies || "",
          family_history: mh.family_history || "",
          ai_summary: mh.ai_summary || d.ai_summary || "",
          smart_summary: mh.smart_summary || d.smart_summary || "",
          key_points: mh.key_points || d.key_points || null,
          key_important_information: mh.key_important_information || d.key_important_information || null,
        },
        existingFileIds: ef.map((f) => f.id),
      });

      setIsFetching(false);
    };

    fetchPatient();
  }, [patientId]);

  // ─────────────────────────────────────────────
  // Change detection
  // ─────────────────────────────────────────────
  const computeChanges = () => {
    if (!originalSnapshot) return { hasNonAiChanges: false, hasAiRelevantChanges: false };

    const orig = originalSnapshot;

    // Personal info diff
    const personalChanged =
      formData.fullName !== orig.personalInfo.name ||
      formData.email !== orig.personalInfo.email ||
      formData.phone !== orig.personalInfo.phone ||
      String(formData.age) !== orig.personalInfo.age ||
      formData.nationalId !== orig.personalInfo.nationalId ||
      (selectedGender || "") !== orig.personalInfo.gender;

    // Medical history diff (AI-relevant)
    const mhOrig = orig.medicalHistory;
    const medicalChanged =
      formData.ChiefComplaint !== mhOrig.current_complaint ||
      isSmoker !== (mhOrig.is_smoker ?? null) ||
      hasSurgeries !== (mhOrig.previous_surgeries ?? null) ||
      JSON.stringify([...selectedChronicDiseases].sort()) !== JSON.stringify([...mhOrig.chronic_diseases].sort()) ||
      formData.surgeryText !== mhOrig.previous_surgeries_name ||
      formData.medications !== mhOrig.medications ||
      formData.allergies !== mhOrig.allergies ||
      formData.familyHistory !== mhOrig.family_history;

    // Files diff (AI-relevant)
    const filesChanged =
      removedExistingIds.size > 0 ||
      fileManager.lab.length > 0 ||
      fileManager.history.length > 0 ||
      fileManager.radiology.length > 0;

    return {
      hasNonAiChanges: personalChanged,
      hasAiRelevantChanges: medicalChanged || filesChanged,
    };
  };

  // ─────────────────────────────────────────────
  // Validation helpers (mirror AddPatient)
  // ─────────────────────────────────────────────
  const step1ErrorFields = ["fullName", "email", "phone", "age", "nationalId", "gender"];
  const hasStep1Errors = Object.keys(fieldErrors).some((k) => step1ErrorFields.includes(k));
  const isStep1Valid =
    formData.fullName.trim() &&
    (formData.email.trim() || formData.phone.trim()) &&
    formData.age &&
    selectedGender &&
    formData.nationalId.trim() &&
    !hasStep1Errors;

  const isStep2Valid = !(hasSurgeries === true && !formData.surgeryText.trim());

  // ─────────────────────────────────────────────
  // Input handlers
  // ─────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    let newValue = value;
    const newErrors = { ...fieldErrors };

    if (id === "phone" || id === "nationalId" || id === "age") {
      newValue = value.replace(/\D/g, "");
    } else if (id === "fullName") {
      newValue = value.replace(/[0-9]/g, "");
    }

    if (newErrors[id]) delete newErrors[id];
    setFieldErrors(newErrors);
    setFormData((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleSmokerSelect = (value) => setIsSmoker(value === "yes");
  const handleSurgerySelect = (value) => {
    const isYes = value === "yes";
    setHasSurgeries(isYes);
    if (!isYes) {
      setFormData((prev) => ({ ...prev, surgeryText: "" }));
      setFieldErrors((prev) => { const n = { ...prev }; delete n.surgeryText; return n; });
    }
  };

  const handleChronicDiseaseToggle = (value) => {
    setSelectedChronicDiseases((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  // ─────────────────────────────────────────────
  // File handlers
  // ─────────────────────────────────────────────

  const handleNewFiles = (category, files) => {
    const validEntries = Array.from(files)
      .filter((file) => {
        const ext = "." + file.name.split(".").pop().toLowerCase();
        return ALLOWED_EXTS_EDIT.includes(ext) && file.size <= 10 * 1024 * 1024;
      })
      .map((file) => ({ file, blobUrl: URL.createObjectURL(file) }));
    if (validEntries.length > 0) {
      const errorKey = category === "history" ? "medical_history" : category;
      setFieldErrors((prev) => { const n = { ...prev }; delete n[errorKey]; return n; });
    }
    setFileManager((prev) => ({ ...prev, [category]: [...prev[category], ...validEntries] }));
  };

  const handleFileInputChange = (category, e) => {
    handleNewFiles(category, e.target.files);
    e.target.value = "";
  };

  const removeNewFile = (category, index) => {
    const entry = fileManager[category][index];
    if (entry?.blobUrl) URL.revokeObjectURL(entry.blobUrl);
    setFileManager((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const toggleRemoveExisting = (fileId) => {
    setRemovedExistingIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId); // undo remove
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  // ─────────────────────────────────────────────
  // Step navigation
  // ─────────────────────────────────────────────
  const goToStep = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep1Next = () => {
    setFieldErrors({});
    goToStep(2);
  };

  // ─────────────────────────────────────────────
  // Backend error parsing (reused from AddPatient)
  // ─────────────────────────────────────────────
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
        const baseKey = backendKey.split(".")[0];
        const frontendKey = backendFieldMap[baseKey] || baseKey;
        if (!newFieldErrors[frontendKey]) {
          newFieldErrors[frontendKey] = Array.isArray(messages) ? messages[0] : messages;
        }
      });
    }
    const message = result.message || "";
    if (message.includes("users_phone_unique") || (message.includes("Duplicate entry") && message.includes("phone"))) {
      newFieldErrors.phone = "Phone number already exists.";
    }
    if (message.includes("users_email_unique") || (message.includes("Duplicate entry") && message.includes("email"))) {
      newFieldErrors.email = "Email already exists.";
    }
    if (message.includes("national_id") && message.includes("Duplicate entry")) {
      newFieldErrors.nationalId = "National ID already exists.";
    }
    return newFieldErrors;
  };

  const navigateToErrorStep = (errors) => {
    const step1Fields = ["fullName", "email", "phone", "age", "nationalId", "gender", "is_smoker"];
    const step2Fields = ["surgeryText", "previous_surgeries", "previous_surgeries_name", "chronic_diseases", "medications", "allergies", "familyHistory", "ChiefComplaint"];
    const step3Fields = ["lab", "radiology", "medical_history"];
    const errorKeys = Object.keys(errors);
    for (const key of errorKeys) {
      if (step1Fields.includes(key)) { goToStep(1); return; }
    }
    for (const key of errorKeys) {
      if (step2Fields.includes(key)) { goToStep(2); return; }
    }
    for (const key of errorKeys) {
      if (step3Fields.includes(key)) { goToStep(3); return; }
    }
  };

  // ─────────────────────────────────────────────
  // Submit / save
  // ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsProcessing(true);
    setFieldErrors({});

    try {
      const apiFormData = new FormData();

      // Laravel method spoofing
      apiFormData.append("_method", "PUT");

      // Personal info
      apiFormData.append("name", formData.fullName);
      if (formData.email.trim()) apiFormData.append("email", formData.email);
      if (formData.phone.trim()) apiFormData.append("phone", formData.phone);
      apiFormData.append("age", formData.age);
      apiFormData.append("gender", selectedGender);
      apiFormData.append("national_id", formData.nationalId);

      // Medical history
      apiFormData.append("is_smoker", isSmoker ? "1" : "0");
      apiFormData.append("previous_surgeries", hasSurgeries ? "1" : "0");
      if (hasSurgeries) {
        apiFormData.append("previous_surgeries_name", formData.surgeryText || "");
      }

      if (selectedChronicDiseases.length > 0) {
        selectedChronicDiseases.forEach((disease) => {
          apiFormData.append("chronic_diseases[]", disease);
        });
      }

      apiFormData.append("medications", formData.medications || "");
      apiFormData.append("allergies", formData.allergies || "");
      apiFormData.append("family_history", formData.familyHistory || "");
      apiFormData.append("current_complaint", formData.ChiefComplaint || "");

      // Preserve existing AI outputs so backend doesn't wipe them
      if (originalSnapshot?.medicalHistory?.ai_summary) {
        apiFormData.append("ai_summary", originalSnapshot.medicalHistory.ai_summary);
      }
      if (originalSnapshot?.medicalHistory?.smart_summary) {
        apiFormData.append("smart_summary", originalSnapshot.medicalHistory.smart_summary);
      }
      if (originalSnapshot?.medicalHistory?.key_points) {
        apiFormData.append("key_points", typeof originalSnapshot.medicalHistory.key_points === 'string' ? originalSnapshot.medicalHistory.key_points : JSON.stringify(originalSnapshot.medicalHistory.key_points));
      }
      if (originalSnapshot?.medicalHistory?.key_important_information) {
        apiFormData.append("key_important_information", typeof originalSnapshot.medicalHistory.key_important_information === 'string' ? originalSnapshot.medicalHistory.key_important_information : JSON.stringify(originalSnapshot.medicalHistory.key_important_information));
      }

      // Removed existing file IDs
      removedExistingIds.forEach((id) => {
        apiFormData.append("removed_files[]", id);
      });

      // New uploaded files
      fileManager.lab.forEach((entry) => apiFormData.append("lab[]", entry.file));
      fileManager.history.forEach((entry) => apiFormData.append("medical_history[]", entry.file));
      fileManager.radiology.forEach((entry) => apiFormData.append("radiology[]", entry.file));

      const result = await updatePatientAPI(patientId, apiFormData);

      if (result.success) {
        const { hasAiRelevantChanges } = computeChanges();

        if (hasAiRelevantChanges) {
          // AI-relevant data changed — go to loading screen so AI reprocesses
          const token = getCookie("user_token");
          setPollingInfo({ patientId: Number(patientId), token });
          setShowProcessingScreen(true);
        } else {
          // Only personal info changed — no AI needed, go back to profile
          setSuccessToast("Patient file updated successfully.");
          setTimeout(() => setSuccessToast(null), 4000);
          setTimeout(() => {
            navigate(`/patient-profile/${patientId}`);
          }, 1200);
        }
      } else {
        const newFieldErrors = extractFieldErrors(result);
        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);
          navigateToErrorStep(newFieldErrors);
        } else {
          setFieldErrors({ _general: result.message || "Failed to update patient. Please try again." });
        }
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("[edit-patient] submit error:", err);
      setFieldErrors({ _general: "An unexpected error occurred. Please try again." });
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────

  // Group existing files by category for display in Step 3
  const existingByCategory = (category) =>
    existingFiles.filter((f) => fileTypeToCategory(f.type) === category);

  // ─────────────────────────────────────────────
  // Loading / Error states
  // ─────────────────────────────────────────────
  if (isFetching) {
    return (
      <div>
        <div className="background-pattern"></div>
        <Sidebar activePage="addpatient" />
        <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
          <div className="wizard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "16px" }}>
            <svg style={{ animation: "spin 1s linear infinite", width: "40px", height: "40px", color: "#2A66FF" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p style={{ color: "#6B7280", fontSize: "16px" }}>Loading patient data…</p>
          </div>
        </main>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <div className="background-pattern"></div>
        <Sidebar activePage="addpatient" />
        <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
          <div className="wizard-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "16px" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="1" />
            </svg>
            <p style={{ color: "#991B1B", fontSize: "16px", fontWeight: "600" }}>Failed to load patient data</p>
            <p style={{ color: "#6B7280", fontSize: "14px" }}>{fetchError}</p>
            <button className="next" onClick={() => navigate(-1)} style={{ marginTop: "8px" }}>Go Back</button>
          </div>
        </main>
      </div>
    );
  }

  if (showProcessingScreen) {
    return (
      <ProcessingReports 
        patientId={pollingInfo.patientId} 
        token={pollingInfo.token}
        onSuccess={(data) => {
          navigate(`/patient-profile/${pollingInfo.patientId}`, {
            state: { keyInfoData: data, patientId: pollingInfo.patientId }
          });
        }}
        onFailure={(msg) => {
          setShowProcessingScreen(false);
          setIsProcessing(false);
          setFieldErrors({ _general: msg || "AI analysis failed. Please try again." });
          goToStep(3); // return to upload step
        }}
      />
    );
  }

  // ─────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────
  return (
    <div>
      <div className="background-pattern"></div>
      <div className="ai-waves">
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
      </div>

      <Sidebar activePage="addpatient" />

      {/* Top Navbar */}
     <Navbar
  isSidebarCollapsed={isSidebarCollapsed}
  credits={credits}
  isCreditsLoading={isCreditsLoading}
  unreadCount={unreadCount}
  getDoctorInitials={getDoctorInitials}
  openNotifications={openNotifications}
  setIsLogoutModalOpen={setIsLogoutModalOpen}
/>

      <LogoutConfirmation isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />

      {/* Success Toast */}
      {successToast && (
        <div className="edit-success-toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successToast}
        </div>
      )}

      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="page-header"></div>

        <div className="wizard-card">
          {/* Wizard header with step indicator */}
          <div className="wizard-header">
            <div className="wizard-mode-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Mode
            </div>
            <div className="step-indicator">
              <div className={`step-item ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
                <div className="step-circle">
                  {currentStep > 1 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : "01"}
                </div>
                <span className="step-label">Patient Info</span>
              </div>
              <div className={`step-connector ${currentStep > 1 ? "completed" : ""}`}></div>
              <div className={`step-item ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
                <div className="step-circle">
                  {currentStep > 2 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
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

            {/* Global error banner */}
            {fieldErrors._general && (
              <div style={{ padding: "12px 16px", marginBottom: "20px", backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: "8px", color: "#991B1B", fontSize: "14px" }}>
                {fieldErrors._general}
              </div>
            )}

            {/* ─── STEP 1: Patient Info ─── */}
            <div className={`step-content ${currentStep === 1 ? "active" : ""}`}>
              <div className="step-header">
                <h2 className="step-title">Patient Personal Information</h2>
                <p className="step-subtitle">Update basic patient details</p>
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
                  {fieldErrors.fullName && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.fullName}</div>}
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
                  {fieldErrors.email && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.email}</div>}
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
                  {fieldErrors.age && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.age}</div>}
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
                        {[{ value: "male", label: "Male" }, { value: "female", label: "Female" }].map((opt) => (
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
                  {fieldErrors.phone && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.phone}</div>}
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
                  {fieldErrors.nationalId && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.nationalId}</div>}
                </div>

              </div>

              <div className="wizard-actions">
                <button className="back" onClick={() => navigate(`/patient-profile/${patientId}`)}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button className="next" disabled={!isStep1Valid} onClick={handleStep1Next}>
                  Next Step
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ─── STEP 2: Medical History ─── */}
            <div className={`step-content ${currentStep === 2 ? "active" : ""}`}>
              <div className="step-header">
                <h2 className="step-title">Medical History Intake</h2>
                <p className="step-subtitle">Update the medical questionnaire (optional)</p>
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
                  {CHRONIC_DISEASE_OPTIONS.map((disease) => (
                    <div
                      key={disease}
                      className={`pill ${selectedChronicDiseases.includes(disease) ? "selected" : ""}`}
                      onClick={() => handleChronicDiseaseToggle(disease)}
                    >
                      {diseaseLabel(disease)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-divider"></div>

              {hasSurgeries && (
                <div className="form-group" id="surgeryDetails">
                  <label className="form-label required">
                    Please specify surgeries <span className="provided-hint">Provided</span>
                  </label>
                  <textarea
                    className={`form-textarea${fieldErrors.surgeryText ? " target-error" : ""}`}
                    id="surgeryText"
                    placeholder="List previous surgeries and approximate dates..."
                    value={formData.surgeryText}
                    onChange={handleInputChange}
                  ></textarea>
                  {fieldErrors.surgeryText && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px" }}>{fieldErrors.surgeryText}</div>}
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
                <textarea className="form-textarea" id="familyHistory" placeholder="Note any relevant family history..." value={formData.familyHistory} onChange={handleInputChange}></textarea>
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

            {/* ─── STEP 3: Upload Medical Documents ─── */}
            <div className={`step-content ${currentStep === 3 ? "active" : ""}`}>
              <div className="step-header">
                <h2 className="step-title">Upload Medical Documents</h2>
                <p className="step-subtitle">
                  Manage existing files and upload new documents for AI analysis
                </p>
              </div>

              <div className="upload-cards-grid">
                {["lab", "history", "radiology"].map((category) => {
                  const catExisting = existingByCategory(category);
                  const catLabel = category === "lab" ? "Lab" : category === "history" ? "History" : "Radiology";
                  const catTitle = category === "lab" ? "Lab Tests" : category === "history" ? "Medical History" : "Radiology Reports";
                  const catSub = category === "lab"
                    ? "Blood work, urinalysis, biochemistry panels"
                    : category === "history"
                    ? "Patient records, visit notes, prescriptions"
                    : "X-rays, CT scans, MRI, DICOM images";

                  return (
                    <div key={category} className="upload-card">
                      <div className="upload-card-header">
                        <div className="upload-card-title">
                          <span className={`category-badge ${category}`}>{catLabel}</span>
                          <h4>{catTitle}</h4>
                        </div>
                        <p className="upload-card-subtitle">{catSub}</p>
                      </div>

                      {/* Existing files from backend */}
                      {catExisting.length > 0 && (
                        <div className="existing-files-section">
                          <p className="existing-files-label">Saved files</p>
                          <div className="uploaded-files-list">
                            {catExisting.map((file) => {
                              const isRemoved = removedExistingIds.has(file.id);
                              return (
                                <UploadFileItem
                                  key={file.id}
                                  fileName={file.name}
                                  viewUrl={file.url}
                                  isRemoved={isRemoved}
                                  onRemove={() => toggleRemoveExisting(file.id)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* New file drop zone */}
                      <div
                        className="dropzone"
                        data-category={category}
                        onClick={() => document.getElementById(`edit-${category}Input`).click()}
                      >
                        <svg className="dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div className="dropzone-text">Click to upload or drag files</div>
                        <div className="dropzone-formats">PDF, JPG (Max 10MB)</div>
                      </div>

                      <input
                        type="file"
                        className="file-input-hidden"
                        id={`edit-${category}Input`}
                        multiple
                        accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg"
                        onChange={(e) => handleFileInputChange(category, e)}
                      />

                      {/* Newly added files */}
                      <div className="uploaded-files-list">
                        {fileManager[category].map((entry, index) => (
                          <UploadFileItem
                            key={index}
                            fileName={entry.file.name}
                            viewUrl={entry.blobUrl}
                            onRemove={() => removeNewFile(category, index)}
                            style={{ borderColor: "#BBF7D0", background: "#F0FDF4" }}
                          />
                        ))}
                      </div>

                    </div>
                  );
                })}
              </div>

              {(fieldErrors.lab || fieldErrors.radiology || fieldErrors.medical_history) && (
                <div style={{ color: "#EF4444", fontSize: "14px", marginBottom: "20px", textAlign: "center", fontWeight: "500", backgroundColor: "#FEF2F2", padding: "12px", borderRadius: "8px", border: "1px dashed #FCA5A5" }}>
                  {fieldErrors.lab || fieldErrors.radiology || fieldErrors.medical_history}
                </div>
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
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <svg style={{ animation: "spin 1s linear infinite", width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
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

export default EditPatient;
