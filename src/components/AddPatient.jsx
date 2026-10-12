import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { addPatientAPI, getPatientOverviewAPI, updatePatientAPI, getPatientForEditAPI } from "./mockAPI";
import UploadFileItem from "./UploadFileItem";
import ProcessingReports from "../components/ProcessingReports";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../css/AddPatient.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import { useNotifications } from "./NotificationsContext";
import { getDoctorInitials } from "./Dashboard";
import { useTranscription } from "../hooks/useTranscription";
import { getDirection, getTextAlign } from "../utils/textUtils";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import diagnobotCryingImg from "../assets/Diagnobot_Crying.png";
import Unauthorized from "./Unauthorized";

const AddPatient = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();
  const isEditMode = !!patientId;
  const patientState = location.state?.patientData;
  const [isFetching, setIsFetching] = useState(isEditMode && !patientState);
  const [notFound, setNotFound] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, message: "", isSuccess: false });
  const showToast = (message, isSuccess) => {
    setToast({ isOpen: true, message, isSuccess });
    setTimeout(() => {
      setToast({ isOpen: false, message: "", isSuccess: false });
    }, 5000);
  };
  const [currentStep, setCurrentStep] = useState(1);
  const { unreadCount, openNotifications, triggerToast } = useNotifications();
  const [showProcessingScreen, setShowProcessingScreen] = useState(false);
  const [pollingInfo, setPollingInfo] = useState({
    patientId: null,
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
  const { credits, isCreditsLoading, refreshCredits, subscriptionData } = useSubscription();

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
    contact: "",
    date_of_birth: "",
    national_id: "",
    surgeryText: "",
    medications: "",
    allergies: "",
    familyHistory: "",
    ChiefComplaint: "",
  });

  const [initialData, setInitialData] = useState(null);

  // Helper to check if AI related fields changed
  const checkAiFieldsChanged = () => {
    if (!initialData) return false;
    
    if (isSmoker !== initialData.isSmoker) return true;
    if (hasSurgeries !== initialData.hasSurgeries) return true;
    if (formData.surgeryText !== initialData.surgeryText) return true;
    if (formData.medications !== initialData.medications) return true;
    if (formData.allergies !== initialData.allergies) return true;
    if (formData.familyHistory !== initialData.familyHistory) return true;
    if (formData.ChiefComplaint !== initialData.ChiefComplaint) return true;
    
    if (selectedChronicDiseases.length !== initialData.chronicDiseases.length) return true;
    const sortedSelected = [...selectedChronicDiseases].sort();
    const sortedInitial = [...initialData.chronicDiseases].sort();
    for (let i = 0; i < sortedSelected.length; i++) {
      if (sortedSelected[i] !== sortedInitial[i]) return true;
    }
    
    const hasNewFiles = 
      fileManager.lab.some(f => f.file) ||
      fileManager.history.some(f => f.file) ||
      fileManager.radiology.some(f => f.file);
      
    if (hasNewFiles) return true;

    const currentFilesCount = fileManager.lab.length + fileManager.history.length + fileManager.radiology.length;
    if (currentFilesCount !== initialData.existingFilesCount) return true;

    return false;
  };

  // Only block Step 1's Next button for Step 1-specific field errors.
  // Errors from other steps (step 2/3) or _general must NOT block Step 1.
  const step1ErrorFields = [
    "fullName",
    "contact",
    "date_of_birth",
    "national_id",
    "gender",
    "is_smoker",
  ];
  const hasStep1Errors = Object.keys(fieldErrors).some((k) =>
    step1ErrorFields.includes(k),
  );

  const isStep1Valid = (() => {
    const isFullNameValid = String(formData.fullName || "").trim().length > 0;
    const isContactValid = String(formData.contact || "").trim().length > 0;
    const isNationalIdValid = String(formData.national_id || "").trim().length === 14;
    let isDobValid = false;
    if (formData.date_of_birth) {
      const datePart = String(formData.date_of_birth).split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const currDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0,0,0,0);
        isDobValid = currDate <= today;
      }
    }
    return isFullNameValid && isContactValid && isDobValid && selectedGender && isNationalIdValid;
  })();

  console.log("[step1] nextDisabled", {
    currentStep,
    nextDisabled: !isStep1Valid,
    hasErrors: hasStep1Errors,
    national_id: formData.national_id,
    err: fieldErrors.national_id,
  });

  // Step 2 is valid unless surgeries=YES and the name field is empty
  const isStep2Valid = !(hasSurgeries === true && !String(formData.surgeryText || "").trim());

  console.log("[step2] surgeries validation", {
    hasSurgeries,
    surgeryText: formData.surgeryText,
    canNext: isStep2Valid,
  });

  const fetchedPatientIdRef = useRef(null);

  useEffect(() => {
    if (!isEditMode) return;
    if (fetchedPatientIdRef.current === patientId) return;
    fetchedPatientIdRef.current = patientId;

    let active = true;
    
    const fetchPatient = async () => {
      try {
        setIsFetching(true);
        
        // Clear old data to prevent stale states
        setFormData({
          fullName: "",
          contact: "",
          date_of_birth: "",
          national_id: "",
          surgeryText: "",
          medications: "",
          allergies: "",
          familyHistory: "",
          ChiefComplaint: "",
        });
        setSelectedGender(null);
        setIsSmoker(null);
        setHasSurgeries(null);
        setSelectedChronicDiseases([]);
        setFileManager({ lab: [], history: [], radiology: [] });

        const res = await getPatientForEditAPI(patientId);

        // Do not use `if (!active) return;` here, as the strict mode cleanup
        // sets active=false but the second setup skips fetch, leaving us stuck in loading!

        if (res.success && res.data) {
          const d = res.data;
          const pi = d?.personal_info || d;
          const mh = d?.medical_history || d;

          const name = pi.name || pi.patientName || pi.full_name || pi.patient_name || "";
          const contact = pi.contact || pi.email || pi.phone || "";
          const dob = pi.date_of_birth || pi.age || pi.dob || "";
          const national_id = pi.national_id || pi.patientId || "";
          const gender = pi.gender || "";

          const is_smoker = mh.is_smoker ?? mh.smoker ?? null;
          const prev_surgeries = mh.previous_surgeries_name ?? mh.previousSurgeries ?? "";
          const has_surgeries = mh.previous_surgeries ?? !!prev_surgeries;
          const chronic_diseases = mh.chronic_diseases ?? mh.chronicDiseases ?? [];
          const medications = mh.current_medications ?? mh.medications ?? "";
          const allergies = mh.allergies ?? "";
          const family_history = mh.family_history ?? mh.familyHistory ?? "";
          const chief_complaint = mh.current_complaints ?? mh.current_complaint ?? mh.chief_complaint ?? mh.chiefComplaint ?? "";

          setFormData((prev) => ({
            ...prev,
            fullName: name,
            contact: contact,
            date_of_birth: dob,
            national_id: national_id,
            surgeryText: prev_surgeries,
            medications: medications,
            allergies: allergies,
            familyHistory: family_history,
            ChiefComplaint: chief_complaint,
          }));
          setSelectedGender(gender || null);
          
          let parsedIsSmoker = null;
          if (is_smoker !== null) {
            const smokerStr = String(is_smoker).toLowerCase();
            parsedIsSmoker = (!!is_smoker && smokerStr !== "false" && smokerStr !== "no" && smokerStr !== "0");
            setIsSmoker(parsedIsSmoker);
          }
          const parsedHasSurgeries = has_surgeries !== null ? !!has_surgeries : null;
          if (parsedHasSurgeries !== null) setHasSurgeries(parsedHasSurgeries);
          const parsedChronicDiseases = Array.isArray(chronic_diseases) ? chronic_diseases : [];
          setSelectedChronicDiseases(parsedChronicDiseases);

          let existingFilesCount = 0;
          if (d.existing_files && Array.isArray(d.existing_files)) {
            existingFilesCount = d.existing_files.length;
            const existingLab = [];
            const existingHistory = [];
            const existingRadiology = [];
            
            d.existing_files.forEach(file => {
              if (file.type === 'lab') existingLab.push(file);
              else if (file.type === 'history' || file.type === 'medical_history') existingHistory.push(file);
              else if (file.type === 'radiology') existingRadiology.push(file);
            });
            
            setFileManager(prev => ({
              ...prev,
              lab: [...existingLab, ...prev.lab],
              history: [...existingHistory, ...prev.history],
              radiology: [...existingRadiology, ...prev.radiology],
            }));
          }
          
          setInitialData({
            isSmoker: parsedIsSmoker,
            hasSurgeries: parsedHasSurgeries,
            surgeryText: prev_surgeries,
            chronicDiseases: parsedChronicDiseases,
            medications: medications,
            allergies: allergies,
            familyHistory: family_history,
            ChiefComplaint: chief_complaint,
            existingFilesCount: existingFilesCount
          });
        } else if (res.success === false) {
          const isNotFound = res.status === 404 || (res.message && res.message.toLowerCase().includes("not found"));
          const isForbidden = res.status === 403 || res.status === 401 || (res.message && (res.message.toLowerCase().includes("unauthorized") || res.message.toLowerCase().includes("forbidden") || res.message.toLowerCase().includes("this action is unauthorized")));
          if (isNotFound) {
            setNotFound(true);
          } else if (isForbidden) {
            setIsUnauthorized(true);
          } else {
            setFieldErrors((prev) => ({
              ...prev,
              _general: res.message || "Failed to load patient data.",
            }));
          }
        }
      } catch (err) {
        console.error("Error mapping patient data:", err);
        setFieldErrors((prev) => ({
          ...prev,
          _general: "An error occurred while loading patient data.",
        }));
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchPatient();
    
    return () => {
      active = false;
    };
  }, [isEditMode, patientId]);

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
      contact: "contact",
      name: "fullName",
      date_of_birth: "date_of_birth",
      gender: "gender",
      is_smoker: "is_smoker",
      previous_surgeries_name: "surgeryText",
      chronic_diseases: "chronic_diseases",
      current_medications: "medications",
      allergies: "allergies",
      family_history: "familyHistory",
      current_complaints: "ChiefComplaint",
      lab: "lab",
      radiology: "radiology",
      medical_history: "medical_history",
    };

    const newFieldErrors = {};
    const errorsSource = result.errors || (result.data && typeof result.data === 'object' && !Array.isArray(result.data) ? result.data : null);

    if (errorsSource) {
      Object.entries(errorsSource).forEach(([backendKey, messages]) => {
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
      !newFieldErrors.contact &&
      (message.includes("users_contact_unique") ||
      (message.includes("Duplicate entry") && message.includes("contact")) ||
      message.includes("contact has already been taken") ||
      (result.errors && result.errors.contact && result.errors.contact[0].includes("already been taken")))
    ) {
      newFieldErrors.contact = "Contact already exists.";
    }

    if (
      !newFieldErrors.national_id &&
      message.includes("national_id") &&
      message.includes("Duplicate entry")
    ) {
      newFieldErrors.national_id = "National ID already exists.";
    }

    return newFieldErrors;
  };

  // Determine which step contains the first error and navigate to it.
  // All errors are kept in state; only the *current step* changes.
  const navigateToErrorStep = (errors) => {
    const step1Fields = [
      "fullName",
      "contact",
      "date_of_birth",
      "national_id",
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

    if (newErrors[id]) {
      delete newErrors[id];
    }

    if (id === "fullName") {
      const hasDigits = /\d/.test(value);
      newValue = value.replace(/\d/g, "");
      if (hasDigits) {
        newErrors.fullName = "Full name must contain letters only.";
        setTimeout(() => {
          setFieldErrors((prev) => {
            if (prev.fullName === "Full name must contain letters only.") {
              const next = { ...prev };
              delete next.fullName;
              return next;
            }
            return prev;
          });
        }, 2500);
      }
    }

    if (id === "national_id") {
      const hasNonDigits = /\D/.test(value);
      newValue = value.replace(/\D/g, "").slice(0, 14);

      if (hasNonDigits) {
        newErrors.national_id = "National ID must contain digits only.";
        setTimeout(() => {
          setFieldErrors((prev) => {
            if (prev.national_id === "National ID must contain digits only.") {
              const next = { ...prev };
              // Fallback to length validation if it was just cleared
              if (newValue && newValue.length !== 14) {
                next.national_id = "National ID must be exactly 14 digits.";
              } else {
                delete next.national_id;
              }
              return next;
            }
            return prev;
          });
        }, 2500);
      } else if (newValue && newValue.length !== 14) {
        newErrors.national_id = "National ID must be exactly 14 digits.";
      }
    }

    if (id === "date_of_birth") {
      if (newValue) {
        const datePart = newValue.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          const dobDate = new Date(year, month - 1, day);
          const isValid = dobDate.getFullYear() == year && dobDate.getMonth() == month - 1 && dobDate.getDate() == day;
          
          if (!isValid) {
            newErrors.date_of_birth = "Invalid date.";
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dobDate > today) {
              newErrors.date_of_birth = "Date of birth cannot be in the future.";
            }
          }
        }
      }
    }

    setFieldErrors(newErrors);
    setFormData((prev) => ({ ...prev, [id]: newValue }));
  };

  const handleSmokerSelect = (value) => setIsSmoker(value === "yes");
  const handleSurgerySelect = (value) => {
    const isYes = value === "yes";
    setHasSurgeries(isYes);
    if (!isYes) {
      // Intentionally NOT clearing formData.surgeryText here
      // so the value is preserved if the user toggles back to Yes.
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
    let hasInvalidFiles = false;

    const validEntries = Array.from(files)
      .filter((file) => {
        const isValidType = file.type === "application/pdf" || file.type === "image/jpeg";
        const isValidSize = file.size <= 10485760; // 10MB
        if (!isValidType || !isValidSize) {
          hasInvalidFiles = true;
          return false;
        }
        return true;
      })
      .map((file) => ({ file, blobUrl: URL.createObjectURL(file) }));

    if (hasInvalidFiles) {
      triggerToast({
        title: "Validation Error",
        message: "Invalid file. Please upload only PDF or JPG files under 10MB.",
        isFrontendOnly: true
      });
    }

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
    try {
      let newErrors = {};

      if (/\d/.test(formData.fullName || "")) {
        newErrors.fullName = "Full name must contain letters only.";
      }

      if (formData.national_id && String(formData.national_id).length !== 14) {
        newErrors.national_id = "National ID must be exactly 14 digits.";
      }

      if (formData.date_of_birth) {
        const datePart = String(formData.date_of_birth).split('T')[0];
        const [year, month, day] = datePart.split('-');
        const dobDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dobDate > today) {
          newErrors.date_of_birth = "Date of birth cannot be in the future.";
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...newErrors }));
        return;
      }

      setFieldErrors({});
      goToStep(2);
    } catch (error) {
      console.error("Step 1 Transition Error:", error);
      setFieldErrors((prev) => ({ ...prev, _general: "An error occurred validating the step. Please check your inputs." }));
    }
  };

  const handleProcess = async () => {
    const isPayPerUse =
      subscriptionData?.billing_mode === "pay_per_use" ||
      subscriptionData?.billing_mode === "pay-per-use";
    const isSubscription = subscriptionData?.billing_mode === "subscription";
    const hasActivePlan =
      (isSubscription || isPayPerUse) &&
      (!subscriptionData?.status || subscriptionData.status.toLowerCase() === "active");

    if (!hasActivePlan) {
      setFieldErrors({
        _general: "Active subscription required. Please upgrade your plan to process and analyze reports.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // If patient already created successfully but AI analysis failed, we can retry the AI analysis directly
    if (!isEditMode && pollingInfo.patientId) {
      setIsProcessing(true);
      setFieldErrors({});
      setShowProcessingScreen(true);
      return;
    }

    setIsProcessing(true);
    setFieldErrors({});

    const totalFiles =
      fileManager.lab.length +
      fileManager.history.length +
      fileManager.radiology.length;

    if (!isEditMode && totalFiles === 0) {
      setFieldErrors({
        lab: "Please upload at least one lab test result or radiology report or medical history report.",
      });
      setIsProcessing(false);
      return;
    }

    try {
      const apiFormData = new FormData();

      if (isEditMode) {
        apiFormData.append("_method", "PATCH");
      }

      apiFormData.append("name", formData.fullName);

      if (String(formData.contact || "").trim()) {
        apiFormData.append("contact", String(formData.contact || "").trim());
      }

      if (formData.date_of_birth) {
        apiFormData.append("date_of_birth", formData.date_of_birth);
      }

      if (selectedGender) {
        apiFormData.append("gender", selectedGender);
      }

      if (String(formData.national_id || "").trim()) {
        apiFormData.append("national_id", String(formData.national_id || "").trim());
      }

      if (isEditMode && initialData) {
        if (isSmoker !== null && isSmoker !== initialData.isSmoker) {
          apiFormData.append("is_smoker", isSmoker ? "1" : "0");
        }

        if (hasSurgeries !== null && hasSurgeries !== initialData.hasSurgeries) {
          apiFormData.append("previous_surgeries", hasSurgeries ? "1" : "0");
        }

        if (hasSurgeries && formData.surgeryText !== initialData.surgeryText) {
          apiFormData.append("previous_surgeries_name", formData.surgeryText);
        }

        const sortedSelected = [...selectedChronicDiseases].sort();
        const sortedInitial = [...(initialData.chronicDiseases || [])].sort();
        const chronicDiseasesChanged = 
          sortedSelected.length !== sortedInitial.length || 
          sortedSelected.some((val, i) => val !== sortedInitial[i]);

        if (chronicDiseasesChanged) {
          if (selectedChronicDiseases.length > 0) {
            selectedChronicDiseases.forEach((disease) => {
              apiFormData.append("chronic_diseases[]", disease);
            });
          } else {
            apiFormData.append("chronic_diseases", "");
          }
        }

        if (formData.medications !== initialData.medications) {
          apiFormData.append("current_medications", formData.medications);
        }
        if (formData.allergies !== initialData.allergies) {
          apiFormData.append("allergies", formData.allergies);
        }
        if (formData.familyHistory !== initialData.familyHistory) {
          apiFormData.append("family_history", formData.familyHistory);
        }
        if (formData.ChiefComplaint !== initialData.ChiefComplaint) {
          apiFormData.append("current_complaints", formData.ChiefComplaint);
        }
      } else {
        if (isSmoker !== null) {
          apiFormData.append("is_smoker", isSmoker ? "1" : "0");
        }

        if (hasSurgeries !== null) {
          apiFormData.append("previous_surgeries", hasSurgeries ? "1" : "0");
        }

        if (hasSurgeries && formData.surgeryText) {
          apiFormData.append("previous_surgeries_name", formData.surgeryText);
        }

        if (selectedChronicDiseases.length > 0) {
          selectedChronicDiseases.forEach((disease) => {
            apiFormData.append("chronic_diseases[]", disease);
          });
        }

        if (formData.medications) {
          apiFormData.append("current_medications", formData.medications);
        }
        if (formData.allergies) {
          apiFormData.append("allergies", formData.allergies);
        }
        if (formData.familyHistory) {
          apiFormData.append("family_history", formData.familyHistory);
        }
        if (formData.ChiefComplaint) {
          apiFormData.append("current_complaints", formData.ChiefComplaint);
        }
      }

      fileManager.lab.filter(entry => entry.file instanceof File).forEach((entry) =>
        apiFormData.append("lab[]", entry.file),
      );
      fileManager.history.filter(entry => entry.file instanceof File).forEach((entry) =>
        apiFormData.append("medical_history[]", entry.file),
      );
      fileManager.radiology.filter(entry => entry.file instanceof File).forEach((entry) =>
        apiFormData.append("radiology[]", entry.file),
      );

      const result = isEditMode 
        ? await updatePatientAPI(patientId, apiFormData)
        : await addPatientAPI(apiFormData);
      console.log(isEditMode ? "Update Patient Result:" : "Add Patient Result:", result);

      if (result.success) {
        if (isEditMode) {
          showToast(result.message || "Patient file updated successfully.", true);
          window.dispatchEvent(new CustomEvent("patientListInvalidated"));
          window.dispatchEvent(new CustomEvent("dashboardInvalidated"));
          
          if (checkAiFieldsChanged()) {
            setPollingInfo({ patientId: patientId });
            setShowProcessingScreen(true);
            return;
          } else {
            setTimeout(() => {
              navigate(`/patient-profile/${patientId}`);
            }, 4000);
            return;
          }
        }

        localStorage.setItem(
          "currentPatient",
          JSON.stringify({
            patient_id: result.patient_id,
            patientInfo: {
              fullName: formData.fullName,
              date_of_birth: formData.date_of_birth,
              gender: selectedGender,
              contact: formData.contact,
              national_id: formData.national_id,
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

        setPollingInfo({ patientId: result.patient_id });
        setShowProcessingScreen(true);
      } else {
        if (isEditMode) {
          showToast(result.message || "Failed to update patient file. Please try again.", false);
        }

        // Log the raw 422 body so we can see every field the backend flagged
        console.log("[add-patient] 422 raw response:", {
          message: result.message,
          errors: result.errors,
        });

        if (result.status === 401) {
          setFieldErrors({
            _general: result.message || result.errors || "Session expired or unauthorized. Please log in again.",
          });
          setIsProcessing(false);
          return;
        }

        if (result.status === 403 || result.message === "This action is unauthorized.") {
          setIsProcessing(false);
          
          const isPayPerUse =
            subscriptionData?.billing_mode === "pay_per_use" ||
            subscriptionData?.billing_mode === "pay-per-use";
          const isSubscription = subscriptionData?.billing_mode === "subscription";
          const hasActivePlan =
            (isSubscription || isPayPerUse) &&
            (!subscriptionData?.status || subscriptionData.status.toLowerCase() === "active");

          if (!hasActivePlan || result.message?.toLowerCase().includes("subscription") || result.message?.toLowerCase().includes("plan")) {
            setFieldErrors({
              _general: "Active subscription required. Please upgrade your plan to perform this action.",
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }

          navigate("/unauthorized");
          return;
        }

        if (result.status >= 500) {
          setFieldErrors({
            _general: result.message || "An internal server error occurred.",
          });
          setIsProcessing(false);
          return;
        }

        const newFieldErrors = extractFieldErrors(result);

        if (Object.keys(newFieldErrors).length > 0) {
          // Store ALL parsed errors at once — user sees every highlighted field
          // across steps without needing multiple re-submits
          if (
            result.message &&
            result.message !== "Validation Errors" &&
            result.message !== "The given data was invalid." &&
            !result.message.includes("validation") &&
            !result.message.includes("invalid")
          ) {
            newFieldErrors._general = result.message;
          }
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
        onSuccess={(data) => {
          navigate(`/patient-profile/${pollingInfo.patientId}`, {
            state: {
              keyInfoData: data,
              patientId: pollingInfo.patientId,
            },
          });
        }}
        onFailure={(msg) => {
          setShowProcessingScreen(false);
          setIsProcessing(false);
          setFieldErrors({
            _general: msg || "AI analysis failed. Please try again.",
          });
          setCurrentStep(3); // Return user to Upload Reports so they can retry
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

  if (notFound) {
    return (
      <div className="pp-scope patient-profile-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', textAlign: 'center' }}>
        <img src={diagnobotCryingImg} alt="Patient Not Found" style={{ width: '350px', height: 'auto', marginBottom: '24px' }} />
        <h1 style={{ color: '#0A1C40', fontSize: '28px', fontWeight: 'bold', marginBottom: '12px', fontFamily: 'Inter, sans-serif' }}>Patient Not Found</h1>
        <p style={{ color: '#4E5A73', fontSize: '16px', marginBottom: '32px', maxWidth: '400px', lineHeight: '1.5', fontFamily: 'Inter, sans-serif' }}>
          The patient profile you are looking for does not exist or has been removed.
        </p>
        <button 
          className="pp-edit-file-btn"
          style={{ padding: '12px 24px', fontSize: '15px' }}
          onClick={() => navigate('/patients')}
        >
          Back to Patients List
        </button>
      </div>
    );
  }

  if (isUnauthorized) {
    return <Unauthorized />;
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

      {/* ── Toast Notification ── */}
      {toast.isOpen && (
        <div
          onClick={() => setToast({ isOpen: false, message: "", isSuccess: false })}
          style={{
            position: "fixed",
            top: "80px",
            right: "24px",
            zIndex: 99999,
            minWidth: "300px",
            maxWidth: "350px",
            background: "var(--card-bg, #ffffff)",
            borderRadius: "12px",
            border: "1px solid var(--border-color, #e5e7eb)",
            padding: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            animation: "slideInRight 0.3s ease-out forwards",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px",
            cursor: "pointer",
          }}
        >
          {/* Icon */}
          <div
            style={{
              flexShrink: 0,
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: toast.isSuccess
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              marginTop: "1px",
              color: toast.isSuccess ? "#10B981" : "#EF4444"
            }}
          >
            {toast.isSuccess ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--text-primary, #111)",
                marginBottom: "4px",
                letterSpacing: "0.01em",
              }}
            >
              {toast.isSuccess ? "Success" : "Failed"}
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary, #666)",
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}
            >
              {toast.message}
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToast({ isOpen: false, message: "", isSuccess: false });
            }}
            style={{
              background: "none",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              color: "var(--text-tertiary, #9ca3af)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "auto",
              marginTop: "-4px",
              marginRight: "-4px"
            }}
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
                <div className="form-group full-width">
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
                  <label className="form-label required">Contact</label>
                  <input
                    type="text"
                    className={`form-input${fieldErrors.contact ? " target-error" : ""}`}
                    id="contact"
                    placeholder="Enter patient's phone number or email"
                    value={formData.contact}
                    onChange={handleInputChange}
                  />
                  {fieldErrors.contact && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.contact}
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
                        : "Select patient's gender"}
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
                  {fieldErrors.gender && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.gender}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label required">Date of Birth</label>
                  <div style={{ position: "relative" }}>
                    <DatePicker
                      selected={(() => {
                        if (!formData.date_of_birth) return null;
                        const d = new Date(`${String(formData.date_of_birth).split('T')[0]}T00:00:00`);
                        return isNaN(d.getTime()) ? null : d;
                      })()}
                      onChange={(date) => {
                        if (date && !isNaN(date.getTime())) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          handleInputChange({ target: { id: "date_of_birth", value: `${year}-${month}-${day}` } });
                        } else {
                          // If there's an active validation error (like invalid format or future date), 
                          // keep the state to let the inline error persist instead of silently clearing.
                          if (fieldErrors.date_of_birth) return;
                          handleInputChange({ target: { id: "date_of_birth", value: "" } });
                        }
                      }}
                      onChangeRaw={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          handleInputChange({ target: { id: "date_of_birth", value: "" } });
                          return;
                        }
                        const parts = val.split(/[./-]/);
                        if (parts.length === 3) {
                          const day = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10);
                          const year = parseInt(parts[2], 10);
                          // Forward manual types to handleInputChange for immediate validation if they resemble a full date
                          if (year > 1000 && !isNaN(day) && !isNaN(month)) {
                            const y = year;
                            const m = String(month).padStart(2, '0');
                            const d = String(day).padStart(2, '0');
                            handleInputChange({ target: { id: "date_of_birth", value: `${y}-${m}-${d}` } });
                          }
                        }
                      }}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      maxDate={new Date()}
                      dateFormat={["dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy"]}
                      placeholderText="DD/MM/YYYY"
                      className={`form-input${fieldErrors.date_of_birth ? " target-error" : ""}`}
                      id="date_of_birth"
                      wrapperClassName="date-picker-wrapper-full"
                      customInput={<input style={{ paddingRight: "40px" }} />}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#A0A8B8"
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                  </div>
                  {fieldErrors.date_of_birth && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.date_of_birth}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label required">National ID</label>
                  <input
                    type="text"
                    className={`form-input${fieldErrors.national_id ? " target-error" : ""}`}
                    id="national_id"
                    inputMode="numeric"
                    placeholder="Enter patient's national ID"
                    value={formData.national_id}
                    onChange={handleInputChange}
                  />
                  {fieldErrors.national_id && (
                    <div
                      style={{
                        color: "#EF4444",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.national_id}
                    </div>
                  )}
                </div>
              </div>

              <div className="wizard-actions">
                <button className="back" onClick={() => isEditMode ? navigate(`/patient-profile/${patientId}`) : navigate("/patients")}>
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

                    {isEditMode && fileManager[category].some(e => e.id || e.url) && (
                      <div className="existing-files-section" style={{ marginBottom: "16px" }}>
                        <h5 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>Existing files</h5>
                        <div className="uploaded-files-list">
                          {fileManager[category].map((entry, index) => {
                            if (!(entry.id || entry.url)) return null;
                            return (
                              <UploadFileItem
                                key={`existing-${index}`}
                                fileName={entry.name || "unknown"}
                                viewUrl={entry.url}
                                style={{
                                  borderColor: "#E5E7EB",
                                  background: "#F9FAFB",
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div
                      className="dropzone"
                      data-category={category}
                      onClick={() =>
                        document.getElementById(`${category}Input`).click()
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleFiles(category, e.dataTransfer.files);
                        }
                      }}
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

                    {fileManager[category].some(e => !(e.id || e.url)) && (
                      <div className="new-files-section" style={{ marginTop: "16px" }}>
                        {isEditMode && <h5 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>New files</h5>}
                        <div className="uploaded-files-list">
                          {fileManager[category].map((entry, index) => {
                            if (entry.id || entry.url) return null;
                            return (
                              <UploadFileItem
                                key={`new-${index}`}
                                fileName={entry.file?.name || entry.name || "unknown"}
                                viewUrl={entry.blobUrl || entry.url}
                                onRemove={() => removeFile(category, index)}
                                style={{
                                  borderColor: "#BBF7D0",
                                  background: "#F0FDF4",
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                        {isEditMode ? "Update File" : "Process & Analyze Reports"}
                      </span>
                      <span className="btn-text-short">{isEditMode ? "Update" : "Process"}</span>
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

class FormErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Form Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#EF4444", textAlign: "center", fontFamily: "sans-serif" }}>
          <h2 style={{ marginBottom: "16px" }}>Something went wrong.</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>The form encountered an unexpected error. Please refresh the page.</p>
          <pre style={{ background: "#f3f4f6", padding: "16px", borderRadius: "8px", textAlign: "left", overflowX: "auto", fontSize: "14px", color: "#333" }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: "24px", padding: "10px 20px", background: "#2A66FF", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AddPatientWrapper = (props) => (
  <FormErrorBoundary>
    <AddPatient {...props} />
  </FormErrorBoundary>
);

export default AddPatientWrapper;
