import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { getDoctorInitials } from './Dashboard';
import {
  getPatientAnalysisAPI,
  getPatientOverviewAPI,
  getPatientKeyInfoAPI,
  addPatientKeyInfoNoteAPI,
  patchKeyPointAPI,
  deleteKeyPointAPI,
  updatePatientStatusAPI,
  getDecisionSupportAPI,
  getPatientActivitiesAPI,
  getComparativeAnalysisAPI,
  sendChatbotMessageAPI,
  updatePatientAPI,
  getPatientForEditAPI,
} from "./mockAPI";
import echo from "./echo";
import { getJsonCookie } from "./cookieUtils";
import EvidencePanel from "../components/EvidencePanel.jsx";

import logo from "../assets/Logo_Diagnoo.png";
import stethoscope from "../assets/Stethoscope.png";
import closeIcon from "../assets/close.png";
import openIcon from "../assets/open.png";
import diagnobotImg from "../assets/DiagnoBot.png";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar"
import "../css/PatientProfile.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import MedicationsAndTasksTab from "../components/MedicationsAndTasksTab.jsx";
import { useNotifications } from "./NotificationsContext";
import ConfirmModal from "./ConfirmModal.jsx";
import LockedFeatureOverlay from "./LockedFeatureOverlay.jsx";

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const PatientProfile = () => {
  const navigate = useNavigate();
  const { patientId } = useParams();

  // ── Overview API state ──
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  // ── Evidence Panel state ──
  const [sourceFile, setSourceFile] = useState(null);
  const [evidencePanel, setEvidencePanel] = useState({ open: false, evidence: [], alertTitle: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Decision Support API state ──
  const [decisionSupport, setDecisionSupport] = useState([]);
  const [decisionSupportLoading, setDecisionSupportLoading] = useState(false);
  const [decisionSupportError, setDecisionSupportError] = useState(null);
  const [decisionSupportLoadedFor, setDecisionSupportLoadedFor] = useState(null);

  // ── Activity Log API state ──
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState(null);
  const [activitiesLoadedFor, setActivitiesLoadedFor] = useState(null);

  // ── Comparative Analysis API state ──
  const [comparativeData, setComparativeData] = useState([]);
  const [comparativeLoading, setComparativeLoading] = useState(false);
  const [comparativeError, setComparativeError] = useState(null);
  const [comparativeLoadedFor, setComparativeLoadedFor] = useState(null);
  // Tooltip state for SVG chart hover
  const [chartTooltip, setChartTooltip] = useState({ visible: false, x: 0, y: 0, date: "", status: "", value: "", testIdx: -1, pointIdx: -1 });

  const [activeTab, setActiveTab] = useState("overview");

  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const { unreadCount, openNotifications } = useNotifications();
  const avatarMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
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

  // ── Next Visit Date (lifted from MedicationsAndTasksTab so it survives tab switches) ──
  const [nextVisitDate, setNextVisitDate] = useState(null); // "YYYY-MM-DD" raw string
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [isChatPreparing, setIsChatPreparing] = useState(false);
  const chatChannelRef = useRef(null); // guard against duplicate realtime listeners

  const [selectedStatus, setSelectedStatus] = useState(() => {
    const raw = (JSON.parse(localStorage.getItem("currentPatient"))?.status || "").toLowerCase().trim().replaceAll("_", " ");
    return ["stable", "critical", "under review"].includes(raw) ? raw : "under review";
  });
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);


  //  Add-note API state 
  const [keyInfoOverride, setKeyInfoOverride] = useState({ high: [], medium: [], low: [] });
  const [addNoteToast, setAddNoteToast] = useState(null); // null | error string
  const [savingNoteId, setSavingNoteId] = useState(null); // tracks which new note is being saved
  const [editSavingId, setEditSavingId] = useState(null); // tracks which existing note edit is being saved

  const location = useLocation();
  const keyInfoData = location.state?.keyInfoData || null;

  // Tracks whether we've already seeded keyInfo from navigation state
  const [keyInfoSeeded, setKeyInfoSeeded] = useState(false);

  // ── Key info fetched from backend (View Details path) ──
  const [keyInfo, setKeyInfo] = useState(null);

  // keyInfo is the single source of truth for both flows.
  // In Add Patient flow it is seeded from navigation state then overwritten by the backend fetch.
  // keyInfoOverride accumulates doctor-added notes for both flows.
  const baseKeyInfo = keyInfo;
  const effectiveKeyInfo = {
    high: [...(baseKeyInfo?.high || []), ...(keyInfoOverride.high || [])],
    medium: [...(baseKeyInfo?.medium || []), ...(keyInfoOverride.medium || [])],
    low: [...(baseKeyInfo?.low || []), ...(keyInfoOverride.low || [])],
  };
  const highAlerts = effectiveKeyInfo.high;
  const mediumAlerts = effectiveKeyInfo.medium;
  const lowAlerts = effectiveKeyInfo.low;

  const [chatMessages, setChatMessages] = useState([]);
  const [analysisData, setAnalysisData] = useState(keyInfoData);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  const [activeAccordions, setActiveAccordions] = useState({});

  const [expandedLikelihoods, setExpandedLikelihoods] = useState({});

  const [tasks, setTasks] = useState([
    {
      id: 1,
      text: "Schedule MRI for liver assessment",
      done: false,
      badge: "Due Nov 5",
      badgeClass: "badge-critical",
    },
    {
      id: 2,
      text: "Complete Blood Test",
      done: true,
      badge: "Done Oct 30",
      badgeClass: "badge-stable",
    },
    {
      id: 3,
      text: "Follow-up consultation",
      done: false,
      badge: "Due Nov 15",
      badgeClass: "badge-info",
    },
    {
      id: 4,
      text: "Review medication adherence",
      done: true,
      badge: "Done Oct 28",
      badgeClass: "badge-stable",
    },
    {
      id: 5,
      text: "Nutritionist consultation",
      done: false,
      badge: "Due Nov 10",
      badgeClass: "badge-info",
    },
    {
      id: 6,
      text: "Repeat Liver Function Test",
      done: false,
      badge: "Due Nov 10",
      badgeClass: "badge-info",
    },
  ]);

  // ── Update patient status via PATCH ──
  const handleStatusChange = async (newStatus) => {
    if (!patientId) {
      console.warn("[status] patientId missing – cannot update");
      return;
    }
    if (isStatusUpdating || newStatus === selectedStatus) return;

    const prevStatus = selectedStatus;
    setSelectedStatus(newStatus);        // optimistic update
    setIsStatusUpdating(true);

    try {
      const res = await updatePatientStatusAPI(patientId, newStatus);
      if (res && res.success) {
        // Confirm with backend's canonical value (normalised)
        const confirmed = (res.data?.status || newStatus)
          .toLowerCase().trim().replaceAll("_", " ");
        const valid = ["stable", "critical", "under review"].includes(confirmed);
        setSelectedStatus(valid ? confirmed : newStatus);

        // Notify PatientList of the change
        window.dispatchEvent(
          new CustomEvent("patientStatusUpdated", {
            detail: { patientId, status: valid ? confirmed : newStatus },
          })
        );
        // No success toast — the active badge highlight is the visual feedback
      } else {
        setSelectedStatus(prevStatus);   // rollback
        const isAuthError =
          res?.message?.includes("401") || res?.message?.includes("403") ||
          res?.message?.toLowerCase().includes("unauthorized") ||
          res?.message?.toLowerCase().includes("forbidden");
        Swal.fire({
          icon: "error",
          title: isAuthError ? "Access Denied" : "Update Failed",
          text: res?.message || "Failed to update patient status.",
          confirmButtonColor: "#FF5C5C",
        });
      }
    } catch (err) {
      console.error("[status] exception:", err);
      setSelectedStatus(prevStatus);     // rollback
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not reach the server. Please try again.",
        confirmButtonColor: "#FF5C5C",
      });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // ── Helper: professional empty-state messages per field ──
  const isEmpty = (v) =>
    !v ||
    String(v).trim() === "" ||
    String(v).trim().toUpperCase() === "N/A" ||
    String(v).trim().toUpperCase() === "NA";
  const formatKeyInfo = (field, value) => {
    if (field === "age")
      return value != null && !isEmpty(value)
        ? `${value} Years`
        : "Not provided";
    if (field === "smoker")
      return value != null && !isEmpty(value) ? String(value) : "Not provided";
    if (field === "chronicDiseases") {
      if (!value || isEmpty(value)) return "No chronic diseases reported";
      if (Array.isArray(value))
        return value.length ? value.join(", ") : "No chronic diseases reported";
      const parts = String(value)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts.join(", ") : "No chronic diseases reported";
    }
    if (field === "previousSurgeries")
      return isEmpty(value) ? "No previous surgeries reported" : value;
    if (field === "allergies")
      return isEmpty(value) ? "No known allergies reported" : value;
    if (field === "medications")
      return isEmpty(value) ? "No medications reported" : value;
    if (field === "familyHistory")
      return isEmpty(value) ? "No family medical history reported" : value;
    return isEmpty(value) ? "Not provided" : value;
  };

  //   useEffect(() => {
  //     const fetchAnalysisData = async () => {
  //       const patientData = JSON.parse(localStorage.getItem("currentPatient"));
  //       if (patientData && patientData.patient_id) {
  //         setIsLoadingAnalysis(true);

  //         console.log(patientData.patient_id);
  //         const result = await getPatientAnalysisAPI(patientData.patient_id);
  //         if (result.success) {
  //             console.log(result.result);
  //           setAnalysisData(result.data);
  //         }

  //         setIsLoadingAnalysis(false);
  //       }
  //     };

  //     fetchAnalysisData();
  //   }, []);

  // ── Fetch Key Important Info from backend (both flows) ──
  useEffect(() => {
    if (!patientId) {
      setIsLoadingAnalysis(false);
      return;
    }
    // Seed keyInfo with navigation-state data so the UI isn't blank during the fetch.
    // The fetch will overwrite this with real mutable state, enabling edit/delete in both flows.
    if (keyInfoData && !keyInfoSeeded) {
      setKeyInfo(keyInfoData);
      setKeyInfoSeeded(true);
    }
    const fetchKeyInfo = async () => {
      setIsLoadingAnalysis(true);
      const res = await getPatientKeyInfoAPI(patientId);
      if (res && res.success !== false) {
        const payload = res?.data ?? res;
        setKeyInfo(payload);
        // Extract source PDF URL for the Evidence Panel
        const sf = payload?.source_file ?? res?.source_file ?? null;
        if (sf) setSourceFile(sf);
      } else {
        console.error("[keyInfo] fetch failed:", res?.message);
      }
      setIsLoadingAnalysis(false);
    };
    fetchKeyInfo();
  }, [patientId]);

  // ── Fetch Patient Overview on mount ──
  useEffect(() => {
    if (!patientId) {
      setOverviewLoading(false);
      return;
    }
    console.log("[overview] patientId", patientId);

    const fetchOverview = async () => {
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        const res = await getPatientOverviewAPI(patientId);
        console.log("[overview] response", res);
        if (res.success === false) {
          console.error("[overview] error", res.message);
          setOverviewError(res.message || "Failed to load patient overview");
        } else {
          // API shape: { success: true, data: [ {...patientObject...} ] }
          // Extract the first element of the array; fall back gracefully
          const raw = res?.data;
          const patient = Array.isArray(raw) ? raw[0] : (raw ?? res);
          console.log("[overview] extracted patient", patient);
          setOverviewData(patient);

          // Seed next visit date from overview if backend includes it
          const nvd = patient?.next_visit_date || patient?.next_appointment_date || patient?.next_appointment || null;
          if (nvd) setNextVisitDate(nvd);

          // Sync status pill: normalize to "stable" | "critical" | "under review"
          const normalized = (patient?.status || "")
            .toLowerCase()
            .trim()
            .replaceAll("_", " ");
          if (
            normalized === "stable" ||
            normalized === "critical" ||
            normalized === "under review"
          ) {
            setSelectedStatus(normalized);
          } else {
            setSelectedStatus("");
          }
        }
      } catch (err) {
        console.error("[overview] fetch exception", err);
        setOverviewError("Network error while loading overview");
      } finally {
        setOverviewLoading(false);
      }
    };

    fetchOverview();
  }, [patientId]);

  const [selectedReport, setSelectedReport] = useState(null);

  // Inline note editing state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Doctor-added new notes per priority section
  const [newNotes, setNewNotes] = useState({ high: [], medium: [], low: [] });
  const [newNoteTexts, setNewNoteTexts] = useState({});

  const addNewNote = (priority) => {
    const id = `new-${priority}-${Date.now()}`;
    setNewNotes((prev) => ({
      ...prev,
      [priority]: [
        ...prev[priority],
        { id, text: "", date: null, saved: false },
      ],
    }));
    setNewNoteTexts((prev) => ({ ...prev, [id]: "" }));
  };

  const saveNewNote = async (priority, id) => {
    const insight = (newNoteTexts[id] || "").trim();
    if (!insight || savingNoteId === id) return; // empty-text guard + prevent double submit
    setSavingNoteId(id);

    if (!patientId) {
      console.error("[add-note] patientId is missing - cannot submit");
      setAddNoteToast("Cannot save note: patient ID is unavailable.");
      return;
    }

    try {
      const res = await addPatientKeyInfoNoteAPI(patientId, { insight, priority });
      console.log("[add-note] response:", res);

      if (res && res.success) {
        // Backend may return { data: { id, ... } } or { data: { data: { id, ... } } }
        const newNote = res.data?.data ?? res.data;
        console.log("[add-note] note saved — id:", newNote?.id, "| full note:", newNote);

        // Append to override – effectiveKeyInfo merges baseKeyInfo + keyInfoOverride,
        // so a single insert here is enough for both Add Patient and View Details flows.
        setKeyInfoOverride((prev) => ({
          ...prev,
          [priority]: [...(prev[priority] || []), newNote],
        }));

        // Remove the draft entry
        cancelNewNote(priority, id);
        setAddNoteToast(null);
      } else {
        console.error("[add-note] API error:", res?.message);
        setAddNoteToast("Failed to add note");
      }
    } catch (err) {
      console.error("[add-note] exception:", err);
      setAddNoteToast("Failed to add note");
    } finally {
      setSavingNoteId(null);
    }
  };

  const cancelNewNote = (priority, id) => {
    setNewNotes((prev) => ({
      ...prev,
      [priority]: prev[priority].filter((n) => n.id !== id),
    }));
    setNewNoteTexts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const startEditNewNote = (id) => {
    // Re-open a saved new note for editing
    setNewNotes((prev) => {
      const updated = {};
      for (const priority of ["high", "medium", "low"]) {
        updated[priority] = prev[priority].map((n) =>
          n.id === id ? { ...n, saved: false } : n,
        );
      }
      return updated;
    });
  };

  // Static note texts (editable)
  const [staticNotes, setStaticNotes] = useState({
    "high-1":
      "Persistent high-grade fever (38-39°C) in a patient with an implanted pacemaker raises concern for pacemaker-related infection or infective endocarditis.",
    "high-2":
      "Patient has documented severe allergic reaction. Always verify antibiotic alternatives before prescribing.",
    "medium-1":
      "Use of Concor and Forxiga despite no prior history of hypertension or diabetes requires monitoring and indication verification.",
    "medium-2":
      "Liver enzyme ALT slightly elevated at last check. Recommend repeat liver function test in 7 days.",
    "low-1":
      "Medication cost concern addressed. Patient inquired about generic alternatives; current prescription is already generic. Insurance verified.",
  });

  const startEditNote = (id, currentText) => {
    setEditingNoteId(id);
    setEditingNoteText(currentText);
  };

  const saveEditNote = async (id, newText) => {
    console.log("Saving note:", id, "with text:", newText);

    // Detect if this is a backend-managed note (numeric id) vs a static/hardcoded note
    const isBackendNote = typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id));

    if (isBackendNote) {
      // ── PATCH /api/key-points/{id} ──
      if (editSavingId === id) return; // prevent double submit
      setEditSavingId(id);
      try {
        const res = await patchKeyPointAPI(id, { insight: newText });
        console.log("[edit-note] PATCH response:", res);

        if (res && res.success) {
          const updatedInsight = res.data?.insight ?? newText;

          // Helper: update insight by id in a priority array
          const updateById = (arr) =>
            (arr || []).map((item) =>
              String(item.id) === String(id) ? { ...item, insight: updatedInsight } : item
            );

          // Update keyInfo (base fetched data)
          setKeyInfo((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              high: updateById(prev.high),
              medium: updateById(prev.medium),
              low: updateById(prev.low),
            };
          });

          // Update keyInfoOverride (doctor-added notes)
          setKeyInfoOverride((prev) => ({
            ...prev,
            high: updateById(prev.high),
            medium: updateById(prev.medium),
            low: updateById(prev.low),
          }));

          setEditingNoteId(null);
          setEditingNoteText("");
        } else {
          console.error("[edit-note] API error:", res?.message);
          setAddNoteToast("Failed to update note");
        }
      } catch (err) {
        console.error("[edit-note] exception:", err);
        setAddNoteToast("Failed to update note");
      } finally {
        setEditSavingId(null);
      }
    } else if (id.includes("-api-")) {
      const priority = id.split("-")[0];
      setAnalysisData((prev) => {
        if (!prev || !prev[0] || !prev[0].result) return prev;
        const newData = [...prev];
        const resultObj = { ...newData[0].result };
        const arrName = `${priority}_priority_alerts`;
        if (resultObj[arrName]) {
          resultObj[arrName] = resultObj[arrName].map((item) =>
            item.id === id ? { ...item, text: newText } : item,
          );
        }
        newData[0].result = resultObj;
        return newData;
      });
      setEditingNoteId(null);
      setEditingNoteText("");
    } else {
      setStaticNotes((prev) => {
        const updated = { ...prev, [id]: newText };
        console.log("Updated staticNotes:", updated);
        return updated;
      });
      setEditingNoteId(null);
      setEditingNoteText("");
    }
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  // ── Open Evidence Panel with alert-specific data ──
  const openEvidencePanel = (alertObj) => {
    console.log("[ViewEvidence] Click triggered. Target alert:", alertObj?.id, alertObj?.title);
    console.log("[ViewEvidence] Extracted evidence:", alertObj?.evidence);
    console.log("[ViewEvidence] Source file to pass:", sourceFile);
    
    setEvidencePanel({
      open: true,
      selectedAlert: alertObj,
    });
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // ── Chatbot realtime cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (chatChannelRef.current) {
        echo.leave(chatChannelRef.current);
        chatChannelRef.current = null;
      }
    };
  }, []);

  // ── Reset Decision Support when patient changes ──
  useEffect(() => {
    setDecisionSupport([]);
    setDecisionSupportError(null);
    setDecisionSupportLoadedFor(null);
  }, [patientId]);

  // ── Reset Activity Log when patient changes ──
  useEffect(() => {
    setActivities([]);
    setActivitiesError(null);
    setActivitiesLoadedFor(null);
  }, [patientId]);

  // ── Reset Comparative Analysis when patient changes ──
  useEffect(() => {
    setComparativeData([]);
    setComparativeError(null);
    setComparativeLoadedFor(null);
  }, [patientId]);

  // ── Fetch Decision Support from backend (Includes Legacy Auto-Generation Flow) ──
  const [isGeneratingDecisionSupport, setIsGeneratingDecisionSupport] = useState(false);
  const hasTriggeredDecisionSupportGeneration = useRef(false);

  const fetchDecisionSupport = async () => {
    if (!patientId) return;

    // Guard to prevent duplicate clicks while already loading/generating
    if (isGeneratingDecisionSupport || decisionSupportLoading) return;

    setDecisionSupportLoading(true);
    setDecisionSupportError(null);

    try {
      // 1) First call the normal Decision Support endpoint directly
      let dsRes = await getDecisionSupportAPI(patientId);

      const is401 = dsRes?.message?.toLowerCase().includes("unauthenticated") || dsRes?.message?.includes("401");
      if (is401) {
        setDecisionSupportError("401");
        setDecisionSupportLoading(false);
        navigate("/login");
        return;
      }

      let dataArr = Array.isArray(dsRes?.data) ? dsRes.data : [];

      // If it returns real Decision Support data: show it normally, stop there.
      if (dataArr.length > 0) {
        setDecisionSupport(dataArr);
        setDecisionSupportLoadedFor(patientId);
        setDecisionSupportLoading(false);
        return;
      }

      // If this endpoint does NOT return data / no usable data:
      // Assess eligibility for auto-generation using current plan
      if (!canGenerateDecisionSupportNow) {
        // Doctor is still on a plan that DOES NOT allow Decision Support => show locker promo UI
        setDecisionSupport([]);
        setDecisionSupportLoadedFor(patientId);
        setDecisionSupportLoading(false);
        return;
      }

      // Current plan DOES allow it, but we have NO data! (Legacy Edge Case)
      // Guard against double triggers
      if (hasTriggeredDecisionSupportGeneration.current) {
        setDecisionSupport([]);
        setDecisionSupportLoadedFor(patientId);
        setDecisionSupportLoading(false);
        return;
      }

      // We are officially starting the regeneration flow
      hasTriggeredDecisionSupportGeneration.current = true;
      setIsGeneratingDecisionSupport(true);

      // 2) Call: GET /api/patients/{patientId} ("Get Pre-Filled Patient Data for Editing")
      const fetchRes = await getPatientForEditAPI(patientId);
      if (!fetchRes?.success) throw new Error(fetchRes?.message || "Failed to fetch patient data for generation");

      const d = fetchRes.data;
      const pi = d?.personal_info || {};
      const mh = d?.medical_history || {};

      // 3) Build the SAME payload used by Edit File / Save Changes
      const apiFormData = new FormData();
      apiFormData.append("_method", "PUT");
      
      apiFormData.append("name", pi.name || "");
      if (pi.email) apiFormData.append("email", pi.email);
      if (pi.phone) apiFormData.append("phone", pi.phone);
      if (pi.age != null) apiFormData.append("age", pi.age);
      if (pi.gender) apiFormData.append("gender", pi.gender);
      if (pi.national_id) apiFormData.append("national_id", pi.national_id);

      apiFormData.append("is_smoker", mh.is_smoker ? "1" : "0");
      apiFormData.append("previous_surgeries", mh.previous_surgeries ? "1" : "0");
      if (mh.previous_surgeries) {
        apiFormData.append("previous_surgeries_name", mh.previous_surgeries_name || "");
      }

      if (Array.isArray(mh.chronic_diseases) && mh.chronic_diseases.length > 0) {
        mh.chronic_diseases.forEach((disease) => {
          apiFormData.append("chronic_diseases[]", disease);
        });
      }

      apiFormData.append("medications", mh.medications || "");
      apiFormData.append("allergies", mh.allergies || "");
      apiFormData.append("family_history", mh.family_history || "");
      apiFormData.append("current_complaint", mh.current_complaint || "");

      // Preserve existing AI outputs so backend doesn't wipe them
      if (mh.ai_summary || d.ai_summary) {
        apiFormData.append("ai_summary", mh.ai_summary || d.ai_summary);
      }
      if (mh.smart_summary || d.smart_summary) {
        apiFormData.append("smart_summary", mh.smart_summary || d.smart_summary);
      }
      if (mh.key_points || d.key_points) {
        const kp = mh.key_points || d.key_points;
        apiFormData.append("key_points", typeof kp === 'string' ? kp : JSON.stringify(kp));
      }
      if (mh.key_important_information || d.key_important_information) {
        const ki = mh.key_important_information || d.key_important_information;
        apiFormData.append("key_important_information", typeof ki === 'string' ? ki : JSON.stringify(ki));
      }

      // 4) Call: PUT /api/patients/{patientId} ("Update Patient Data")
      await updatePatientAPI(patientId, apiFormData);

      // 5) Poll /api/patients/{patientId}/decision-support until data appears (max ~40 seconds)
      let finalDataArr = [];
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        attempts++;
        const retryRes = await getDecisionSupportAPI(patientId);
        if (retryRes && retryRes.success && Array.isArray(retryRes.data) && retryRes.data.length > 0) {
          finalDataArr = retryRes.data;
          break; // Data has successfully hydrated!
        }
        // Wait 4 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
      
      setDecisionSupport(finalDataArr);
      setDecisionSupportLoadedFor(patientId);
      
    } catch (err) {
      console.error("[decision-support-flow] exception:", err);
      setDecisionSupportError("Network error or generation failed.");
    } finally {
      setIsGeneratingDecisionSupport(false);
      setDecisionSupportLoading(false);
    }
  };

  // ── Fetch Activity Log from backend ──
  const fetchActivities = async () => {
    if (!patientId) return;
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await getPatientActivitiesAPI(patientId);
      console.log("[activity-log] response:", res);
      if (res && res.success) {
        setActivities(Array.isArray(res.data) ? res.data : []);
        setActivitiesLoadedFor(patientId);
      } else {
        setActivitiesError(res?.message || "Failed to load activity log.");
      }
    } catch (err) {
      console.error("[activity-log] exception:", err);
      setActivitiesError("Network error. Please check your connection.");
    } finally {
      setActivitiesLoading(false);
    }
  };

  // ── Fetch Comparative Analysis from backend ──
  const fetchComparativeAnalysis = async () => {
    if (!patientId) return;
    setComparativeLoading(true);
    setComparativeError(null);
    try {
      const res = await getComparativeAnalysisAPI(patientId);
      console.log("[comparative-analysis] response:", res);
      if (res && res.success) {
        setComparativeData(Array.isArray(res.data) ? res.data : []);
        setComparativeLoadedFor(patientId);
      } else {
        setComparativeError(res?.message || "Failed to load comparative analysis.");
      }
    } catch (err) {
      console.error("[comparative-analysis] exception:", err);
      setComparativeError("Network error. Please check your connection.");
    } finally {
      setComparativeLoading(false);
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (tabId === "decision" && patientId && decisionSupportLoadedFor !== patientId) {
      fetchDecisionSupport();
    }
    if (tabId === "activity" && patientId) {
      fetchActivities();
    }
    if (tabId === "comparative" && patientId && comparativeLoadedFor !== patientId) {
      fetchComparativeAnalysis();
    }
  };

  const toggleAccordion = (index) => {
    setActiveAccordions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleLikelihood = (index) => {
    setExpandedLikelihoods((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    );
  };

  const handleReportClick = (index) => {
    setSelectedReport(index);
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) {
        const user = getJsonCookie("user");
        const doctorName = user?.name || user?.user?.name || "Doctor";
        const patientName =
          overviewData?.name ||
          overviewData?.patient_name ||
          overviewData?.full_name ||
          "this patient";
        setChatMessages([
          {
            type: "ai",
            text: `Hello Dr. ${doctorName}, how can I assist you with ${patientName}'s case today?`,
          },
        ]);
      }
      return !prev;
    });
  };

  const handleChatEnter = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const subscribeToChatbotChannel = () => {
    if (chatChannelRef.current) return;
    const user = getJsonCookie("user");
    const doctorId = user?.id || user?.user?.id;
    if (!doctorId) return;

    const channelName = `chatbot-answer.${doctorId}`;
    chatChannelRef.current = channelName;

    echo.private(channelName).listen(".ChatbotAnswerReady", (payload) => {
      const answer =
        payload?.answer || payload?.data || payload?.message || "";
      const isFailed =
        !answer ||
        answer.toLowerCase().includes("fail") ||
        answer.toLowerCase().includes("error");

      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: isFailed
            ? "Sorry, I couldn't prepare the chatbot answer right now. Please try again."
            : answer,
        },
      ]);
      setIsChatPreparing(false);
      setIsChatSending(false);
      echo.leave(channelName);
      chatChannelRef.current = null;
    });
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || isChatSending || isChatPreparing) return;

    setChatMessages((prev) => [...prev, { type: "user", text }]);
    setChatInput("");
    setIsChatSending(true);

    try {
      const res = await sendChatbotMessageAPI(patientId, text);

      if (!res || res.success === false) {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "ai",
            text: "Sorry, something went wrong. Please try again.",
          },
        ]);
        return;
      }

      if (res.data === "Preparing patient data...") {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "ai",
            text: "I'm preparing this patient's data. Please wait a moment...",
            preparing: true,
          },
        ]);
        setIsChatPreparing(true);
        subscribeToChatbotChannel();
        return;
      }

      setChatMessages((prev) => [
        ...prev,
        { type: "ai", text: res.data || res.message || "Done." },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      if (!isChatPreparing) setIsChatSending(false);
    }
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const { credits, isCreditsLoading, subscriptionData, isSubLoading } = useSubscription();

  // ── Plan-access & historical data helpers ──
  const isPayPerUse = subscriptionData?.billing_mode === "pay_per_use";
  const planNameLower = (subscriptionData?.plan_name || "").toLowerCase();

  const canGenerateDecisionSupportNow =
    Boolean(isPayPerUse || ["pro", "premium"].includes(planNameLower));
  const hasExistingDecisionSupportData = Boolean(
    Array.isArray(decisionSupport) && decisionSupport.length > 0
  );
  
  const canAccessDecisionSupportNow = canGenerateDecisionSupportNow;
  
  // We determine final locked behavior dynamically within JSX:
  const shouldShowLockedDecisionSupport = !hasExistingDecisionSupportData && !canAccessDecisionSupportNow;

  const canUseChatbotNow = Boolean(isPayPerUse || planNameLower === "premium");
  const hasExistingChatbotAccessOrData = Boolean(
    Array.isArray(chatMessages) && chatMessages.length > 1
  ); 
  const shouldShowLockedChatbot = !hasExistingChatbotAccessOrData && !canUseChatbotNow;

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  // Delete alert modal state
  const [isDeleteAlertModalOpen, setIsDeleteAlertModalOpen] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState(null);

  const openDeleteAlertModal = (alertId) => {
    console.log(
      "[open-delete-modal] alertId received:",
      alertId,
      "| type:",
      typeof alertId,
    );
    setAlertToDelete(alertId);
    setIsDeleteAlertModalOpen(true);
  };

  const closeDeleteAlertModal = () => {
    setIsDeleteAlertModalOpen(false);
    setAlertToDelete(null);
  };

  // const confirmDeleteAlert = () => {
  //   console.log("[delete-alert] id:", alertToDelete);
  //   if (alertToDelete && typeof alertToDelete === "string") {
  //     if (alertToDelete.startsWith("new-")) {
  //       const parts = alertToDelete.split("-");
  //       const priority = parts[1];
  //       cancelNewNote(priority, alertToDelete);
  //     } else if (alertToDelete.includes("-api-")) {
  //       const priority = alertToDelete.split("-")[0];
  //       setAnalysisData((prev) => {
  //         if (!prev || !prev[0] || !prev[0].result) return prev;
  //         const newData = [...prev];
  //         const resultObj = { ...newData[0].result };
  //         const arrName = `${priority}_priority_alerts`;
  //         if (resultObj[arrName]) {
  //           resultObj[arrName] = resultObj[arrName].filter(
  //             (item) => item.id !== alertToDelete,
  //           );
  //         }
  //         newData[0].result = resultObj;
  //         return newData;
  //       });
  //     } else {
  //       setStaticNotes((prev) => {
  //         const next = { ...prev };
  //         delete next[alertToDelete];
  //         return next;
  //       });
  //       setDeletedNotes((prev) => ({ ...prev, [alertToDelete]: true }));
  //     }
  //   }
  //   closeDeleteAlertModal();
  // };

  const confirmDeleteAlert = async (e) => {
    if (e) e.stopPropagation();

    // ── Strict guard: prevent duplicate calls ──
    if (isDeleting) return;

    console.log("[delete-alert] alertToDelete value:", alertToDelete);
    console.log("[delete-alert] alertToDelete type:", typeof alertToDelete);

    // Normalize to string so numeric IDs don't silently fail
    const id = alertToDelete != null ? String(alertToDelete) : null;

    if (!id) {
      closeDeleteAlertModal();
      return;
    }

    // ── Doctor-added unsaved notes: no backend call needed ──
    if (id.startsWith("new-")) {
      const parts = id.split("-");
      const priority = parts[1];
      cancelNewNote(priority, id);
      closeDeleteAlertModal();
      return;
    }

    // ── All other notes (AI-generated or static): call the backend ──
    console.log("[delete-alert] calling deleteKeyPointAPI with id:", id);
    setIsDeleting(true);
    try {
      const result = await deleteKeyPointAPI(id);
      console.log("[delete-alert] response received:", result);

      if (result.success) {
        // Close modal immediately — before Swal — so it never stays open
        closeDeleteAlertModal();

        // Remove from effectiveKeyInfo-based alerts (highAlerts / mediumAlerts / lowAlerts)
        if (keyInfo) {
          setKeyInfo((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              high: (prev.high || []).filter((a) => String(a.id) !== id),
              medium: (prev.medium || []).filter((a) => String(a.id) !== id),
              low: (prev.low || []).filter((a) => String(a.id) !== id),
            };
          });
        }

        // Remove from keyInfoOverride (doctor-added notes saved in the current session)
        setKeyInfoOverride((prev) => ({
          ...prev,
          high: (prev.high || []).filter((a) => String(a.id) !== id),
          medium: (prev.medium || []).filter((a) => String(a.id) !== id),
          low: (prev.low || []).filter((a) => String(a.id) !== id),
        }));

        // Also remove from navigation-state-passed keyInfoData path
        if (id.includes("-api-")) {
          const priority = id.split("-")[0];
          setAnalysisData((prev) => {
            if (!prev || !prev[0] || !prev[0].result) return prev;
            const newData = [...prev];
            const resultObj = { ...newData[0].result };
            const arrName = `${priority}_priority_alerts`;
            if (resultObj[arrName]) {
              resultObj[arrName] = resultObj[arrName].filter(
                (item) => String(item.id) !== id,
              );
            }
            newData[0].result = resultObj;
            return newData;
          });
        }

        // Remove static notes (high-1, medium-1, low-1, etc.)
        setStaticNotes((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setDeletedNotes((prev) => ({ ...prev, [id]: true }));

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: result.message || "Key point deleted successfully.",
          confirmButtonColor: "#2A66FF",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result.message || "Something went wrong.",
          confirmButtonColor: "#FF5C5C",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pp-scope patient-profile-page">
      <div className="background-layer">
        <div className="ambient-ripple ripple-1"></div>
        <div className="ambient-ripple ripple-2"></div>
        <div className="ambient-ripple ripple-3"></div>
      </div>

      <Sidebar activePage="patients" />

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

      {/* Delete Alert Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteAlertModalOpen}
        onClose={closeDeleteAlertModal}
        onConfirm={confirmDeleteAlert}
        title="Delete Key Info"
        description="Are you sure you want to delete this alert?"
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="danger"
        icon={<TrashIcon />}
      />

      <div
        className="content-layer"
        style={{
          position: "relative",
          zIndex: "1",
          marginLeft: isSidebarCollapsed ? "72px" : "240px",
          marginTop: "64px",
          minHeight: "calc(100vh - 64px)",
          transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <header className="patient-header pp-header">
          <div className="patient-identity">
            <div className="patient-main-info">
              <div className="patient-avatar" style={{ borderRadius: "50%" }}>
                {overviewData?.patientName
                  ? overviewData.patientName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                  : "NH"}
              </div>
              <div className="patient-details" style={{ marginBottom: "0px" }}>
                <h1>
                  {overviewLoading
                    ? "Loading…"
                    : (overviewData?.patientName ?? "N/A")}
                </h1>
                <p className="patient-meta">
                  {overviewLoading
                    ? "Loading…"
                    : `${overviewData?.doctorName ? `Dr. ${overviewData.doctorName}` : "N/A"} / National ID: #${overviewData?.patientId ?? "N/A"}`}
                </p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: " all 0.3s ease",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  background: "transparent",
                  color: "#2A66FF",
                  border: "1px solid #2A66FF",
                  fontWeight: "bold",
                }}
                onClick={() => {
                  navigate(`/edit-patient/${patientId}`);
                }}
              >
                Edit File
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: " all 0.3s ease",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  background: "rgb(42, 102, 255)",
                  color: "white",
                  border: "1px solid #2A66FF",
                  fontWeight: "bold",
                }}
              >
                Start Collaboration
              </button>
            </div>
          </div>
        </header>



        <div className="container">
          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => handleTabClick("overview")}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === "keyinfo" ? "active" : ""}`}
              onClick={() => handleTabClick("keyinfo")}
            >
              Key Important Info
            </button>
            <button
              className={`tab-btn ${activeTab === "comparative" ? "active" : ""
                }`}
              onClick={() => handleTabClick("comparative")}
            >
              Comparative Analysis
            </button>
            <button
              className={`tab-btn ${activeTab === "decision" ? "active" : ""}`}
              onClick={() => handleTabClick("decision")}
            >
              Decision Support
            </button>
            <button
              className={`tab-btn ${activeTab === "medications-tasks" ? "active" : ""}`}
              onClick={() => handleTabClick("medications-tasks")}
            >
              Medications & Tasks
            </button>
            <button
              className={`tab-btn ${activeTab === "activity" ? "active" : ""}`}
              onClick={() => handleTabClick("activity")}
            >
              Activity Log
            </button>
          </nav>
          <div
            className={`tab-content ${activeTab === "overview" ? "active" : ""
              }`}
            id="overview"
          >
            <div className="overview-layout">
              <div className="card smart-summary">
                <div className="card-header">
                  <h2 className="card-title">
                    <span className="ai-pulse"></span>
                    Smart Summary
                  </h2>
                  <div className="ai-insight">
                    <strong>AI Summary:</strong>{" "}
                    {overviewLoading
                      ? "Loading…"
                      : overviewData?.smart_summary ||
                      analysisData?.[0]?.result?.["ai-summary"] ||
                      "No insights available"}
                  </div>
                </div>

                <div
                  className="critical-info-section"
                  style={{ marginTop: "0" }}
                >
                  <div className="section-header-container">
                    <h3 className="section-header" style={{ marginBottom: 0 }}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      Critical Key Information
                    </h3>
                    <div className="status-buttons-group">
                      <span
                        className={`status-badge stable ${selectedStatus === "stable" ? "active" : "inactive"}`}
                        onClick={() => handleStatusChange("stable")}
                        style={{ cursor: isStatusUpdating ? "not-allowed" : "pointer" }}
                      >
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor: "#00C187",
                            boxShadow: "none",
                            animation: "none",
                          }}
                        ></span>{" "}
                        Stable
                      </span>
                      <span
                        className={`status-badge critical ${selectedStatus === "critical" ? "active" : "inactive"}`}
                        onClick={() => handleStatusChange("critical")}
                        style={{ cursor: isStatusUpdating ? "not-allowed" : "pointer" }}
                      >
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor: "#FF5C5C",
                            boxShadow: "none",
                            animation: "none",
                          }}
                        ></span>{" "}
                        Critical
                      </span>
                      <span
                        className={`status-badge warning ${selectedStatus === "under review" ? "active" : "inactive"}`}
                        onClick={() => handleStatusChange("under review")}
                        style={{ cursor: isStatusUpdating ? "not-allowed" : "pointer" }}
                      >
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor: "#FFA500",
                            boxShadow: "none",
                            animation: "none",
                          }}
                        ></span>{" "}
                        Under Review
                      </span>
                    </div>
                  </div>
                  <div className="key-info-grid">
                    {/* Row 1 / Col 1 */}
                    <div className="info-item age-smoker-split">
                      {/* Mini-field A: Age */}
                      <div className="mini-field">
                        <div className="info-label">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            ></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                          </svg>
                          Age
                        </div>
                        <div className="info-value">
                          {overviewLoading
                            ? "…"
                            : formatKeyInfo("age", overviewData?.age)}
                        </div>
                      </div>

                      {/* Mini-field B: Smoker */}
                      <div className="mini-field">
                        <div className="info-label">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <circle cx="12" cy="16" r="1"></circle>
                          </svg>
                          Smoker
                        </div>
                        <div className="info-value">
                          {overviewLoading
                            ? "…"
                            : formatKeyInfo("smoker", overviewData?.smoker)}
                        </div>
                      </div>
                    </div>

                    {/* Row 1 / Col 2 */}
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Chronic Disease
                      </div>
                      <div className="info-value">
                        {overviewLoading
                          ? "…"
                          : formatKeyInfo(
                            "chronicDiseases",
                            overviewData?.chronicDiseases,
                          )}
                      </div>
                    </div>

                    {/* Row 2 / Col 1 */}
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Previous Surgeries
                      </div>
                      <div className="info-value">
                        {overviewLoading
                          ? "…"
                          : formatKeyInfo(
                            "previousSurgeries",
                            overviewData?.previousSurgeries,
                          )}
                      </div>
                    </div>

                    {/* Row 2 / Col 2 */}
                    <div
                      className="info-item"
                      style={{ background: "#FFECEC", borderColor: "#FF5C5C" }}
                    >
                      <div className="info-label" style={{ color: "#FF5C5C" }}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Known Allergies
                      </div>
                      <div className="info-value" style={{ color: "#FF5C5C" }}>
                        {overviewLoading
                          ? "…"
                          : formatKeyInfo("allergies", overviewData?.allergies)}
                      </div>
                    </div>

                    {/* Row 3 / Col 1 */}
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="2"
                            y="7"
                            width="20"
                            height="14"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                        Medications
                      </div>
                      <div className="info-value">
                        {overviewLoading
                          ? "…"
                          : formatKeyInfo(
                            "medications",
                            overviewData?.medications,
                          )}
                      </div>
                    </div>

                    {/* Row 3 / Col 2 */}
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Family Medical History
                      </div>
                      <div className="info-value">
                        {overviewLoading
                          ? "…"
                          : formatKeyInfo(
                            "familyHistory",
                            overviewData?.familyHistory,
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={`tab-content ${activeTab === "keyinfo" ? "active" : ""}`}
            id="keyinfo"
          >
            <div className="priority-sections">
              {/* --- High Priority Section --- */}
              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon high"></span>
                    High Priority Alerts
                  </h3>
                  <button
                    className="pp-add-note-btn"
                    onClick={() => addNewNote("high")}
                  >
                    + Add Note
                  </button>
                </div>

                <div className="note-list">
                  {isLoadingAnalysis
                    ? // الجزء ده بيظهر فقط وقت التحميل (Static Notes)
                    staticNotes["high-1"] && (
                      <div className="note-item high-priority">
                        <div className="pp-note-actions">
                          <button
                            className="pp-note-edit-btn"
                            onClick={() =>
                              startEditNote("high-1", staticNotes["high-1"])
                            }
                            title="Edit"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        </div>
                        {editingNoteId === "high-1" ? (
                          <>
                            <textarea
                              className="pp-note-edit-textarea"
                              value={editingNoteText}
                              onChange={(e) =>
                                setEditingNoteText(e.target.value)
                              }
                              autoFocus
                            />
                            <div className="pp-edit-footer-row">
                              <div className="note-footer">
                                <div className="note-meta-stack">
                                  <span className="note-date">
                                    Jan 28, 2026
                                  </span>
                                  <button
                                    className="pp-evidence-icon-btn"
                                    onClick={() => openEvidencePanel(null)}
                                    title="View Evidence"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="11" cy="11" r="8"></circle>
                                      <line
                                        x1="21"
                                        y1="21"
                                        x2="16.65"
                                        y2="16.65"
                                      ></line>
                                    </svg>
                                    View Evidence
                                  </button>
                                </div>
                              </div>
                              <div className="pp-note-save-row">
                                <button
                                  className="pp-note-save-btn"
                                  onClick={() =>
                                    saveEditNote("high-1", editingNoteText)
                                  }
                                  disabled={editSavingId === "high-1"}
                                >
                                  {editSavingId === "high-1" ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="pp-note-cancel-btn"
                                  onClick={cancelEditNote}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="note-text">
                            <strong>Critical:</strong> {staticNotes["high-1"]}
                          </div>
                        )}
                        {editingNoteId !== "high-1" && (
                          <div className="note-footer">
                            <div className="note-meta-stack">
                              <span className="note-date">Jan 28, 2026</span>
                              <button
                                className="pp-evidence-icon-btn"
                                onClick={() => openEvidencePanel(null)}
                                title="View Evidence"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="11" cy="11" r="8"></circle>
                                  <line
                                    x1="21"
                                    y1="21"
                                    x2="16.65"
                                    y2="16.65"
                                  ></line>
                                </svg>
                                View Evidence
                              </button>
                            </div>
                            <button
                              className="pp-note-edit-btn"
                              onClick={() =>
                                startEditNote("high-1", staticNotes["high-1"])
                              }
                              title="Edit"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div >
                    )
                    : highAlerts?.length > 0
                      ? // عرض البيانات الحقيقية من الـ API
                      highAlerts.map((alertObj) => {
                        const noteId = alertObj.id;
                        const alertInsight = alertObj.insight;
                        const isManualNote = alertObj.is_manual === "Doctor Note";
                        const alertTitle =
                          alertObj.title || alertObj.is_manual;

                        return (
                          <div
                            className="note-item high-priority"
                            key={noteId}
                          >
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() =>
                                  startEditNote(noteId, alertInsight)
                                }
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                            {
                              editingNoteId === noteId ? (
                                <>
                                  <textarea
                                    className="pp-note-edit-textarea"
                                    value={editingNoteText}
                                    onChange={(e) =>
                                      setEditingNoteText(e.target.value)
                                    }
                                    autoFocus
                                  />
                                  <div className="pp-edit-footer-row">
                                    <div className="note-footer">
                                      <div className="note-meta-stack">
                                        <span className="note-date">
                                          {!isManualNote && (<>{alertObj.is_manual === "AI Generated" ? "🤖" : "📝"}{" "}{alertObj.is_manual} · </>)}
                                          {alertObj.date}
                                        </span>
                                        {!isManualNote && (
                                          <button
                                            className="pp-evidence-icon-btn"
                                            onClick={() => openEvidencePanel(alertObj)}
                                            title="View Evidence"
                                          >
                                            <svg
                                              width="14"
                                              height="14"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <circle
                                                cx="11"
                                                cy="11"
                                                r="8"
                                              ></circle>
                                              <line
                                                x1="21"
                                                y1="21"
                                                x2="16.65"
                                                y2="16.65"
                                              ></line>
                                            </svg>
                                            View Evidence
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="pp-note-save-row">
                                      <button
                                        className="pp-note-save-btn"
                                        onClick={() =>
                                          saveEditNote(noteId, editingNoteText)
                                        }
                                        disabled={editSavingId === noteId}
                                      >
                                        {editSavingId === noteId ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                        className="pp-note-cancel-btn"
                                        onClick={cancelEditNote}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="note-text">
                                  {!isManualNote && <strong>{alertTitle}: </strong>} {alertInsight}
                                </div>
                              )
                            }
                            {
                              editingNoteId !== noteId && (
                                <div className="note-footer">
                                  <div className="note-meta-stack">
                                    <span className="note-date">
                                      {!isManualNote && (<>{alertObj.is_manual === "AI Generated" ? "🤖" : "📝"}{" "}{alertObj.is_manual} · </>)}
                                      {alertObj.date}
                                    </span>
                                    {!isManualNote && (
                                      <button
                                        className="pp-evidence-icon-btn"
                                        onClick={() => openEvidencePanel(alertObj)}
                                        title="View Evidence"
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <circle cx="11" cy="11" r="8"></circle>
                                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        View Evidence
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    className="pp-note-delete-btn"
                                    onClick={() => openDeleteAlertModal(noteId)}
                                    title="Delete"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M8 6V4h8v2" />
                                      <path d="M19 6l-1 14H6L5 6" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                    </svg>
                                  </button>
                                </div>
                              )
                            }
                          </div>
                        );
                      })
                      : null}

                  {/* Doctor-added new notes (الجزء الخاص بإضافة نوت جديدة يدوياً) */}
                  {
                    newNotes.high.map((note) => (
                      <div className="note-item high-priority" key={note.id}>
                        {note.saved ? (
                          <>
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() => startEditNewNote(note.id)}
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                            <div className="note-text">{note.text}</div>
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">{note.date}</span>
                              </div>
                              <button
                                className="pp-note-delete-btn"
                                onClick={() => openDeleteAlertModal(note.id)}
                                title="Delete"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <textarea
                              className="pp-note-edit-textarea"
                              value={newNoteTexts[note.id] || ""}
                              onChange={(e) =>
                                setNewNoteTexts((prev) => ({
                                  ...prev,
                                  [note.id]: e.target.value,
                                }))
                              }
                              autoFocus
                              placeholder="Type your note here..."
                            />
                            <div className="pp-edit-footer-row">
                              <div className="note-footer">
                                <div className="note-meta-stack">
                                  <span className="note-date">
                                    {new Date().toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                              <div className="pp-note-save-row">
                                <button
                                  className="pp-note-save-btn"
                                  onClick={() => saveNewNote("high", note.id)}
                                  disabled={savingNoteId === note.id}
                                >
                                  {savingNoteId === note.id ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="pp-note-cancel-btn"
                                  onClick={() => cancelNewNote("high", note.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  }
                </div >
              </div >

              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon medium"></span>
                    Medium Priority Alerts
                  </h3>
                  <button
                    className="pp-add-note-btn"
                    onClick={() => addNewNote("medium")}
                  >
                    + Add Note
                  </button>
                </div>

                <div className="note-list">
                  {isLoadingAnalysis
                    ? // تعرض النوتس الثابتة فقط أثناء التحميل
                    staticNotes["medium-1"] && (
                      <div className="note-item medium-priority">
                        <div className="pp-note-actions">
                          <button
                            className="pp-note-edit-btn"
                            onClick={() =>
                              startEditNote(
                                "medium-1",
                                staticNotes["medium-1"],
                              )
                            }
                            title="Edit"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        </div>
                        {editingNoteId === "medium-1" ? (
                          <>
                            <textarea
                              className="pp-note-edit-textarea"
                              value={editingNoteText}
                              onChange={(e) =>
                                setEditingNoteText(e.target.value)
                              }
                              autoFocus
                            />
                            <div className="pp-edit-footer-row">
                              <div className="note-footer">
                                <div className="note-meta-stack">
                                  <span className="note-date">
                                    Jan 30, 2026
                                  </span>
                                  <button
                                    className="pp-evidence-icon-btn"
                                    onClick={() => openEvidencePanel(null)}
                                    title="View Evidence"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="11" cy="11" r="8"></circle>
                                      <line
                                        x1="21"
                                        y1="21"
                                        x2="16.65"
                                        y2="16.65"
                                      ></line>
                                    </svg>
                                    View Evidence
                                  </button>
                                </div>
                              </div>
                              <div className="pp-note-save-row">
                                <button
                                  className="pp-note-save-btn"
                                  onClick={() =>
                                    saveEditNote("medium-1", editingNoteText)
                                  }
                                  disabled={editSavingId === "medium-1"}
                                >
                                  {editSavingId === "medium-1" ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="pp-note-cancel-btn"
                                  onClick={cancelEditNote}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="note-text">
                            <strong>Observation:</strong>{" "}
                            {staticNotes["medium-1"]}
                          </div>
                        )}
                        {editingNoteId !== "medium-1" && (
                          <div className="note-footer">
                            <div className="note-meta-stack">
                              <span className="note-date">Jan 30, 2026</span>
                              <button
                                className="pp-evidence-icon-btn"
                                onClick={() => openEvidencePanel(null)}
                                title="View Evidence"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="11" cy="11" r="8"></circle>
                                  <line
                                    x1="21"
                                    y1="21"
                                    x2="16.65"
                                    y2="16.65"
                                  ></line>
                                </svg>
                                View Evidence
                              </button>
                            </div>
                            <button
                              className="pp-note-delete-btn"
                              onClick={() => openDeleteAlertModal("medium-1")}
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg >
                            </button >
                          </div >
                        )}
                      </div >
                    )
                    : mediumAlerts?.length > 0
                      ? // عرض البيانات الحقيقية من السيرفر
                      mediumAlerts.map((alertObj) => {
                        const isManualNote = alertObj.is_manual === "Doctor Note";
                        return (
                          <div
                            className="note-item medium-priority"
                            key={alertObj.id}
                          >
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() =>
                                  startEditNote(alertObj.id, alertObj.insight)
                                }
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                            {editingNoteId === alertObj.id ? (
                              <>
                                <textarea
                                  className="pp-note-edit-textarea"
                                  value={editingNoteText}
                                  onChange={(e) =>
                                    setEditingNoteText(e.target.value)
                                  }
                                  autoFocus
                                />
                                <div className="pp-edit-footer-row">
                                  <div className="note-footer">
                                    <div className="note-meta-stack">
                                      <span className="note-date">
                                        {!isManualNote && (<>{alertObj.is_manual === "AI Generated" ? "🤖" : "📝"}{" "}{alertObj.is_manual} · </>)}
                                        {alertObj.date}
                                      </span>
                                      {!isManualNote && (
                                        <button
                                          className="pp-evidence-icon-btn"
                                          onClick={() => openEvidencePanel(alertObj)}
                                          title="View Evidence"
                                        >
                                          <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <circle
                                              cx="11"
                                              cy="11"
                                              r="8"
                                            ></circle>
                                            <line
                                              x1="21"
                                              y1="21"
                                              x2="16.65"
                                              y2="16.65"
                                            ></line>
                                          </svg>
                                          View Evidence
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="pp-note-save-row">
                                    <button
                                      className="pp-note-save-btn"
                                      onClick={() =>
                                        saveEditNote(
                                          alertObj.id,
                                          editingNoteText,
                                        )
                                      }
                                      disabled={editSavingId === alertObj.id}
                                    >
                                      {editSavingId === alertObj.id ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      className="pp-note-cancel-btn"
                                      onClick={cancelEditNote}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="note-text">
                                {!isManualNote && <strong>
                                  {alertObj.title || alertObj.is_manual}:
                                </strong>}{" "}
                                {alertObj.insight}
                              </div>
                            )}
                            {editingNoteId !== alertObj.id && (
                              <div className="note-footer">
                                <div className="note-meta-stack">
                                  <span className="note-date">
                                    {!isManualNote && (<>{alertObj.is_manual === "AI Generated" ? "🤖" : "📝"}{" "}{alertObj.is_manual} · </>)}
                                    {alertObj.date}
                                  </span>
                                  {!isManualNote && (
                                    <button
                                      className="pp-evidence-icon-btn"
                                      onClick={() => openEvidencePanel(alertObj)}
                                      title="View Evidence"
                                    >
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line
                                          x1="21"
                                          y1="21"
                                          x2="16.65"
                                          y2="16.65"
                                        ></line>
                                      </svg>
                                      View Evidence
                                    </button>
                                  )}
                                </div>

                                <button
                                  className="pp-note-delete-btn"
                                  onClick={() =>
                                    openDeleteAlertModal(alertObj.id)
                                  }
                                  title="Delete"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                  </svg>
                                </button>
                              </div >
                            )}
                          </div >
                        );
                      })
                      : null}

                  {/* ملاحظات الطبيب المضافة يدوياً */}
                  {
                    newNotes.medium.map((note) => (
                      <div className="note-item medium-priority" key={note.id}>
                        {note.saved ? (
                          <>
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() => startEditNewNote(note.id)}
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                            <div className="note-text">{note.text}</div>
                            <div className="note-footer">
                              <span className="note-date">{note.date}</span>
                              <button
                                className="pp-note-delete-btn"
                                onClick={() => openDeleteAlertModal(note.id)}
                                title="Delete"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <textarea
                              className="pp-note-edit-textarea"
                              value={newNoteTexts[note.id] || ""}
                              onChange={(e) =>
                                setNewNoteTexts((prev) => ({
                                  ...prev,
                                  [note.id]: e.target.value,
                                }))
                              }
                              autoFocus
                              placeholder="Type your note here..."
                            />
                            <div className="pp-edit-footer-row">
                              <div className="note-footer">
                                <span className="note-date">
                                  {new Date().toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <div className="pp-note-save-row">
                                <button
                                  className="pp-note-save-btn"
                                  onClick={() => saveNewNote("medium", note.id)}
                                  disabled={savingNoteId === note.id}
                                >
                                  {savingNoteId === note.id ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="pp-note-cancel-btn"
                                  onClick={() => cancelNewNote("medium", note.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  }
                </div >
              </div >

              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon low"></span>
                    Low Priority Alerts
                  </h3>
                  <button
                    className="pp-add-note-btn"
                    onClick={() => addNewNote("low")}
                  >
                    + Add Note
                  </button>
                </div>

                <div className="note-list">
                  {isLoadingAnalysis
                    ? // نوت افتراضية تظهر أثناء التحميل
                    staticNotes["low-1"] && (
                      <div className="note-item low-priority">
                        <div className="pp-note-actions">
                          <button
                            className="pp-note-edit-btn"
                            onClick={() =>
                              startEditNote("low-1", staticNotes["low-1"])
                            }
                            title="Edit"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        </div>
                        {editingNoteId === "low-1" ? (
                          <>
                            <textarea
                              className="pp-note-edit-textarea"
                              value={editingNoteText}
                              onChange={(e) =>
                                setEditingNoteText(e.target.value)
                              }
                              autoFocus
                            />
                            <div className="pp-edit-footer-row">
                              <div className="note-footer">
                                <div className="note-meta-stack">
                                  <span className="note-date">
                                    Oct 10, 2025
                                  </span>
                                </div>
                              </div>
                              <div className="pp-note-save-row">
                                <button
                                  className="pp-note-save-btn"
                                  onClick={() =>
                                    saveEditNote("low-1", editingNoteText)
                                  }
                                  disabled={editSavingId === "low-1"}
                                >
                                  {editSavingId === "low-1" ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="pp-note-cancel-btn"
                                  onClick={cancelEditNote}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="note-text">
                            <strong>Note:</strong> {staticNotes["low-1"]}
                          </div>
                        )}
                        {editingNoteId !== "low-1" && (
                          <div className="note-footer">
                            <div className="note-meta-stack">
                              <span className="note-date">Oct 10, 2025</span>
                              <button
                                className="pp-evidence-icon-btn"
                                onClick={() => openEvidencePanel(null)}
                                title="View Evidence"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="11" cy="11" r="8"></circle>
                                  <line
                                    x1="21"
                                    y1="21"
                                    x2="16.65"
                                    y2="16.65"
                                  ></line>
                                </svg>
                                View Evidence
                              </button>
                            </div>
                            <button
                              className="pp-note-delete-btn"
                              onClick={() => openDeleteAlertModal("low-1")}
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg >
                            </button >
                          </div >
                        )}
                      </div >
                    )
                    : lowAlerts?.length > 0
                      ? // عرض بيانات السيرفر لـ Low Priority
                      lowAlerts.map((alertObj) => {
                        const isManualNote = alertObj.is_manual === "Doctor Note";
                        return (
                          <div
                            className="note-item low-priority"
                            key={alertObj.id}
                          >
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() =>
                                  startEditNote(alertObj.id, alertObj.insight)
                                }
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>

                            {
                              editingNoteId === alertObj.id ? (
                                <>
                                  <textarea
                                    className="pp-note-edit-textarea"
                                    value={editingNoteText}
                                    onChange={(e) =>
                                      setEditingNoteText(e.target.value)
                                    }
                                    autoFocus
                                  />
                                  <div className="pp-edit-footer-row">
                                    <div className="note-footer">
                                      <div className="note-meta-stack">
                                        <span className="note-date">
                                          {alertObj.date}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="pp-note-save-row">
                                      <button
                                        className="pp-note-save-btn"
                                        onClick={() =>
                                          saveEditNote(
                                            alertObj.id,
                                            editingNoteText,
                                          )
                                        }
                                        disabled={editSavingId === alertObj.id}
                                      >
                                        {editSavingId === alertObj.id ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                        className="pp-note-cancel-btn"
                                        onClick={cancelEditNote}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="note-text">
                                  {
                                    !isManualNote && <strong>
                                      {alertObj.title || "Minor Alert"}:
                                    </strong>
                                  } {" "}
                                  {alertObj.insight}
                                </div >
                              )
                            }
                            {
                              editingNoteId !== alertObj.id && (
                                <div className="note-footer">
                                  <div className="note-meta-stack">
                                    <span className="note-date">
                                      {alertObj.date}
                                    </span>
                                    {
                                      !isManualNote && (
                                        <button
                                          className="pp-evidence-icon-btn"
                                          onClick={() => openEvidencePanel(alertObj)}
                                        >
                                          <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line
                                              x1="21"
                                              y1="21"
                                              x2="16.65"
                                              y2="16.65"
                                            ></line>
                                          </svg>
                                          View Evidence
                                        </button>
                                      )
                                    }
                                  </div >
                                  <button
                                    className="pp-note-delete-btn"
                                    onClick={() =>
                                      openDeleteAlertModal(alertObj.id)
                                    }
                                    title="Delete"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M8 6V4h8v2" />
                                      <path d="M19 6l-1 14H6L5 6" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                    </svg>
                                  </button>
                                </div >
                              )
                            }
                          </div >
                        );
                      })
                      : null}

                  {/* ملاحظات الطبيب المضافة يدوياً لـ Low Priority */}
                  {
                    newNotes.low.map((note) => (
                      <div className="note-item low-priority" key={note.id}>
                        {note.saved ? (
                          <>
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() => startEditNewNote(note.id)}
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                            <div className="note-text">{note.text}</div>
                            <div className="note-footer">
                              <span className="note-date">{note.date}</span>
                              <button
                                className="pp-note-delete-btn"
                                onClick={() => openDeleteAlertModal(note.id)}
                                title="Delete"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <textarea
                              className="pp-note-edit-textarea"
                              value={newNoteTexts[note.id] || ""}
                              onChange={(e) =>
                                setNewNoteTexts((prev) => ({
                                  ...prev,
                                  [note.id]: e.target.value,
                                }))
                              }
                              autoFocus
                              placeholder="Type your note here..."
                            />
                            <div className="pp-edit-footer-row">
                              <div className="note-footer">
                                <span className="note-date">
                                  {new Date().toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              <div className="pp-note-save-row">
                                <button
                                  className="pp-note-save-btn"
                                  onClick={() => saveNewNote("low", note.id)}
                                  disabled={savingNoteId === note.id}
                                >
                                  {savingNoteId === note.id ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="pp-note-cancel-btn"
                                  onClick={() => cancelNewNote("low", note.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  }
                </div >
              </div >
            </div >
          </div >

          <div
            className={`tab-content ${activeTab === "comparative" ? "active" : ""
              }`}
            id="comparative"
          >
            <div className="card">

              {/* ── Loading state ── */}
              {comparativeLoading && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "260px" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2A66FF" strokeWidth="3" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
              )}

              {/* ── Error state ── */}
              {!comparativeLoading && comparativeError && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "#FF5C5C" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: "12px" }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ fontWeight: 600, marginBottom: "6px" }}>Failed to load analysis</p>
                  <p style={{ fontSize: "13px", color: "#8A94A6", marginBottom: "16px" }}>{comparativeError}</p>
                  <button
                    onClick={fetchComparativeAnalysis}
                    style={{ padding: "8px 20px", background: "#2A66FF", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* ── Empty state ── */}
              {!comparativeLoading && !comparativeError && comparativeLoadedFor !== null && comparativeData.length === 0 && (
                <div style={{ textAlign: "center", padding: "64px 24px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0E1A34", marginBottom: "8px" }}>No Analysis Data Available</h3>
                  <p style={{ fontSize: "14px", color: "#8A94A6", maxWidth: "380px", margin: "0 auto" }}>
                    No comparative analysis data has been generated for this patient yet. Add lab reports across multiple visits to see trend charts here.
                  </p>
                </div>
              )}

              {/* ── Data state ── */}
              {!comparativeLoading && !comparativeError && comparativeData.length > 0 && (() => {
                // Derive the max number of visits across all tests
                const maxVisits = comparativeData.reduce((max, test) => {
                  const pts = Array.isArray(test.all_points) ? test.all_points.length : 0;
                  return pts > max ? pts : max;
                }, 0);

                // Build deduplicated visit labels in order
                const visitLabels = [];
                comparativeData.forEach(test => {
                  (test.all_points || []).forEach(pt => {
                    if (!visitLabels.includes(pt.visit_label)) visitLabels.push(pt.visit_label);
                  });
                });

                // Helpers for trend styling
                const getTrendStyle = (trend, status) => {
                  const isCritical = (status || "").toLowerCase() === "critical";
                  if (trend === "up") return { bg: isCritical ? "#FFECEC" : "#E6FFF5", color: isCritical ? "#FF5C5C" : "#00C187", arrow: "↑" };
                  if (trend === "down") return { bg: isCritical ? "#FFECEC" : "#E6FFF5", color: isCritical ? "#FF5C5C" : "#00C187", arrow: "↓" };
                  return { bg: "#FFF4E6", color: "#FFA500", arrow: "—" };
                };

                const getChartColor = (trend, status) => {
                  const isCritical = (status || "").toLowerCase() === "critical";
                  if (trend === "up") return isCritical ? "#FF5C5C" : "#00C187";
                  if (trend === "down") return isCritical ? "#FF5C5C" : "#00C187";
                  return "#FFA500";
                };

                // Build SVG polyline from all_points
                const buildChartPath = (points) => {
                  if (!points || points.length === 0) return { line: "", area: "", dots: [] };
                  const W = 300, H = 160;
                  const values = points.map(p => Number(p.value));
                  const minV = Math.min(...values);
                  const maxV = Math.max(...values);
                  const range = maxV - minV;
                  
                  // Define vertical drawing area with padding to keep points away from edges
                  const topPadding = 40;
                  const bottomPadding = 40;
                  const usableHeight = H - topPadding - bottomPadding;

                  const coords = points.map((p, i) => {
                    const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
                    let y;
                    if (range === 0) {
                      // Center the point vertically if there's no variation or only one point
                      y = H / 2;
                    } else {
                      // Map values into the usable height, inverting so higher values have lower y
                      y = (H - bottomPadding) - ((Number(p.value) - minV) / range) * usableHeight;
                    }
                    return { x, y, ...p };
                  });
                  const lineD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
                  const areaD = lineD + ` L ${coords[coords.length - 1].x.toFixed(1)} ${H} L ${coords[0].x.toFixed(1)} ${H} Z`;
                  return { line: lineD, area: areaD, dots: coords };
                };

                return (
                  <>


                    {/* Chart Grid */}
                    <div className="chart-grid">
                      {comparativeData.map((test, testIdx) => {
                        const comp = test.comparison || {};
                        const trend = comp.trend || "stable";
                        const status = comp.status || "";
                        const isCritical = status.toLowerCase() === "critical";
                        const tStyle = getTrendStyle(trend, status);
                        const chartColor = getChartColor(trend, status);
                        const points = Array.isArray(test.all_points) ? test.all_points : [];
                        const { line, area, dots } = buildChartPath(points);
                        const firstValue = points.length > 0 ? points[0].value : "N/A";
                        const currentValue = comp.current_value != null ? comp.current_value : "N/A";
                        const changePercent = comp.change_percentage;
                        const noPrevious = comp.previous_value === "No previous" || comp.previous_value == null;
                        const gradId = `ca-grad-${testIdx}`;

                        return (
                            <div
                              key={testIdx}
                              className="chart-card"
                              style={{
                                transition: "all 0.5s ease-in-out",
                                position: "relative",
                              }}
                            >


                            {/* Card Header */}
                            <div className="chart-header">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                                <h3 className="chart-title" style={{ margin: 0 }}>{test.test_name}</h3>
                              </div>
                              {!noPrevious && (
                                <span
                                  className="chart-trend"
                                  style={{ background: tStyle.bg, color: tStyle.color, flexShrink: 0, marginLeft: "8px", transition: "all 0.5s ease-in-out" }}
                                >
                                  {tStyle.arrow} {Math.abs(changePercent ?? 0).toFixed(1)}%
                                </span>
                              )}
                            </div>

                            {/* SVG Chart */}
                            <div className="mini-chart" style={{ position: "relative" }}>
                              <svg
                                className="chart-canvas"
                                viewBox="0 0 300 160"
                                style={{ overflow: "visible" }}
                                onMouseLeave={() => setChartTooltip(prev => ({ ...prev, visible: false }))}
                              >
                                <defs>
                                  <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: chartColor, stopOpacity: 0.12 }} />
                                    <stop offset="100%" style={{ stopColor: chartColor, stopOpacity: 0 }} />
                                  </linearGradient>
                                </defs>
                                {points.length > 1 && (
                                  <>
                                    <path d={area} fill={`url(#${gradId})`} style={{ transition: "all 0.5s ease" }} />
                                    <path d={line} stroke={chartColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "all 0.5s ease" }} />
                                  </>
                                )}
                                {points.length === 1 && (
                                  <line x1="0" y1="80" x2="300" y2="80" stroke={chartColor} strokeWidth="2" strokeDasharray="6 4" opacity="0.4" />
                                )}
                                {dots.map((dot, di) => (
                                  <g key={di}>
                                    <circle
                                      cx={dot.x}
                                      cy={dot.y}
                                      r="6"
                                      fill="transparent"
                                      style={{ cursor: "pointer" }}
                                      onMouseEnter={(e) => {
                                        const svg = e.currentTarget.closest("svg");
                                        const svgRect = svg.getBoundingClientRect();
                                        setChartTooltip({
                                          visible: true,
                                          x: dot.x * (svgRect.width / 300),
                                          y: dot.y * (svgRect.height / 160),
                                          date: dot.date || "",
                                          status: dot.status || "",
                                          value: `${dot.value} ${test.unit || ""}`,
                                          testIdx,
                                          pointIdx: di,
                                        });
                                      }}
                                    />
                                    <circle
                                      cx={dot.x}
                                      cy={dot.y}
                                      r={chartTooltip.visible && chartTooltip.testIdx === testIdx && chartTooltip.pointIdx === di ? "6" : "4"}
                                      fill={chartColor}
                                      stroke="white"
                                      strokeWidth="1.5"
                                      style={{ pointerEvents: "none" }}
                                    />
                                  </g>
                                ))}
                              </svg>

                              {/* Tooltip */}
                              {chartTooltip.visible && chartTooltip.testIdx === testIdx && (
                                <div style={{
                                  position: "absolute",
                                  left: `${chartTooltip.x}px`,
                                  top: chartTooltip.y < 80 ? `${chartTooltip.y + 15}px` : `${chartTooltip.y - 85}px`,
                                  transform: "translateX(-50%)",
                                  background: "rgba(255, 255, 255, 0.96)",
                                  backdropFilter: "blur(8px)",
                                  border: "1px solid rgba(42, 102, 255, 0.15)",
                                  color: "#0E1A34",
                                  padding: "10px 14px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  pointerEvents: "none",
                                  zIndex: 100,
                                  whiteSpace: "nowrap",
                                  boxShadow: "0 8px 24px rgba(14, 26, 52, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)",
                                  transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                                }}>
                                  <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "2px", color: "#0E1A34" }}>{chartTooltip.value}</div>
                                  {chartTooltip.date && <div style={{ color: "#8A94A6", fontSize: "11px", fontWeight: 600 }}>{chartTooltip.date}</div>}
                                  {chartTooltip.status && (
                                    <div style={{
                                      marginTop: "6px",
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                      color: chartTooltip.status.toLowerCase() === "critical" ? "#FF5C5C" : "#00C187",
                                    }}>
                                      {chartTooltip.status}
                                    </div>
                                  )}
                                  {/* tooltip arrow */}
                                  <div style={{
                                    position: "absolute",
                                    ...(chartTooltip.y < 80 ? { top: "-6px" } : { bottom: "-6px" }),
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    width: 0,
                                    height: 0,
                                    borderLeft: "6px solid transparent",
                                    borderRight: "6px solid transparent",
                                    ...(chartTooltip.y < 80 
                                      ? { borderBottom: "6px solid rgba(255, 255, 255, 0.96)" } 
                                      : { borderTop: "6px solid rgba(255, 255, 255, 0.96)" }
                                    ),
                                  }} />
                                </div>
                              )}
                            </div>

                            {/* Footer Stats */}
                            <div className="chart-stats">
                              <div className="stat-col">
                                <div className="stat-label">Initial</div>
                                <div className="stat-value">{firstValue} {test.unit || ""}</div>
                              </div>
                              <div className="stat-col">
                                <div className="stat-label">Current</div>
                                <div className="stat-value" style={{ color: chartColor }}>{currentValue} {test.unit || ""}</div>
                              </div>
                              <div className="stat-col">
                                <div className="stat-label">Change</div>
                                <div className="stat-value" style={{ color: noPrevious ? "#8A94A6" : chartColor, transition: "all 0.5s ease-in-out" }}>
                                  {noPrevious
                                    ? "N/A"
                                    : `${(changePercent ?? 0) >= 0 ? "+" : ""}${(changePercent ?? 0).toFixed(1)}%`
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

            </div>
          </div>



          {/* Decision Support Tab */}
          <div
            className={`tab-content ${activeTab === "decision" ? "active" : ""
              }`}
            id="decision"
          >
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: "20px" }}>
                <span className="ai-pulse"></span>
                AI-Powered Decision Support
              </h2>

              {/* Priority: sub-loading/generating → locked → ds-loading → error → empty → data */}
              {isSubLoading || decisionSupportLoading || isGeneratingDecisionSupport ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2A66FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
              ) : shouldShowLockedDecisionSupport ? (
                <div className="lf-wrapper">
                  {/* Blurred dummy background */}
                  <div className="lf-dummy" aria-hidden="true">
                    <div className="likelihood-stack">
                      <div className="likelihood-card high">
                        <div className="likelihood-header">
                          <div>
                            <div style={{ fontSize: "11px", color: "#FF5C5C", marginBottom: "3px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>HIGH LIKELIHOOD</div>
                            <div className="likelihood-title">Differential Consideration A</div>
                          </div>
                          <div className="confidence" style={{ color: "#FF5C5C", flexShrink: 0, marginLeft: "16px" }}>87%</div>
                        </div>
                        <div className="reasoning"><strong>Clinical Reasoning:</strong> Based on lab results, imaging, and patient history patterns.</div>
                      </div>
                      <div className="likelihood-card medium">
                        <div className="likelihood-header">
                          <div>
                            <div style={{ fontSize: "11px", color: "#FFA500", marginBottom: "3px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>MODERATE LIKELIHOOD</div>
                            <div className="likelihood-title">Differential Consideration B</div>
                          </div>
                          <div className="confidence" style={{ color: "#FFA500", flexShrink: 0, marginLeft: "16px" }}>54%</div>
                        </div>
                        <div className="reasoning"><strong>Clinical Reasoning:</strong> Secondary indicators suggest an alternative presentation pathway.</div>
                      </div>
                      <div className="likelihood-card low">
                        <div className="likelihood-header">
                          <div>
                            <div style={{ fontSize: "11px", color: "#8A94A6", marginBottom: "3px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>LOW LIKELIHOOD</div>
                            <div className="likelihood-title">Differential Consideration C</div>
                          </div>
                          <div className="confidence" style={{ color: "#8A94A6", flexShrink: 0, marginLeft: "16px" }}>21%</div>
                        </div>
                        <div className="reasoning"><strong>Clinical Reasoning:</strong> Low correlation with current clinical presentation and workup.</div>
                      </div>
                    </div>
                  </div>
                  <LockedFeatureOverlay
                    title="Unlock Smarter Clinical Decisions"
                    description="Get AI-powered differential insights to support faster and more accurate diagnoses."
                    primaryLabel={planNameLower === "pro" ? "Upgrade to Premium" : "Upgrade to Pro"}
                    onPrimary={() => navigate("/subscription")}
                    secondaryLabel="Or use Pay-Per-Use"
                    onSecondary={() => navigate("/subscription")}
                  />
                </div>
              ) : (
                <>
              {/* ── Error state ── (only reached when data exists but fetch failed) */}
              {!shouldShowLockedDecisionSupport && !decisionSupportLoading && decisionSupportError && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    color: decisionSupportError === "401" ? "#FF5C5C" : "#8A94A6",
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: "16px", opacity: 0.6 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>
                    {decisionSupportError === "401"
                      ? "Session Expired"
                      : "Unable to Load Decision Support"}
                  </p>
                  <p style={{ fontSize: "13px", opacity: 0.75, marginBottom: "20px" }}>
                    {decisionSupportError === "401"
                      ? "Your session has expired. Please log in again to continue."
                      : decisionSupportError}
                  </p>
                  {decisionSupportError === "401" ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate("/login")}
                    >
                      Go to Login
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={fetchDecisionSupport}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* ── Empty state ── (only reached if data is STILL empty despite retry, but we shifted to locked UI above, so this acts as final fallback) */}
              {!shouldShowLockedDecisionSupport && !(canAccessDecisionSupportNow && hasTriggeredDecisionSupportGeneration.current) && !decisionSupportLoading && !decisionSupportError && Array.isArray(decisionSupport) && decisionSupport.length === 0 && decisionSupportLoadedFor === patientId && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    color: "#8A94A6",
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: "16px", opacity: 0.5 }}
                  >
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  <p style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
                    No decision support available yet.
                  </p>
                  <p style={{ fontSize: "13px", opacity: 0.7 }}>
                    Decision support data will appear here once reports are processed.
                  </p>
                </div>
              )}

              {/* ── Data state ── */}
              {!decisionSupportLoading && !decisionSupportError && Array.isArray(decisionSupport) && decisionSupport.length > 0 && (
                <div className="likelihood-stack">
                  {decisionSupport.map((item) => {
                    const statusUpper = (item.status || "").toUpperCase();
                    const isHigh = statusUpper.includes("HIGH");
                    const isLow = statusUpper.includes("LOW");
                    const statusColor = isHigh ? "#FF5C5C" : isLow ? "#8A94A6" : "#FFA500";
                    const cardClass = isHigh ? "high" : isLow ? "low" : "medium";

                    return (
                      <div
                        key={item.id}
                        className={`likelihood-card ${cardClass} ${expandedLikelihoods[item.id] ? "expanded" : ""}`}
                        onClick={() => toggleLikelihood(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="likelihood-header">
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: statusColor,
                                marginBottom: "3px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {item.status}
                            </div>
                            <div className="likelihood-title">{item.condition}</div>
                          </div>
                          <div
                            className="confidence"
                            style={{
                              color: statusColor,
                              flexShrink: 0,
                              marginLeft: "16px",
                            }}
                          >
                            {item.probability}
                          </div>
                        </div>
                        <div className="reasoning">
                          <strong>Clinical Reasoning:</strong>{" "}
                          {item.clinical_reasoning}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}
            </div>
          </div>

          {/* Medications & Tasks Tab */}
          <div
            className={`tab-content ${activeTab === "medications-tasks" ? "active" : ""}`}
            id="medications-tasks"
          >
            <MedicationsAndTasksTab
              patientId={patientId}
              initialNextVisitDate={nextVisitDate}
              onNextVisitSaved={(date) => setNextVisitDate(date)}
            />
          </div>

          {/* Activity Log Tab */}
          <div
            className={`tab-content ${activeTab === "activity" ? "active" : ""}`}
            id="activity"
          >
            <div className="card">
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#0E1A34",
                  marginBottom: "18px",
                }}
              >
                Recent Activity
              </h3>

              {/* Loading */}
              {activitiesLoading && (
                <p style={{ color: "#8A94A6", fontSize: "14px", marginBottom: "12px", fontStyle: "italic" }}>
                  {activities.length > 0 ? "Refreshing..." : "Loading..."}
                </p>
              )}

              {/* Error */}
              {!activitiesLoading && activitiesError && (
                <p style={{ color: "#FF5C5C", fontSize: "14px" }}>{activitiesError}</p>
              )}

              {/* Empty */}
              {!activitiesLoading && !activitiesError && activitiesLoadedFor === patientId && activities.length === 0 && (
                <p style={{ color: "#8A94A6", fontSize: "14px" }}>No activity yet.</p>
              )}

              {/* Data */}
              {!activitiesError && activities.length > 0 && (
                <div className="activity-timeline" style={{ opacity: activitiesLoading ? 0.6 : 1, transition: "opacity 0.2s" }}>
                  {activities.map((activity) => (
                    <div className="activity-item" key={activity.id}>
                      <div className="activity-text">{activity.message}</div>
                      <div className="activity-time">{activity.time_ago || activity.created_at}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Trigger */}
      <div className="chatbot-trigger" onClick={toggleChat}>
        <div className="chatbot-tooltip">DiagnoBot</div>
        <img src={diagnobotImg} alt="DiagnoBot" className="chatbot-icon" />
      </div>

      {/* Chatbot Panel */}
      <div
        className={`chatbot-panel ${isChatOpen ? "active" : ""}`}
        id="chatPanel"
      >
        <div className="chat-header">
          <div>
            <div style={{ fontWeight: 600 }}>AI Assistant</div>
            <div style={{ fontSize: "11px", opacity: 0.9 }}>
              Always here to help
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleChat();
            }}
            style={{
              position: "relative",
              zIndex: 50,
              pointerEvents: "auto",
              background: "none",
              border: "none",
              color: "white",
              fontSize: "22px",
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>
        <div className="chat-messages" id="chatMessages">
          {isSubLoading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, minHeight: "120px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2A66FF" strokeWidth="3" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          ) : shouldShowLockedChatbot ? (
            <>
              {/* Blurred dummy chat background */}
              <div className="lf-chat-dummy" aria-hidden="true">
                <div className="message ai">Hello! How can I assist you today?</div>
                <div className="message user">What are the latest lab findings?</div>
                <div className="message ai">Based on the patient file, the key findings include...</div>
              </div>
              <LockedFeatureOverlay
                compact
                title="Meet Your AI Assistant"
                description="Ask anything about your patient and get instant, source-based answers."
                primaryLabel="Upgrade to Premium"
                onPrimary={() => { toggleChat(); navigate("/subscription"); }}
                secondaryLabel="Or use Pay-Per-Use"
                onSecondary={() => { toggleChat(); navigate("/subscription"); }}
              />
            </>
          ) : (
            <>
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.type}${msg.preparing ? " preparing" : ""}`}
            >
              {msg.text}
            </div>
          ))}
          {isChatSending && !isChatPreparing && (
            <div className="message ai chat-typing">
              <span /><span /><span />
            </div>
          )}
          <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Ask me anything..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleChatEnter}
            disabled={shouldShowLockedChatbot || isChatSending || isChatPreparing}
          />
          <button
            className="btn btn-primary"
            onClick={sendMessage}
            disabled={shouldShowLockedChatbot || isChatSending || isChatPreparing}
          >
            {isChatPreparing ? "Preparing..." : isChatSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
      <EvidencePanel
        isOpen={evidencePanel.open}
        onClose={() => setEvidencePanel(p => ({ ...p, open: false }))}
        sourceFile={sourceFile}
        selectedAlert={evidencePanel.selectedAlert}
      />
    </div>
  );
};

export default PatientProfile;
