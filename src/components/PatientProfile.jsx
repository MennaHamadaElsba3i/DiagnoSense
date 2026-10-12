import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import Swal from "sweetalert2";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { getDoctorInitials } from "./Dashboard";
import {
  getPatientAnalysisAPI,
  getPatientOverviewAPI,
  getPatientKeyInfoAPI,
  addPatientKeyInfoNoteAPI,
  patchKeyPointAPI,
  deleteKeyPointAPI,
  updatePatientStatusAPI,
  getDecisionSupportAPI,
  reAnalyzePatientDecisionSupportAPI,
  getPatientActivitiesAPI,
  getComparativeAnalysisAPI,
  sendChatbotMessageAPI,
  updatePatientAPI,
  getPatientForEditAPI,
  subscribeToPlanAPI,
  subscribeToPayPerUseAPI,
  cancelSubscriptionAPI,
  getSubscriptionPlansAPI,
} from "./mockAPI";
import echo from "./echo";
import { getJsonCookie } from "./cookieUtils";
import EvidencePanel from "../components/EvidencePanel.jsx";
import { useTranscription } from "../hooks/useTranscription";
import { getDirection, getTextAlign } from "../utils/textUtils";

import diagnobotImg from "../assets/DiagnoBot.png";
import diagnobotCryingImg from "../assets/Diagnobot_Crying.png";
import Unauthorized from "./Unauthorized";
import { useSidebar } from "./SidebarContext";
import { useSubscription } from "./SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar.jsx";
import "../css/PatientProfile.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import MedicationsAndTasksTab from "../components/MedicationsAndTasksTab.jsx";
import { useNotifications } from "./NotificationsContext";
import ConfirmModal from "./ConfirmModal.jsx";
import LockedFeatureOverlay from "./LockedFeatureOverlay.jsx";

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const PatientProfile = () => {
  // ── Hook-based state / context (Must be initialized first at the absolute top) ──
  const {
    credits,
    isCreditsLoading,
    subscriptionData,
    isSubLoading,
    refreshSubscription: refreshSubscriptionCtx,
    refreshCredits: refreshCreditsCtx,
  } = useSubscription();

  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const {
    unreadCount,
    openNotifications,
    refreshNotifications: refreshNotificationsCtx,
    triggerToast,
  } = useNotifications();

  const navigate = useNavigate();
  const { patientId } = useParams();
  const location = useLocation();

  // ── Overview API state ──
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  // ── Evidence Panel state ──
  const [sourceFile, setSourceFile] = useState(null);
  const [evidencePanel, setEvidencePanel] = useState({
    open: false,
    evidence: [],
    alertTitle: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Decision Support API state ──
  const [decisionSupport, setDecisionSupport] = useState([]);
  const [decisionSupportLoading, setDecisionSupportLoading] = useState(false);
  const [decisionSupportError, setDecisionSupportError] = useState(null);
  const [decisionSupportLoadedFor, setDecisionSupportLoadedFor] =
    useState(null);

  // ── Activity Log API state ──
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState(null);
  const [activitiesLoadedFor, setActivitiesLoadedFor] = useState(null);
  const [activitiesCurrentPage, setActivitiesCurrentPage] = useState(1);
  const [activitiesLastPage, setActivitiesLastPage] = useState(1);

  // ── Comparative Analysis API state ──
  const [comparativeData, setComparativeData] = useState([]);
  const [comparativeLoading, setComparativeLoading] = useState(false);
  const [comparativeError, setComparativeError] = useState(null);
  const [comparativeLoadedFor, setComparativeLoadedFor] = useState(null);
  // Tooltip state for SVG chart hover
  const [chartTooltip, setChartTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: "",
    status: "",
    value: "",
    testIdx: -1,
    pointIdx: -1,
  });

  // If Add Patient flow passes activeTab in navigation state, open that tab directly
  const initialTab = location.state?.activeTab || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [visitedTabs, setVisitedTabs] = useState(
    initialTab !== "overview"
      ? { overview: true, [initialTab]: true }
      : { overview: true },
  );

  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  const tabNavRef = useRef(null);
  const [showBack, setShowBack] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // Check if scroll arrows are needed
  const checkScrollButtons = () => {
    const el = tabNavRef.current;
    if (!el) return;
    setShowBack(el.scrollLeft > 0);
    setShowNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, []);

  const scrollTabs = (direction) => {
    const el = tabNavRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "next" ? 150 : -150,
      behavior: "smooth",
    });
    setTimeout(checkScrollButtons, 300);
  };

  useEffect(() => {
    const el = tabNavRef.current;
    if (!el) return;
    const activeBtn = el.querySelector(".tab-btn.active");
    if (activeBtn) {
      const elRect = el.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      // Only scroll if the button is not fully visible
      if (btnRect.left < elRect.left || btnRect.right > elRect.right) {
        const scrollPos =
          activeBtn.offsetLeft - el.clientWidth / 2 + activeBtn.clientWidth / 2;
        el.scrollTo({ left: scrollPos, behavior: "smooth" });
      }
    }
    // Always check buttons after a small delay to allow DOM to settle
    setTimeout(checkScrollButtons, 300);
  }, [activeTab]);

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

  // ── Next Visit Date (lifted from MedicationsAndTasksTab so it survives tab switches) ──
  const [nextVisitDate, setNextVisitDate] = useState(null); // "YYYY-MM-DD" raw string
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [isChatPreparing, setIsChatPreparing] = useState(false);
  const chatChannelRef = useRef(null); // guard against duplicate realtime listeners
  const isChatSendingRef = useRef(false);

  useEffect(() => {
    if (!isChatSending) {
      isChatSendingRef.current = false;
    }
  }, [isChatSending]);

  // Auto-scroll transcript container while recording
  useEffect(() => {
    const textarea = document.getElementById("chat-textarea");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = chatInput ? `${Math.min(textarea.scrollHeight, 120)}px` : "auto";
      textarea.scrollTop = textarea.scrollHeight;
    }
  }, [chatInput]);

  const [selectedStatus, setSelectedStatus] = useState(() => {
    try {
      const persisted = localStorage.getItem("currentPatient");
      if (!persisted) return "under review";
      const parsed = JSON.parse(persisted);
      const raw = (parsed?.status || "")
        .toLowerCase()
        .trim()
        .replace(/_/g, " ");
      return ["stable", "critical", "under review"].includes(raw)
        ? raw
        : "under review";
    } catch {
      return "under review";
    }
  });
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Removed Sniper-Static Header Logic in favor of robust CSS layout

  const [isUpgradeConfirmOpen, setIsUpgradeConfirmOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null); // { id, name, price, type: 'recurring' | 'ppu' }
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [pendingFeatureToOpen, setPendingFeatureToOpen] = useState(null); // 'decision' | 'chatbot'
  const [availablePlans, setAvailablePlans] = useState([]);

  //  Add-note API state
  const [keyInfoOverride, setKeyInfoOverride] = useState({
    high: [],
    medium: [],
    low: [],
  });
  const [addNoteToast, setAddNoteToast] = useState(null); // null | error string
  const [savingNoteId, setSavingNoteId] = useState(null); // tracks which new note is being saved
  const [editSavingId, setEditSavingId] = useState(null); // tracks which existing note edit is being saved

  const keyInfoData = location.state?.keyInfoData || null;

  // Tracks whether we've already seeded keyInfo from navigation state
  const [keyInfoSeeded, setKeyInfoSeeded] = useState(false);

  // ── Key info fetched from backend (View Details path) ──
  const [keyInfo, setKeyInfo] = useState(null);
  // OCR source files returned by the v1 key-info endpoint
  const [keyInfoOcrFiles, setKeyInfoOcrFiles] = useState([]);
  // Whether the backend is still processing documents
  const [keyInfoStillProcessing, setKeyInfoStillProcessing] = useState(false);

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

  const [chatMessages, setChatMessages] = useState(() => {
    try {
      if (patientId) {
        const stored = sessionStorage.getItem(`DiagnoBot_chat_${patientId}`);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
    return [];
  });

  // Load chat history if patientId changes
  useEffect(() => {
    if (patientId) {
      try {
        const stored = sessionStorage.getItem(`DiagnoBot_chat_${patientId}`);
        if (stored) {
          setChatMessages(JSON.parse(stored));
        } else {
          setChatMessages([]);
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, [patientId]);

  // Save chat history on update
  useEffect(() => {
    if (patientId && chatMessages.length > 0) {
      sessionStorage.setItem(`DiagnoBot_chat_${patientId}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, patientId]);
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
    setSelectedStatus(newStatus); // optimistic update
    setIsStatusUpdating(true);

    try {
      const res = await updatePatientStatusAPI(patientId, newStatus);
      if (res && res.success) {
        // Confirm with backend's canonical value (normalised)
        const confirmed = (res.data?.status || newStatus)
          .toLowerCase()
          .trim()
          .replace(/_/g, " ");
        const valid = ["stable", "critical", "under review"].includes(
          confirmed,
        );
        setSelectedStatus(valid ? confirmed : newStatus);

        // Notify PatientList of the change
        window.dispatchEvent(
          new CustomEvent("patientStatusUpdated", {
            detail: { patientId, status: valid ? confirmed : newStatus },
          }),
        );
        // No success toast — the active badge highlight is the visual feedback
      } else {
        setSelectedStatus(prevStatus); // rollback
        const isAuthError =
          res?.message?.includes("401") ||
          res?.message?.includes("403") ||
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
      setSelectedStatus(prevStatus); // rollback
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

  const [keyInfoLoadedFor, setKeyInfoLoadedFor] = useState(null);

  // ── Fetch Key Important Info from backend (both flows) ──
  useEffect(() => {
    if (!patientId || !visitedTabs["keyinfo"]) {
      if (!patientId) setIsLoadingAnalysis(false);
      return;
    }
    if (keyInfoLoadedFor === patientId) return;

    // Seed keyInfo with navigation-state data so the UI isn't blank during the fetch.
    // The fetch will overwrite this with real mutable state, enabling edit/delete in both flows.
    if (keyInfoData && !keyInfoSeeded) {
      setKeyInfo(keyInfoData);
      setKeyInfoSeeded(true);
    }
    const fetchKeyInfo = async () => {
      setIsLoadingAnalysis(true);
      try {
        const res = await getPatientKeyInfoAPI(patientId);

        // ── 401 / unauthenticated ──
        const is401 =
          res?.message?.toLowerCase().includes("unauthenticated") ||
          res?.message?.includes("401");
        if (is401) {
          console.error("[keyInfo] unauthenticated:", res.message);
          setIsLoadingAnalysis(false);
          return;
        }

        // ── Explicit failure or missing data ──
        if (!res || res.success === false || !res.data) {
          console.error("[keyInfo] fetch failed:", res?.message);
          setIsLoadingAnalysis(false);
          return;
        }

        const data = res.data;

        // ── still_processing ──
        const stillProcessing = data.still_processing === true;
        setKeyInfoStillProcessing(stillProcessing);
        if (stillProcessing) {
          console.log(
            "[keyInfo] still_processing=true — showing partial data if available",
          );
        }

        // ── OCR source files (used by Evidence Panel) ──
        const ocrFiles = Array.isArray(data.ocr_files) ? data.ocr_files : [];
        setKeyInfoOcrFiles(ocrFiles);
        if (ocrFiles.length > 0) setSourceFile(ocrFiles[0]);

        // ── Normalize key_points → { high, medium, low } ──
        const normalizeAlerts = (arr) =>
          Array.isArray(arr)
            ? arr.map((kp) => ({
                ...kp,
                // Fallback to is_manual if backend is still sending old format, else use new is_ai_generated
                is_ai_generated: kp.is_ai_generated ?? kp.is_manual ?? "",
              }))
            : [];

        const rawKeyPoints = data.key_points ?? {};
        const normalized = {
          high: normalizeAlerts(rawKeyPoints.high),
          medium: normalizeAlerts(rawKeyPoints.medium),
          low: normalizeAlerts(rawKeyPoints.low),
        };

        setKeyInfo(normalized);
        setKeyInfoLoadedFor(patientId);
      } catch (err) {
        console.error("[keyInfo] unexpected error:", err);
      }
      setIsLoadingAnalysis(false);
    };
    fetchKeyInfo();
  }, [patientId, visitedTabs, keyInfoLoadedFor, keyInfoData, keyInfoSeeded]);

  // ── Fetch Patient Overview on mount ──
  useEffect(() => {
    if (!patientId) {
      setOverviewLoading(false);
      return;
    }
    console.log("[overview] patientId", patientId);
    setVisitedTabs({ overview: true });

    const fetchOverview = async () => {
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        const res = await getPatientOverviewAPI(patientId);
        console.log("[overview] response", res);
        if (res.success === false) {
          console.error("[overview] error", res.message);
          setOverviewError(res.message || "Failed to load patient overview");
          const isNotFound = res.status === 404 || (res.message && res.message.toLowerCase().includes("not found"));
          const isForbidden = res.status === 403 || res.status === 401 || (res.message && (res.message.toLowerCase().includes("unauthorized") || res.message.toLowerCase().includes("forbidden") || res.message.toLowerCase().includes("this action is unauthorized")));
          if (isNotFound) {
            setNotFound(true);
          } else if (isForbidden) {
            setIsUnauthorized(true);
          }
        } else {
          // API shape: { success: true, data: [ {...patientObject...} ] }
          // Extract the first element of the array; fall back gracefully
          const raw = res?.data;
          const patient = Array.isArray(raw) ? raw[0] : (raw ?? res);
          console.log("[overview] extracted patient", patient);
          setOverviewData(patient);

          // Seed next visit date from overview if backend includes it
          const nvd =
            patient?.next_visit_date ||
            patient?.next_appointment_date ||
            patient?.next_appointment ||
            null;
          if (nvd) setNextVisitDate(nvd);

          // Sync status pill: normalize to "stable" | "critical" | "under review"
          const normalized = (patient?.status || "")
            .toLowerCase()
            .trim()
            .replace(/_/g, " ");
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

  // ── Subscription Upgrade Logic ──

  useEffect(() => {
    const fetchPlans = async () => {
      const res = await getSubscriptionPlansAPI();
      if (res && res.success) {
        setAvailablePlans(res.data);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const handleStripeMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "STRIPE_SUCCESS") {
        console.log("[PatientProfile] Stripe success received.");
        refreshSubscriptionCtx();
        refreshCreditsCtx();
        if (pendingFeatureToOpen === "decision") {
          // Stripe popup path: upgrade/pay-per-use confirmed via Stripe checkout.
          // Trigger re-analysis for old patients that never had Decision Support.
          triggerReAnalyzeAndPoll();
        }
        if (pendingFeatureToOpen === "chatbot") {
          // Stripe popup path for DiagnoBot upgrade.
          // Seed the welcome message so the chatbot opens and locked overlay
          // disappears as soon as subscription context re-renders with the new plan.
          triggerReAnalyzeAndPoll();
          setIsChatOpen(true);
          setChatMessages((prev) => {
            if (prev.length > 0) return prev; // already seeded
            const user =
              typeof getJsonCookie === "function"
                ? (getJsonCookie("user") ?? {})
                : {};
            const doctorName = user?.name || user?.user?.name || "Doctor";
            return [
              {
                type: "ai",
                text: `Hello Dr. ${doctorName}, DiagnoBot is now unlocked! How can I assist you today?`,
              },
            ];
          });
        }
        setIsUpgrading(false);
        setIsUpgradeConfirmOpen(false);
      }
    };
    window.addEventListener("message", handleStripeMessage);
    return () => window.removeEventListener("message", handleStripeMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSubscriptionCtx, refreshCreditsCtx, pendingFeatureToOpen]);

  const initiateUpgrade = (planName, targetType, feature) => {
    let target = null;
    if (targetType === "ppu") {
      target = { id: "Pay-per-use", name: "Pay-Per-Use", type: "ppu" };
    } else {
      const plan = availablePlans.find(
        (p) => p.name.toLowerCase() === planName.toLowerCase(),
      );
      if (plan) {
        target = {
          id: plan.id,
          name: plan.name,
          type: "recurring",
          price: plan.price,
        };
      }
    }

    if (target) {
      setUpgradeTarget(target);
      setPendingFeatureToOpen(feature);
      setIsUpgradeConfirmOpen(true);
    }
  };

  const handleUpgradeConfirm = async () => {
    if (!upgradeTarget || isUpgrading) return;
    setIsUpgrading(true);

    try {
      // 1. Cancel existing recurring subscription if upgrading to another recurring plan
      if (
        subscriptionData?.billing_mode === "subscription" &&
        upgradeTarget.type === "recurring"
      ) {
        console.log("[Upgrade] Cancelling current subscription first...");
        await cancelSubscriptionAPI();
      }

      // 2. Subscribe to new plan
      let res;
      if (upgradeTarget.type === "ppu") {
        res = await subscribeToPayPerUseAPI();
      } else {
        res = await subscribeToPlanAPI(upgradeTarget.id);
      }

      if (res && res.success) {
        const paymentUrl =
          res.payment_url ||
          res.checkout_url ||
          res.url ||
          (res.data &&
            (res.data.payment_url || res.data.checkout_url || res.data.url));
        if (paymentUrl) {
          window.open(paymentUrl, "stripe_checkout", "width=600,height=700");
          // loading remains true until stripe message or manual close
        } else {
          await refreshSubscriptionCtx();
          await refreshCreditsCtx();
          refreshNotificationsCtx?.();

          if (pendingFeatureToOpen === "decision") {
            // No-Stripe-redirect path: upgrade/pay-per-use resolved immediately
            // (e.g. wallet payment). Trigger re-analysis for old patients.
            triggerReAnalyzeAndPoll();
          }

          if (pendingFeatureToOpen === "chatbot") {
            // No-Stripe-redirect path for DiagnoBot (e.g. wallet / PPU).
            // Subscription data has just been refreshed above, so canUseChatbotNow
            // will be true on the next render. Seed the welcome message and open
            // the chat panel so the user can start typing immediately.
            triggerReAnalyzeAndPoll();
            setIsChatOpen(true);
            setChatMessages((prev) => {
              if (prev.length > 0) return prev; // already seeded by toggleChat
              const user =
                typeof getJsonCookie === "function"
                  ? (getJsonCookie("user") ?? {})
                  : {};
              const doctorName = user?.name || user?.user?.name || "Doctor";
              const patientName =
                overviewData?.name ??
                overviewData?.patientName ??
                overviewData?.full_name ??
                "this patient";
              return [
                {
                  type: "ai",
                  text: `Hello Dr. ${doctorName}, DiagnoBot is now unlocked! How can I assist you with ${patientName}'s case today?`,
                },
              ];
            });
          }

          setIsUpgradeConfirmOpen(false);
          setIsUpgrading(false);
        }
      } else {
        setIsUpgradeConfirmOpen(false);
        setIsUpgrading(false);
      }
    } catch (err) {
      console.error("[Upgrade] error:", err);
      setIsUpgradeConfirmOpen(false);
      setIsUpgrading(false);
      
      if (err.response && err.response.status === 403) {
        const backendMessage = err.response.data?.message || err.message;
        triggerToast({
          title: "Subscription Failed",
          message: backendMessage,
        });
      }
    }
  };

  const [selectedReport, setSelectedReport] = useState(null);

  // Inline note editing state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Doctor-added new notes per priority section
  const [newNotes, setNewNotes] = useState({ high: [], medium: [], low: [] });
  const [newNoteTexts, setNewNoteTexts] = useState({});

  const [recordingNoteId, setRecordingNoteId] = useState(null);

  const { isRecording, isConnecting, toggleRecording, stopRecording } =
    useTranscription(
      useCallback(
        (text) => {
          if (recordingNoteId === "diagnobot") {
            setChatInput((prev) => prev + text);
          } else if (recordingNoteId === editingNoteId) {
            setEditingNoteText((prev) => prev + text);
          } else if (recordingNoteId) {
            setNewNoteTexts((prev) => ({
              ...prev,
              [recordingNoteId]: (prev[recordingNoteId] || "") + text,
            }));
          }
        },
        [recordingNoteId, editingNoteId],
      ),
    );

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
    if (recordingNoteId === id) {
      stopRecording();
      setRecordingNoteId(null);
    }
    const insight = (newNoteTexts[id] || "").trim();
    if (!insight || savingNoteId === id) return; // empty-text guard + prevent double submit
    setSavingNoteId(id);

    if (!patientId) {
      console.error("[add-note] patientId is missing - cannot submit");
      setAddNoteToast("Cannot save note: patient ID is unavailable.");
      return;
    }

    try {
      const res = await addPatientKeyInfoNoteAPI(patientId, {
        insight,
        priority,
      });
      console.log("[add-note] response:", res);

      if (res && res.success) {
        // Backend may return { data: { id, ... } } or { data: { data: { id, ... } } }
        const newNote = res.data?.data ?? res.data;
        console.log(
          "[add-note] note saved — id:",
          newNote?.id,
          "| full note:",
          newNote,
        );

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
    if (recordingNoteId === id) {
      stopRecording();
      setRecordingNoteId(null);
    }
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
    
    if (recordingNoteId === id) {
      stopRecording();
      setRecordingNoteId(null);
    }

    // Detect if this is a backend-managed note (numeric id) vs a static/hardcoded note
    const isBackendNote =
      typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id));

    if (isBackendNote) {
      // ── PATCH /api/v1/key-points/{id} ──
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
              String(item.id) === String(id)
                ? { ...item, insight: updatedInsight }
                : item,
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
    if (recordingNoteId === editingNoteId) {
      stopRecording();
      setRecordingNoteId(null);
    }
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  // ── Open Evidence Panel with alert-specific data ──
  const openEvidencePanel = (alertObj) => {
    console.log(
      "[ViewEvidence] Click triggered. Target alert:",
      alertObj?.id,
      alertObj?.title,
    );
    console.log("[ViewEvidence] Extracted evidence:", alertObj?.evidence);
    console.log("[ViewEvidence] OCR files to pass:", keyInfoOcrFiles);

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



  // ── Chatbot realtime subscription on mount & cleanup on unmount ──
  useEffect(() => {
    const user = getJsonCookie("user");
    const doctorId = user?.id || user?.user?.id;
    
    console.log("[DEBUG-ECHO] 1. useEffect mounted. doctorId:", doctorId);
    
    if (doctorId && patientId) {
      const channelName = `chatbot-answer.${doctorId}.${patientId}`;
      chatChannelRef.current = channelName;
      
      console.log('SUBSCRIBING TO CHANNEL =>', channelName);
      
      // Force cleanup before re-binding to prevent duplicate messages
      echo.leave(channelName);
      
      echo.private(channelName)
        .listenToAll((eventName, data) => {
          console.log("[DEBUG-WILDCARD] Event received on channel:", eventName);
          console.log("[DEBUG-WILDCARD] Data:", data);
        })
        .listen('.App\\Events\\Chatbot\\ChatbotAnswerReady', (payload) => {
          console.log('CHATBOT SUCCESS', payload);
          
          const finalAnswer = payload?.answer || payload?.data?.answer;
          
          if (finalAnswer) {
              // 1. Immediately wipe out the loading/preparing flags
              setIsChatPreparing(false);
              setIsChatSending(false);
              
              // 2. Append the message safely using the latest functional state slice
              setChatMessages(prev => {
                  // Remove any temporary "preparing" system messages if they exist by text or type filter
                  const filteredMessages = prev.filter(msg => msg.text !== "I'm preparing this patient's data. Please wait a moment...");
                  
                  // Deduplicate check to completely prevent double rendering
                  if (filteredMessages.some(msg => msg.text === finalAnswer)) {
                      return filteredMessages;
                  }
                  
                  return [...filteredMessages, { type: 'ai', text: finalAnswer }];
              });
          }
        })
        .listen('.App\\Events\\Chatbot\\ChatbotAnswerFailed', (payload) => {
          console.log('CHATBOT FAILED', payload);
          
          const errorText = payload?.error || payload?.data?.error;
          
          if (errorText) {
              // Immediately wipe out the loading/preparing flags
              setIsChatPreparing(false);
              setIsChatSending(false);
              
              setChatMessages(prev => {
                  const filteredMessages = prev.filter(msg => msg.text !== "I'm preparing this patient's data. Please wait a moment...");
                  
                  if (filteredMessages.some(msg => msg.text === errorText)) {
                      return filteredMessages;
                  }
                  
                  return [...filteredMessages, { type: 'ai', text: errorText }];
              });
          }
        });
    }

    return () => {
      console.log("[DEBUG-ECHO] 4. Component unmounting. Running cleanup for doctorId:", doctorId, "patientId:", patientId);
      if (doctorId && patientId) {
        console.log(`[DEBUG-ECHO] 5. Calling echo.leave('chatbot-answer.${doctorId}.${patientId}');`);
        echo.leave(`chatbot-answer.${doctorId}.${patientId}`);
        chatChannelRef.current = null;
      }
    };
  }, [patientId]);

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
    setActivitiesCurrentPage(1);
    setActivitiesLastPage(1);
  }, [patientId]);

  // ── Reset Comparative Analysis when patient changes ──
  useEffect(() => {
    setComparativeData([]);
    setComparativeError(null);
    setComparativeLoadedFor(null);
  }, [patientId]);

  // ── Fetch Decision Support from backend (Includes Legacy Auto-Generation Flow) ──
  const [isGeneratingDecisionSupport, setIsGeneratingDecisionSupport] =
    useState(false);
  const hasTriggeredDecisionSupportGeneration = useRef(false);

  // ── Re-analysis (upgrade/pay-per-use path for old patients) ──
  // Guard ref: prevents duplicate POST /re-analyze calls from React Strict Mode
  // or rapid re-renders while a request is already in flight.
  const reAnalyzeInFlightRef = useRef(false);

  /**
   * Called after a successful upgrade/pay-per-use for the 'decision' feature.
   * POSTs /re-analyze once, then kicks off the existing polling loop via
   * fetchDecisionSupport so the caller doesn't need to know the internals.
   */
  const triggerReAnalyzeAndPoll = async () => {
    if (!patientId) return;
    if (reAnalyzeInFlightRef.current) {
      console.log(
        "[re-analyze] Request already in-flight — skipping duplicate call.",
      );
      return;
    }

    reAnalyzeInFlightRef.current = true;
    console.log(
      "[re-analyze] Triggering POST /re-analyze for patientId:",
      patientId,
    );

    // Show the Decision Support section loader immediately
    setDecisionSupportLoading(true);
    setDecisionSupportError(null);

    try {
      const res = await reAnalyzePatientDecisionSupportAPI(patientId);
      console.log("[re-analyze] POST response:", res);

      // 401 — session expired
      const is401 =
        res?.message?.toLowerCase().includes("unauthenticated") ||
        res?.message?.includes("401");
      if (is401) {
        setDecisionSupportError(
          res.message || "Session expired. Please log in again.",
        );
        setDecisionSupportLoading(false);
        navigate("/login");
        return;
      }

      if (!res || res.success === false) {
        // Backend returned a failure — show the message, keep the previous UI
        const msg =
          res?.message || "Failed to start Decision Support analysis.";
        console.error("[re-analyze] Backend returned failure:", msg);
        setDecisionSupportError(msg);
        setDecisionSupportLoading(false);
        return;
      }

      // POST succeeded — reset any stale loaded state so the poller runs fresh
      setDecisionSupportLoadedFor(null);

      // Hand off to the existing polling function which already handles
      // still_processing loop, error states and final data rendering.
      // Pass isReAnalyze=true so the loading-guard inside fetchDecisionSupport
      // is skipped (we already set loading=true above).
      await fetchDecisionSupport(true);
    } catch (err) {
      console.error("[re-analyze] Unexpected error:", err);
      setDecisionSupportError("Failed to start Decision Support analysis.");
      setDecisionSupportLoading(false);
    } finally {
      reAnalyzeInFlightRef.current = false;
    }
  };

  const fetchDecisionSupport = async (isReAnalyze = false) => {
    if (!patientId) return;

    // Skip the in-progress guard when called from re-analyze flow because
    // triggerReAnalyzeAndPoll already set loading=true before delegating here.
    if (!isReAnalyze && decisionSupportLoading) return;

    setDecisionSupportLoading(true);
    setDecisionSupportError(null);

    let attempts = 0;
    const maxAttempts = 15;

    try {
      while (attempts < maxAttempts) {
        attempts++;
        const dsRes = await getDecisionSupportAPI(patientId);

        const is401 =
          dsRes?.message?.toLowerCase().includes("unauthenticated") ||
          dsRes?.message?.includes("401");
        if (is401) {
          setDecisionSupportError("401");
          setDecisionSupportLoading(false);
          navigate("/login");
          return;
        }

        if (dsRes?.success === false) {
          setDecisionSupportError(
            dsRes?.message ||
              "An error occurred while fetching decision support information.",
          );
          setDecisionSupportLoading(false);
          return;
        }

        const stillProcessing = dsRes?.data?.still_processing === true;
        const decisions = Array.isArray(dsRes?.data?.decisions)
          ? dsRes.data.decisions
          : [];

        if (stillProcessing) {
          // Wait 4 seconds before polling again
          await new Promise((resolve) => setTimeout(resolve, 4000));
          continue;
        }

        // Processing is complete
        setDecisionSupport(decisions);
        setDecisionSupportLoadedFor(patientId);
        setDecisionSupportLoading(false);
        return;
      }

      // If we exit loop without success
      setDecisionSupportError("Timeout while waiting for decision support.");
    } catch (err) {
      console.error("[decision-support-flow] exception:", err);
      setDecisionSupportError(
        "Something went wrong. Please check your network connection..",
      );
    } finally {
      setIsGeneratingDecisionSupport(false);
      setDecisionSupportLoading(false);
    }
  };

  // ── Fetch Activity Log from backend ──
  const fetchActivities = async (page = 1) => {
    if (!patientId) return;
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await getPatientActivitiesAPI(patientId, page);
      console.log("[activity-log] response:", res);
      if (res && res.success) {
        let items = [];
        let meta = null;
        if (res.data && res.data.data) {
          items = Array.isArray(res.data.data) ? res.data.data : [];
          meta = res.data.meta || res.meta || null;
        } else {
          items = Array.isArray(res.data) ? res.data : [];
        }
        setActivities(items);
        setActivitiesLoadedFor(patientId);

        if (meta) {
          setActivitiesCurrentPage(Number(meta.current_page || page));
          setActivitiesLastPage(Number(meta.last_page || 1));
        } else if (res.data && res.data.current_page) {
          setActivitiesCurrentPage(Number(res.data.current_page));
          setActivitiesLastPage(Number(res.data.last_page || 1));
        } else {
          setActivitiesCurrentPage(page);
          setActivitiesLastPage(1);
        }
      } else {
        setActivitiesError(res?.message || "Failed to load activity log.");
      }
    } catch (err) {
      console.error("[activity-log] exception:", err);
      setActivitiesError(
        "Something went wrong. Please check your network connection..",
      );
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchComparativeAnalysis = async () => {
    if (!patientId) return;
    if (comparativeLoading) return;

    setComparativeLoading(true);
    setComparativeError(null);

    let attempts = 0;
    const maxAttempts = 15;

    try {
      while (attempts < maxAttempts) {
        attempts++;
        const res = await getComparativeAnalysisAPI(patientId);
        console.log("[comparative-analysis] response:", res);

        const is401 =
          res?.message?.toLowerCase().includes("unauthenticated") ||
          res?.message?.includes("401");
        if (is401) {
          setComparativeError("401");
          setComparativeLoading(false);
          navigate("/login");
          return;
        }

        if (res?.success === false) {
          setComparativeError(
            res?.message ||
              "An error occurred while fetching comparative analysis.",
          );
          setComparativeLoading(false);
          return;
        }

        const stillProcessing = res?.data?.still_processing === true;
        const analysis = Array.isArray(res?.data?.analysis)
          ? res.data.analysis
          : [];

        if (stillProcessing) {
          // Keep existing loading state true, wait 4 seconds before polling again
          await new Promise((resolve) => setTimeout(resolve, 4000));
          continue;
        }

        // If AI extraction failed but historical data is present, we just render the historical data.
        // If analysis is empty, it will naturally render the existing empty state.

        // "No historical data found response: data: null"
        if (res?.data === null && res?.success === true) {
          setComparativeData([]);
          setComparativeLoadedFor(patientId);
          setComparativeLoading(false);
          return;
        }

        // Processing is complete
        setComparativeData(analysis);
        setComparativeLoadedFor(patientId);
        setComparativeLoading(false);
        return;
      }

      setComparativeError("Timeout while waiting for comparative analysis.");
    } catch (err) {
      console.error("[comparative-analysis] exception:", err);
      setComparativeError(
        "Something went wrong. Please check your network connection..",
      );
    } finally {
      setComparativeLoading(false);
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => ({ ...prev, [tabId]: true }));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (
      tabId === "decision" &&
      patientId &&
      decisionSupportLoadedFor !== patientId
    ) {
      fetchDecisionSupport();
    }
    if (
      tabId === "activity" &&
      patientId &&
      activitiesLoadedFor !== patientId
    ) {
      fetchActivities(activitiesCurrentPage);
    }
    if (
      tabId === "comparative" &&
      patientId &&
      comparativeLoadedFor !== patientId
    ) {
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
        setChatMessages((prevMsgs) => {
          if (prevMsgs.length > 0) return prevMsgs;
          return [
            {
              type: "ai",
              text: `Hello Dr. ${doctorName}, how can I assist you with ${patientName}'s case today?`,
            },
          ];
        });
      }
      return !prev;
    });
  };

  const handleChatEnter = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || isChatSending || isChatPreparing || isChatSendingRef.current) return;

    isChatSendingRef.current = true;

    if (isRecording) {
      stopRecording();
      setRecordingNoteId(null);
    }

    setChatMessages((prev) => [...prev, { type: "user", text }]);
    setChatInput("");
    setIsChatSending(true);

    const textarea = document.getElementById("chat-textarea");
    if (textarea) textarea.style.height = "auto";

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
        setIsChatSending(false);
        return;
      }

      // Check for 202 Accepted (Processing in background)
      if (res.status === 202 || res.data === "Preparing patient data..." || res.message === "Preparing patient data...") {
        setChatMessages((prev) => [
          ...prev,
          {
            type: "ai",
            text: "I'm preparing this patient's data. Please wait a moment...",
            preparing: true,
          },
        ]);
        setIsChatPreparing(true);
        // Keep input locked; Reverb WebSocket listeners will unlock it upon completion.
        return;
      }

      // Direct 200 OK synchronous fallback (Bypass socket waiting cycle)
      const answerText = res.answer || res.data || res.message || "Done.";
      setChatMessages((prev) => [
        ...prev,
        { type: "ai", text: answerText },
      ]);
      setIsChatSending(false);
      setIsChatPreparing(false);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: "Sorry, something went wrong. Please try again.",
        },
      ]);
      setIsChatSending(false);
    }
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // ── Plan-access & historical data helpers ──

  // Normalize billing_mode to handle all backend variants:
  //   "pay-per-use" (hyphen  — current backend format)
  //   "pay_per_use" (underscore — older assumption)
  //   "ppu"         (short form)
  // Any casing is also accepted via .toLowerCase().
  const _rawBillingMode = String(
    subscriptionData?.billing_mode || "",
  ).toLowerCase();
  const _normalizedBillingMode = _rawBillingMode.replaceAll("_", "-");
  const isPayPerUse =
    _normalizedBillingMode === "pay-per-use" ||
    _normalizedBillingMode === "ppu";

  const planNameLower = (subscriptionData?.plan_name || "").toLowerCase();

  // Decision Support: available on Pro, Premium, or any Pay-Per-Use mode.
  const canGenerateDecisionSupportNow = Boolean(
    isPayPerUse || ["pro", "premium"].includes(planNameLower),
  );
  const hasExistingDecisionSupportData = Boolean(
    Array.isArray(decisionSupport) && decisionSupport.length > 0,
  );

  const canAccessDecisionSupportNow = canGenerateDecisionSupportNow;

  // We determine final locked behavior dynamically within JSX:
  const shouldShowLockedDecisionSupport =
    !hasExistingDecisionSupportData && !canAccessDecisionSupportNow;

  // DiagnoBot: available on Premium or any Pay-Per-Use mode.
  // canUseChatbotNow derives from the normalized isPayPerUse above,
  // so "pay-per-use", "pay_per_use", and "ppu" all unlock the chatbot.
  const canUseChatbotNow = Boolean(isPayPerUse || planNameLower === "premium");
  const hasExistingChatbotAccessOrData = Boolean(
    Array.isArray(chatMessages) && chatMessages.length > 1,
  );
  // Show locked overlay only when the user genuinely cannot access DiagnoBot.
  // If canUseChatbotNow is true (PPU or Premium), never show the lock.
  const shouldShowLockedChatbot =
    !canUseChatbotNow && !hasExistingChatbotAccessOrData;



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

  // ── Patient Header Viewport Alignment Fix ──
  useLayoutEffect(() => {
    const sidebar = document.querySelector("aside.sidebar");
    const contentLayer = document.querySelector(".content-layer");
    const patientPage =
      document.querySelector(".patient-profile-page") ||
      document.querySelector(".pp-scope.patient-profile-page");

    const header =
      document.querySelector("header.patient-header.pp-header") ||
      document.querySelector(".patient-header.pp-header") ||
      document.querySelector(".pp-header") ||
      document.querySelector(".patient-header");

    const editButton =
      document.querySelector(".pp-edit-file-btn") ||
      Array.from(document.querySelectorAll("button")).find((btn) =>
        (btn.textContent || "").toLowerCase().includes("edit"),
      );

    if (!sidebar || !contentLayer || !patientPage || !header) {
      return;
    }

    const parents = [contentLayer, patientPage, header.parentElement].filter(
      Boolean,
    );

    const original = {
      header: {
        marginLeft: header.style.marginLeft,
        width: header.style.width,
        minWidth: header.style.minWidth,
        maxWidth: header.style.maxWidth,
        boxSizing: header.style.boxSizing,
        transition: header.style.transition,
        overflow: header.style.overflow,
        zIndex: header.style.zIndex,
        position: header.style.position,
        top: header.style.top,
        paddingRight: header.style.paddingRight,
      },
      edit: editButton
        ? {
            whiteSpace: editButton.style.whiteSpace,
            flexShrink: editButton.style.flexShrink,
          }
        : null,
      parents: parents.map((el) => ({
        el,
        overflow: el.style.overflow,
        overflowX: el.style.overflowX,
        overflowY: el.style.overflowY,
        contain: el.style.contain,
        clipPath: el.style.clipPath,
      })),
    };

    let rafId = null;

    const apply = () => {
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const viewportRight = window.innerWidth;
        const sidebarRect = sidebar.getBoundingClientRect();
        const contentRect = contentLayer.getBoundingClientRect();

        const targetLeft = sidebarRect.right;
        const targetWidth = viewportRight - targetLeft;
        const leftCorrection = contentRect.left - targetLeft;

        parents.forEach((el) => {
          el.style.overflow = "visible";
          el.style.overflowX = "visible";
          el.style.overflowY = "visible";
          el.style.contain = "none";
          el.style.clipPath = "none";
        });

        header.style.position = "sticky";
        header.style.top = "60px";
        header.style.boxSizing = "border-box";
        header.style.transition = "none";
        header.style.overflow = "visible";
        header.style.zIndex = "100";
        header.style.marginLeft = `${-leftCorrection}px`;
        header.style.width = `${targetWidth}px`;
        header.style.minWidth = `${targetWidth}px`;
        header.style.maxWidth = `${targetWidth}px`;
        header.style.paddingRight = "32px";

        if (editButton) {
          editButton.style.whiteSpace = "nowrap";
          editButton.style.flexShrink = "0";
        }
      });
    };

    const mutationObserver = new MutationObserver(apply);
    [sidebar, contentLayer, patientPage].forEach((el) => {
      mutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    });

    const resizeObserver = new ResizeObserver(apply);
    resizeObserver.observe(sidebar);
    resizeObserver.observe(contentLayer);
    resizeObserver.observe(patientPage);

    window.addEventListener("resize", apply);

    const transitionEvents = [
      "transitionstart",
      "transitionrun",
      "transitionend",
    ];
    [sidebar, contentLayer, patientPage].forEach((el) => {
      transitionEvents.forEach((ev) => el.addEventListener(ev, apply));
    });

    apply();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", apply);
      [sidebar, contentLayer, patientPage].forEach((el) => {
        transitionEvents.forEach((ev) => el.removeEventListener(ev, apply));
      });
      mutationObserver.disconnect();
      resizeObserver.disconnect();

      // Restore original styles
      if (header) Object.assign(header.style, original.header);
      if (editButton && original.edit) {
        editButton.style.whiteSpace = original.edit.whiteSpace;
        editButton.style.flexShrink = original.edit.flexShrink;
      }
      original.parents.forEach(
        ({ el, overflow, overflowX, overflowY, contain, clipPath }) => {
          if (el) {
            el.style.overflow = overflow;
            el.style.overflowX = overflowX;
            el.style.overflowY = overflowY;
            el.style.contain = contain;
            el.style.clipPath = clipPath;
          }
        },
      );
    };
  }, [isSidebarCollapsed]);

  if (isUnauthorized) {
    return <Unauthorized />;
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

      {/* Plan Upgrade Confirmation Modal */}
      <ConfirmModal
        isOpen={isUpgradeConfirmOpen}
        onClose={() => !isUpgrading && setIsUpgradeConfirmOpen(false)}
        onConfirm={handleUpgradeConfirm}
        title="Confirm Plan Change"
        description={
          isUpgrading
            ? "Processing your request..."
            : `Are you sure you want to switch to the ${upgradeTarget?.name} plan?`
        }
        confirmText={isUpgrading ? "Processing..." : "Confirm & Subscribe"}
        cancelText="Maybe Later"
        variant="primary"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: "24px", height: "24px" }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        }
      />

      <div className={`content-layer ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <header className="patient-header pp-header">
          <div className="patient-identity">
            <div className="patient-main-info">
              <div
                className={`patient-avatar ${overviewLoading ? "preview-shimmer" : ""}`}
                style={{ borderRadius: "50%" }}
              >
                {overviewLoading
                  ? "NH"
                  : overviewData?.patientName
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
                  {overviewLoading ? (
                    <span className="preview-shimmer">Nada Hassan</span>
                  ) : (
                    (overviewData?.patientName ?? "N/A")
                  )}
                </h1>
                <p className="patient-meta">
                  {overviewLoading ? (
                    <span
                      className="preview-shimmer"
                      style={{ display: "inline-block", marginTop: "4px" }}
                    >
                      Dr. Tarek Ahmed / National ID: #30410116471075
                    </span>
                  ) : (
                    `${overviewData?.doctorName ? `Dr. ${overviewData.doctorName}` : "N/A"} / National ID: ${overviewData?.patientId ?? "N/A"}`
                  )}
                </p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="pp-edit-file-btn"
                onClick={() => {
                  navigate(`/edit-patient/${patientId}`, {
                    state: { patientData: overviewData },
                  });
                }}
              >
                Edit File
              </button>
            </div>
          </div>
        </header>

        <div className="container">
          <div className="tab-nav-wrapper">
            {showBack && (
              <button
                className="pp-tab-scroll-btn"
                onClick={() => scrollTabs("back")}
                aria-label="Scroll left"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
            )}

            <nav
              className="tab-nav"
              ref={tabNavRef}
              onScroll={checkScrollButtons}
            >
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
                className={`tab-btn ${activeTab === "comparative" ? "active" : ""}`}
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

            {showNext && (
              <button
                className="pp-tab-scroll-btn"
                onClick={() => scrollTabs("next")}
                aria-label="Scroll right"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            )}
          </div>
          <div
            className={`tab-content ${
              activeTab === "overview" ? "active" : ""
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
                    {overviewLoading ? (
                      <div
                        className="preview-shimmer"
                        style={{ marginTop: "12px" }}
                      >
                        <strong>AI Summary:</strong> The patient presents with a
                        history of autoimmune symptoms including joint pain and
                        chronic inflammation. Recent laboratory tests indicate
                        elevated inflammatory markers suggestive of an active
                        flare-up. Recommended immediate review of
                        immunosuppressive therapy dosage.
                      </div>
                    ) : (
                      <>
                        <strong>AI Summary:</strong>{" "}
                        {overviewData?.smart_summary ||
                          analysisData?.[0]?.result?.["ai-summary"] ||
                          "No insights available"}
                      </>
                    )}
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
                        className={`status-badge stable ${selectedStatus === "stable" ? "active" : "inactive"} ${isStatusUpdating ? "disabled" : ""}`}
                        onClick={() => handleStatusChange("stable")}
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
                        style={{
                          cursor: isStatusUpdating ? "not-allowed" : "pointer",
                        }}
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
                        style={{
                          cursor: isStatusUpdating ? "not-allowed" : "pointer",
                        }}
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
                    {overviewLoading ? (
                      <>
                        {/* Row 1 / Col 1 */}
                        <div className="info-item age-smoker-split">
                          {/* Mini-field A: Age */}
                          <div className="mini-field">
                            <div
                              className="preview-shimmer"
                              style={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
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
                              <div className="info-value">20 Years</div>
                            </div>
                          </div>

                          {/* Mini-field B: Smoker */}
                          <div className="mini-field">
                            <div
                              className="preview-shimmer"
                              style={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
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
                              <div className="info-value">No</div>
                            </div>
                          </div>
                        </div>

                        {/* Row 1 / Col 2 */}
                        <div className="info-item">
                          <div
                            className="preview-shimmer"
                            style={{
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
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
                              Exercise-induced Bronchospasm
                            </div>
                          </div>
                        </div>

                        {/* Row 2 / Col 1 */}
                        <div className="info-item">
                          <div
                            className="preview-shimmer"
                            style={{
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
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
                              Left ankle arthroscopy (2023)
                            </div>
                          </div>
                        </div>

                        {/* Row 2 / Col 2 */}
                        <div className="info-item pp-allergy-alert">
                          <div
                            className="preview-shimmer"
                            style={{
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <div className="info-label allergy-label">
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
                            <div className="info-value allergy-value">
                              Penicillin
                            </div>
                          </div>
                        </div>

                        {/* Row 3 / Col 1 */}
                        <div className="info-item">
                          <div
                            className="preview-shimmer"
                            style={{
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
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
                            <div className="info-value">Ibuprofen (600mg)</div>
                          </div>
                        </div>

                        {/* Row 3 / Col 2 */}
                        <div className="info-item">
                          <div
                            className="preview-shimmer"
                            style={{
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
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
                              History of early-onset osteoarthritis
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
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
                              {formatKeyInfo("age", overviewData?.age)}
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
                              {formatKeyInfo("smoker", overviewData?.smoker)}
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
                            {formatKeyInfo(
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
                            {formatKeyInfo(
                              "previousSurgeries",
                              overviewData?.previousSurgeries,
                            )}
                          </div>
                        </div>

                        {/* Row 2 / Col 2 */}
                        <div className="info-item pp-allergy-alert">
                          <div className="info-label allergy-label">
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
                          <div className="info-value allergy-value">
                            {formatKeyInfo(
                              "allergies",
                              overviewData?.allergies,
                            )}
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
                            {formatKeyInfo(
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
                            {formatKeyInfo(
                              "familyHistory",
                              overviewData?.familyHistory,
                            )}
                          </div>
                        </div>
                      </>
                    )}
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

                <div
                  className={`note-list ${isLoadingAnalysis ? "note-list-loading" : "note-list-loaded"}`}
                >
                  {isLoadingAnalysis ? (
                    <div className="note-item high-priority">
                      <div
                        className="preview-shimmer"
                        style={{ width: "100%", pointerEvents: "none" }}
                      >
                        <div className="pp-note-actions">
                          <button className="pp-note-edit-btn" title="Edit">
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
                        <div className="note-text">
                          <strong>Lymphadenopathy:</strong> Patient's
                          lymphadenopathy and night sweats may indicate a more
                          severe condition such as B-Cell Lymphoma.
                        </div>
                        <div className="note-footer">
                          <div className="note-meta-stack">
                            <span className="note-date">
                              AI Generated • Apr 15, 2026
                            </span>
                            <button
                              className="pp-evidence-icon-btn"
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
                          <button className="pp-note-delete-btn" title="Delete">
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
                      </div>
                    </div>
                  ) : highAlerts?.length > 0 ? (
                    // عرض البيانات الحقيقية من الـ API
                    highAlerts.map((alertObj) => {
                      const noteId = alertObj.id;
                      const alertInsight = alertObj.insight;
                      const isManualNote =
                        alertObj.is_ai_generated === "Doctor Note";
                      const alertTitle =
                        alertObj.title || alertObj.is_ai_generated;

                      return (
                        <div className="note-item high-priority" key={noteId}>
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
                          {editingNoteId === noteId ? (
                            <>
                              <textarea
                                className="pp-note-edit-textarea"
                                value={editingNoteText}
                                onChange={(e) =>
                                  setEditingNoteText(e.target.value)
                                }
                                autoFocus
                                dir={getDirection(editingNoteText)}
                                style={{
                                  textAlign: getTextAlign(editingNoteText),
                                }}
                              />
                              <div className="pp-edit-footer-row">
                                <div className="note-footer">
                                  <div className="note-meta-stack" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <span className="note-date">
                                      <>{alertObj.is_ai_generated} · </>
                                      {alertObj.date}
                                    </span>
                                    <button
                                      className={`pp-record-btn ${isRecording && recordingNoteId === noteId ? "recording" : ""}`}
                                      onClick={() => {
                                        if (isRecording && recordingNoteId !== noteId) {
                                          stopRecording();
                                        }
                                        setRecordingNoteId(noteId);
                                        toggleRecording();
                                      }}
                                      disabled={isConnecting && recordingNoteId !== noteId}
                                    >
                                      {isConnecting && recordingNoteId === noteId ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                                          <line x1="12" y1="2" x2="12" y2="6"></line>
                                          <line x1="12" y1="18" x2="12" y2="22"></line>
                                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                          <line x1="2" y1="12" x2="6" y2="12"></line>
                                          <line x1="18" y1="12" x2="22" y2="12"></line>
                                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                        </svg>
                                      ) : isRecording && recordingNoteId === noteId ? (
                                        <span style={{ width: "10px", height: "10px", backgroundColor: "#FF5C5C", borderRadius: "2px", display: "inline-block", animation: "pulseMicIcon 1.5s infinite", flexShrink: 0 }}></span>
                                      ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                          <line x1="12" y1="19" x2="12" y2="23"></line>
                                          <line x1="8" y1="23" x2="16" y2="23"></line>
                                        </svg>
                                      )}
                                      {isConnecting && recordingNoteId === noteId ? (
                                        <span>Connecting...</span>
                                      ) : isRecording && recordingNoteId === noteId ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "14px" }}>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.1s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.3s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.5s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.2s" }}></span>
                                        </div>
                                      ) : (
                                        <span>Record</span>
                                      )}
                                    </button>
                                    {!isManualNote && (
                                      <button
                                        className="pp-evidence-icon-btn"
                                        onClick={() =>
                                          openEvidencePanel(alertObj)
                                        }
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
                                    {editSavingId === noteId
                                      ? "Saving..."
                                      : "Save"}
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
                              {!isManualNote && <strong>{alertTitle}: </strong>}{" "}
                              {alertInsight}
                            </div>
                          )}
                          {editingNoteId !== noteId && (
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">
                                  <>{alertObj.is_ai_generated} · </>
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
                          )}
                        </div>
                      );
                    })
                  ) : null}

                  {/* Doctor added notes */}
                  {newNotes.high.map((note) => (
                    <div className="note-item high-priority" key={note.id}>
                      <div style={{ position: "relative" }}>
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
                          dir={getDirection(newNoteTexts[note.id] || "")}
                          style={{
                            textAlign: getTextAlign(
                              newNoteTexts[note.id] || "",
                            ),
                          }}
                        />
                      </div>
                      <div className="pp-edit-footer-row">
                        <div className="note-footer">
                          <div
                            className="note-meta-stack"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <span className="note-date">
                              {new Date().toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <button
                              className={`pp-record-btn ${isRecording && recordingNoteId === note.id ? "recording" : ""}`}
                              onClick={() => {
                                if (
                                  isRecording &&
                                  recordingNoteId !== note.id
                                ) {
                                  stopRecording();
                                }
                                setRecordingNoteId(note.id);
                                toggleRecording();
                              }}
                              disabled={
                                isConnecting && recordingNoteId !== note.id
                              }
                            >
                              {isConnecting && recordingNoteId === note.id ? (
                                <svg
                                  width="14"
                                  height="14"
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
                                  <line
                                    x1="4.93"
                                    y1="4.93"
                                    x2="7.76"
                                    y2="7.76"
                                  ></line>
                                  <line
                                    x1="16.24"
                                    y1="16.24"
                                    x2="19.07"
                                    y2="19.07"
                                  ></line>
                                  <line x1="2" y1="12" x2="6" y2="12"></line>
                                  <line x1="18" y1="12" x2="22" y2="12"></line>
                                  <line
                                    x1="4.93"
                                    y1="19.07"
                                    x2="7.76"
                                    y2="16.24"
                                  ></line>
                                  <line
                                    x1="16.24"
                                    y1="7.76"
                                    x2="19.07"
                                    y2="4.93"
                                  ></line>
                                </svg>
                              ) : isRecording && recordingNoteId === note.id ? (
                                <span
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    backgroundColor: "#FF5C5C",
                                    borderRadius: "2px",
                                    display: "inline-block",
                                    animation: "pulseMicIcon 1.5s infinite",
                                    flexShrink: 0,
                                  }}
                                ></span>
                              ) : (
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
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                  <line x1="12" y1="19" x2="12" y2="23"></line>
                                  <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                              )}
                              {isConnecting && recordingNoteId === note.id ? (
                                <span>Connecting...</span>
                              ) : isRecording && recordingNoteId === note.id ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    height: "14px",
                                  }}
                                >
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.1s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.3s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.5s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.2s",
                                    }}
                                  ></span>
                                </div>
                              ) : (
                                <span>Record</span>
                              )}
                            </button>
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
                    </div>
                  ))}
                </div>
              </div>

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

                <div
                  className={`note-list ${isLoadingAnalysis ? "note-list-loading" : "note-list-loaded"}`}
                >
                  {isLoadingAnalysis ? (
                    <div className="note-item medium-priority">
                      <div
                        className="preview-shimmer"
                        style={{ width: "100%", pointerEvents: "none" }}
                      >
                        <div className="pp-note-actions">
                          <button className="pp-note-edit-btn" title="Edit">
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
                        <div className="note-text">
                          <strong>Rheumatoid Arthritis:</strong> Patient's joint
                          pain and swelling are consistent with Rheumatoid
                          Arthritis which requires ongoing management and
                          treatment.
                        </div>
                        <div className="note-footer">
                          <div className="note-meta-stack">
                            <span className="note-date">
                              AI Generated • Apr 15, 2026
                            </span>
                            <button
                              className="pp-evidence-icon-btn"
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
                          <button className="pp-note-delete-btn" title="Delete">
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
                      </div>
                    </div>
                  ) : mediumAlerts?.length > 0 ? (
                    // عرض البيانات الحقيقية من السيرفر
                    mediumAlerts.map((alertObj) => {
                      const isManualNote =
                        alertObj.is_ai_generated === "Doctor Note";
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
                                dir={getDirection(editingNoteText)}
                                style={{
                                  textAlign: getTextAlign(editingNoteText),
                                }}
                              />
                              <div className="pp-edit-footer-row">
                                <div className="note-footer">
                                  <div className="note-meta-stack" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <span className="note-date">
                                      <>{alertObj.is_ai_generated} · </>
                                      {alertObj.date}
                                    </span>
                                    <button
                                      className={`pp-record-btn ${isRecording && recordingNoteId === alertObj.id ? "recording" : ""}`}
                                      onClick={() => {
                                        if (isRecording && recordingNoteId !== alertObj.id) {
                                          stopRecording();
                                        }
                                        setRecordingNoteId(alertObj.id);
                                        toggleRecording();
                                      }}
                                      disabled={isConnecting && recordingNoteId !== alertObj.id}
                                    >
                                      {isConnecting && recordingNoteId === alertObj.id ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                                          <line x1="12" y1="2" x2="12" y2="6"></line>
                                          <line x1="12" y1="18" x2="12" y2="22"></line>
                                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                          <line x1="2" y1="12" x2="6" y2="12"></line>
                                          <line x1="18" y1="12" x2="22" y2="12"></line>
                                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                        </svg>
                                      ) : isRecording && recordingNoteId === alertObj.id ? (
                                        <span style={{ width: "10px", height: "10px", backgroundColor: "#FF5C5C", borderRadius: "2px", display: "inline-block", animation: "pulseMicIcon 1.5s infinite", flexShrink: 0 }}></span>
                                      ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                          <line x1="12" y1="19" x2="12" y2="23"></line>
                                          <line x1="8" y1="23" x2="16" y2="23"></line>
                                        </svg>
                                      )}
                                      {isConnecting && recordingNoteId === alertObj.id ? (
                                        <span>Connecting...</span>
                                      ) : isRecording && recordingNoteId === alertObj.id ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "14px" }}>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.1s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.3s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.5s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.2s" }}></span>
                                        </div>
                                      ) : (
                                        <span>Record</span>
                                      )}
                                    </button>
                                    {!isManualNote && (
                                      <button
                                        className="pp-evidence-icon-btn"
                                        onClick={() =>
                                          openEvidencePanel(alertObj)
                                        }
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
                                      saveEditNote(alertObj.id, editingNoteText)
                                    }
                                    disabled={editSavingId === alertObj.id}
                                  >
                                    {editSavingId === alertObj.id
                                      ? "Saving..."
                                      : "Save"}
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
                              {!isManualNote && (
                                <strong>
                                  {alertObj.title || alertObj.is_ai_generated}:
                                </strong>
                              )}{" "}
                              {alertObj.insight}
                            </div>
                          )}
                          {editingNoteId !== alertObj.id && (
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">
                                  <>{alertObj.is_ai_generated} · </>
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
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : null}

                  {/* Doctor added notes */}
                  {newNotes.medium.map((note) => (
                    <div className="note-item medium-priority" key={note.id}>
                      <div style={{ position: "relative" }}>
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
                          dir={getDirection(newNoteTexts[note.id] || "")}
                          style={{
                            textAlign: getTextAlign(
                              newNoteTexts[note.id] || "",
                            ),
                          }}
                        />
                      </div>
                      <div className="pp-edit-footer-row">
                        <div className="note-footer">
                          <div
                            className="note-meta-stack"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <span className="note-date">
                              {new Date().toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <button
                              className={`pp-record-btn ${isRecording && recordingNoteId === note.id ? "recording" : ""}`}
                              onClick={() => {
                                if (
                                  isRecording &&
                                  recordingNoteId !== note.id
                                ) {
                                  stopRecording();
                                }
                                setRecordingNoteId(note.id);
                                toggleRecording();
                              }}
                              disabled={
                                isConnecting && recordingNoteId !== note.id
                              }
                            >
                              {isConnecting && recordingNoteId === note.id ? (
                                <svg
                                  width="14"
                                  height="14"
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
                                  <line
                                    x1="4.93"
                                    y1="4.93"
                                    x2="7.76"
                                    y2="7.76"
                                  ></line>
                                  <line
                                    x1="16.24"
                                    y1="16.24"
                                    x2="19.07"
                                    y2="19.07"
                                  ></line>
                                  <line x1="2" y1="12" x2="6" y2="12"></line>
                                  <line x1="18" y1="12" x2="22" y2="12"></line>
                                  <line
                                    x1="4.93"
                                    y1="19.07"
                                    x2="7.76"
                                    y2="16.24"
                                  ></line>
                                  <line
                                    x1="16.24"
                                    y1="7.76"
                                    x2="19.07"
                                    y2="4.93"
                                  ></line>
                                </svg>
                              ) : isRecording && recordingNoteId === note.id ? (
                                <span
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    backgroundColor: "#FF5C5C",
                                    borderRadius: "2px",
                                    display: "inline-block",
                                    animation: "pulseMicIcon 1.5s infinite",
                                    flexShrink: 0,
                                  }}
                                ></span>
                              ) : (
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
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                  <line x1="12" y1="19" x2="12" y2="23"></line>
                                  <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                              )}
                              {isConnecting && recordingNoteId === note.id ? (
                                <span>Connecting...</span>
                              ) : isRecording && recordingNoteId === note.id ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    height: "14px",
                                  }}
                                >
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.1s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.3s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.5s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.2s",
                                    }}
                                  ></span>
                                </div>
                              ) : (
                                <span>Record</span>
                              )}
                            </button>
                          </div>
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
                    </div>
                  ))}
                </div>
              </div>

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

                <div
                  className={`note-list ${isLoadingAnalysis ? "note-list-loading" : "note-list-loaded"}`}
                >
                  {isLoadingAnalysis ? (
                    <div className="note-item low-priority">
                      <div
                        className="preview-shimmer"
                        style={{ width: "100%", pointerEvents: "none" }}
                      >
                        <div className="pp-note-actions">
                          <button className="pp-note-edit-btn" title="Edit">
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
                        <div className="note-text">
                          <strong>Note:</strong> Mild medication side effect
                          observed. Monitor symptoms during follow-up visits.
                        </div>
                        <div className="note-footer">
                          <div className="note-meta-stack">
                            <span className="note-date">
                              AI Generated • Apr 15, 2026
                            </span>
                            <button
                              className="pp-evidence-icon-btn"
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
                          <button className="pp-note-delete-btn" title="Delete">
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
                      </div>
                    </div>
                  ) : lowAlerts?.length > 0 ? (
                    // عرض بيانات السيرفر لـ Low Priority
                    lowAlerts.map((alertObj) => {
                      const isManualNote =
                        alertObj.is_ai_generated === "Doctor Note";
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

                          {editingNoteId === alertObj.id ? (
                            <>
                              <textarea
                                className="pp-note-edit-textarea"
                                value={editingNoteText}
                                onChange={(e) =>
                                  setEditingNoteText(e.target.value)
                                }
                                autoFocus
                                dir={getDirection(editingNoteText)}
                                style={{
                                  textAlign: getTextAlign(editingNoteText),
                                }}
                              />
                              <div className="pp-edit-footer-row">
                                <div className="note-footer">
                                  <div className="note-meta-stack" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <span className="note-date">
                                      {alertObj.date}
                                    </span>
                                    <button
                                      className={`pp-record-btn ${isRecording && recordingNoteId === alertObj.id ? "recording" : ""}`}
                                      onClick={() => {
                                        if (isRecording && recordingNoteId !== alertObj.id) {
                                          stopRecording();
                                        }
                                        setRecordingNoteId(alertObj.id);
                                        toggleRecording();
                                      }}
                                      disabled={isConnecting && recordingNoteId !== alertObj.id}
                                    >
                                      {isConnecting && recordingNoteId === alertObj.id ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                                          <line x1="12" y1="2" x2="12" y2="6"></line>
                                          <line x1="12" y1="18" x2="12" y2="22"></line>
                                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                          <line x1="2" y1="12" x2="6" y2="12"></line>
                                          <line x1="18" y1="12" x2="22" y2="12"></line>
                                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                        </svg>
                                      ) : isRecording && recordingNoteId === alertObj.id ? (
                                        <span style={{ width: "10px", height: "10px", backgroundColor: "#FF5C5C", borderRadius: "2px", display: "inline-block", animation: "pulseMicIcon 1.5s infinite", flexShrink: 0 }}></span>
                                      ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                          <line x1="12" y1="19" x2="12" y2="23"></line>
                                          <line x1="8" y1="23" x2="16" y2="23"></line>
                                        </svg>
                                      )}
                                      {isConnecting && recordingNoteId === alertObj.id ? (
                                        <span>Connecting...</span>
                                      ) : isRecording && recordingNoteId === alertObj.id ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "14px" }}>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.1s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.3s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.5s" }}></span>
                                          <span className="voice-bar" style={{ width: "3px", backgroundColor: "#2A66FF", borderRadius: "2px", animation: "miniSoundWave 1.2s ease-in-out infinite alternate", animationDelay: "0.2s" }}></span>
                                        </div>
                                      ) : (
                                        <span>Record</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="pp-note-save-row">
                                  <button
                                    className="pp-note-save-btn"
                                    onClick={() =>
                                      saveEditNote(alertObj.id, editingNoteText)
                                    }
                                    disabled={editSavingId === alertObj.id}
                                  >
                                    {editSavingId === alertObj.id
                                      ? "Saving..."
                                      : "Save"}
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
                              {!isManualNote && (
                                <strong>
                                  {alertObj.title || "Minor Alert"}:
                                </strong>
                              )}{" "}
                              {alertObj.insight}
                            </div>
                          )}
                          {editingNoteId !== alertObj.id && (
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">
                                  {alertObj.date}
                                </span>
                                {!isManualNote && (
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
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : null}

                  {/* Doctor added notes */}
                  {newNotes.low.map((note) => (
                    <div className="note-item low-priority" key={note.id}>
                      <div style={{ position: "relative" }}>
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
                          dir={getDirection(newNoteTexts[note.id] || "")}
                          style={{
                            textAlign: getTextAlign(
                              newNoteTexts[note.id] || "",
                            ),
                          }}
                        />
                      </div>
                      <div className="pp-edit-footer-row">
                        <div className="note-footer">
                          <div
                            className="note-meta-stack"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <span className="note-date">
                              {new Date().toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <button
                              className={`pp-record-btn ${isRecording && recordingNoteId === note.id ? "recording" : ""}`}
                              onClick={() => {
                                if (
                                  isRecording &&
                                  recordingNoteId !== note.id
                                ) {
                                  stopRecording();
                                }
                                setRecordingNoteId(note.id);
                                toggleRecording();
                              }}
                              disabled={
                                isConnecting && recordingNoteId !== note.id
                              }
                            >
                              {isConnecting && recordingNoteId === note.id ? (
                                <svg
                                  width="14"
                                  height="14"
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
                                  <line
                                    x1="4.93"
                                    y1="4.93"
                                    x2="7.76"
                                    y2="7.76"
                                  ></line>
                                  <line
                                    x1="16.24"
                                    y1="16.24"
                                    x2="19.07"
                                    y2="19.07"
                                  ></line>
                                  <line x1="2" y1="12" x2="6" y2="12"></line>
                                  <line x1="18" y1="12" x2="22" y2="12"></line>
                                  <line
                                    x1="4.93"
                                    y1="19.07"
                                    x2="7.76"
                                    y2="16.24"
                                  ></line>
                                  <line
                                    x1="16.24"
                                    y1="7.76"
                                    x2="19.07"
                                    y2="4.93"
                                  ></line>
                                </svg>
                              ) : isRecording && recordingNoteId === note.id ? (
                                <span
                                  style={{
                                    width: "10px",
                                    height: "10px",
                                    backgroundColor: "#FF5C5C",
                                    borderRadius: "2px",
                                    display: "inline-block",
                                    animation: "pulseMicIcon 1.5s infinite",
                                    flexShrink: 0,
                                  }}
                                ></span>
                              ) : (
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
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                  <line x1="12" y1="19" x2="12" y2="23"></line>
                                  <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                              )}
                              {isConnecting && recordingNoteId === note.id ? (
                                <span>Connecting...</span>
                              ) : isRecording && recordingNoteId === note.id ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    height: "14px",
                                  }}
                                >
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.1s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.3s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.5s",
                                    }}
                                  ></span>
                                  <span
                                    className="voice-bar"
                                    style={{
                                      width: "3px",
                                      backgroundColor: "#2A66FF",
                                      borderRadius: "2px",
                                      animation:
                                        "miniSoundWave 1.2s ease-in-out infinite alternate",
                                      animationDelay: "0.2s",
                                    }}
                                  ></span>
                                </div>
                              ) : (
                                <span>Record</span>
                              )}
                            </button>
                          </div>
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`tab-content ${
              activeTab === "comparative" ? "active" : ""
            }`}
            id="comparative"
          >
            <div className="card">
              {/* ── Loading state ── */}
              {comparativeLoading && (
                <div className="chart-grid">
                  {/* Chart 1 */}
                  <div className="chart-card">
                    <div
                      className="preview-shimmer"
                      style={{ width: "100%", pointerEvents: "none" }}
                    >
                      <div className="chart-header">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <h3 className="chart-title" style={{ margin: 0 }}>
                            RDW CV
                          </h3>
                        </div>
                        <span
                          className="chart-trend"
                          style={{
                            background: "#FFECEC",
                            color: "#FF5C5C",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}
                        >
                          ↑ 75.5%
                        </span>
                      </div>
                      <div
                        className="mini-chart"
                        style={{ position: "relative" }}
                      >
                        <svg
                          className="chart-canvas"
                          viewBox="0 0 300 160"
                          style={{ overflow: "visible" }}
                        >
                          <defs>
                            <linearGradient
                              id="dummy-grad-1"
                              x1="0%"
                              y1="0%"
                              x2="0%"
                              y2="100%"
                            >
                              <stop
                                offset="0%"
                                style={{
                                  stopColor: "#FF5C5C",
                                  stopOpacity: 0.12,
                                }}
                              />
                              <stop
                                offset="100%"
                                style={{ stopColor: "#FF5C5C", stopOpacity: 0 }}
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0.0 120.0 L 150.0 60.0 L 300.0 40.0 L 300.0 160.0 L 0.0 160.0 Z"
                            fill="url(#dummy-grad-1)"
                          />
                          <path
                            d="M 0.0 120.0 L 150.0 60.0 L 300.0 40.0"
                            stroke="#FF5C5C"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="0.0"
                            cy="120.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="150.0"
                            cy="60.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="300.0"
                            cy="40.0"
                            r="6"
                            fill="transparent"
                          />
                        </svg>
                      </div>
                      <div className="chart-stats">
                        <div className="stat-col">
                          <div className="stat-label">Initial</div>
                          <div className="stat-value">13.6 %</div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Current</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FF5C5C" }}
                          >
                            18.6 %
                          </div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Change</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FF5C5C" }}
                          >
                            +75.5%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 2 */}
                  <div className="chart-card">
                    <div
                      className="preview-shimmer"
                      style={{ width: "100%", pointerEvents: "none" }}
                    >
                      <div className="chart-header">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <h3 className="chart-title" style={{ margin: 0 }}>
                            WBC Count
                          </h3>
                        </div>
                        <span
                          className="chart-trend"
                          style={{
                            background: "#E6FFF5",
                            color: "#00C187",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}
                        >
                          ↓ 12.4%
                        </span>
                      </div>
                      <div
                        className="mini-chart"
                        style={{ position: "relative" }}
                      >
                        <svg
                          className="chart-canvas"
                          viewBox="0 0 300 160"
                          style={{ overflow: "visible" }}
                        >
                          <defs>
                            <linearGradient
                              id="dummy-grad-2"
                              x1="0%"
                              y1="0%"
                              x2="0%"
                              y2="100%"
                            >
                              <stop
                                offset="0%"
                                style={{
                                  stopColor: "#00C187",
                                  stopOpacity: 0.12,
                                }}
                              />
                              <stop
                                offset="100%"
                                style={{ stopColor: "#00C187", stopOpacity: 0 }}
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0.0 40.0 L 100.0 50.0 L 200.0 90.0 L 300.0 130.0 L 300.0 160.0 L 0.0 160.0 Z"
                            fill="url(#dummy-grad-2)"
                          />
                          <path
                            d="M 0.0 40.0 L 100.0 50.0 L 200.0 90.0 L 300.0 130.0"
                            stroke="#00C187"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="0.0" cy="40.0" r="6" fill="transparent" />
                          <circle
                            cx="100.0"
                            cy="50.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="200.0"
                            cy="90.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="300.0"
                            cy="130.0"
                            r="6"
                            fill="transparent"
                          />
                        </svg>
                      </div>
                      <div className="chart-stats">
                        <div className="stat-col">
                          <div className="stat-label">Initial</div>
                          <div className="stat-value">9.8 10³ /μL</div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Current</div>
                          <div
                            className="stat-value"
                            style={{ color: "#00C187" }}
                          >
                            8.6 10³ /μL
                          </div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Change</div>
                          <div
                            className="stat-value"
                            style={{ color: "#00C187" }}
                          >
                            -12.4%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 3 */}
                  <div className="chart-card">
                    <div
                      className="preview-shimmer"
                      style={{ width: "100%", pointerEvents: "none" }}
                    >
                      <div className="chart-header">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <h3 className="chart-title" style={{ margin: 0 }}>
                            Neutrophils Percentage
                          </h3>
                        </div>
                        <span
                          className="chart-trend"
                          style={{
                            background: "#FFF4E6",
                            color: "#FFA500",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}
                        >
                          — 0.0%
                        </span>
                      </div>
                      <div
                        className="mini-chart"
                        style={{ position: "relative" }}
                      >
                        <svg
                          className="chart-canvas"
                          viewBox="0 0 300 160"
                          style={{ overflow: "visible" }}
                        >
                          <defs>
                            <linearGradient
                              id="dummy-grad-3"
                              x1="0%"
                              y1="0%"
                              x2="0%"
                              y2="100%"
                            >
                              <stop
                                offset="0%"
                                style={{
                                  stopColor: "#FFA500",
                                  stopOpacity: 0.12,
                                }}
                              />
                              <stop
                                offset="100%"
                                style={{ stopColor: "#FFA500", stopOpacity: 0 }}
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0.0 80.0 L 100.0 60.0 L 200.0 100.0 L 300.0 80.0 L 300.0 160.0 L 0.0 160.0 Z"
                            fill="url(#dummy-grad-3)"
                          />
                          <path
                            d="M 0.0 80.0 L 100.0 60.0 L 200.0 100.0 L 300.0 80.0"
                            stroke="#FFA500"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="0.0" cy="80.0" r="6" fill="transparent" />
                          <circle
                            cx="100.0"
                            cy="60.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="200.0"
                            cy="100.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="300.0"
                            cy="80.0"
                            r="6"
                            fill="transparent"
                          />
                        </svg>
                      </div>
                      <div className="chart-stats">
                        <div className="stat-col">
                          <div className="stat-label">Initial</div>
                          <div className="stat-value">55.0 %</div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Current</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FFA500" }}
                          >
                            55.0 %
                          </div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Change</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FFA500" }}
                          >
                            0.0%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 4 */}
                  <div className="chart-card">
                    <div
                      className="preview-shimmer"
                      style={{ width: "100%", pointerEvents: "none" }}
                    >
                      <div className="chart-header">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <h3 className="chart-title" style={{ margin: 0 }}>
                            Neutrophils Absolute
                          </h3>
                        </div>
                        <span
                          className="chart-trend"
                          style={{
                            background: "#E6FFF5",
                            color: "#00C187",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}
                        >
                          ↑ 5.2%
                        </span>
                      </div>
                      <div
                        className="mini-chart"
                        style={{ position: "relative" }}
                      >
                        <svg
                          className="chart-canvas"
                          viewBox="0 0 300 160"
                          style={{ overflow: "visible" }}
                        >
                          <defs>
                            <linearGradient
                              id="dummy-grad-4"
                              x1="0%"
                              y1="0%"
                              x2="0%"
                              y2="100%"
                            >
                              <stop
                                offset="0%"
                                style={{
                                  stopColor: "#00C187",
                                  stopOpacity: 0.12,
                                }}
                              />
                              <stop
                                offset="100%"
                                style={{ stopColor: "#00C187", stopOpacity: 0 }}
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0.0 60.0 L 150.0 130.0 L 300.0 50.0 L 300.0 160.0 L 0.0 160.0 Z"
                            fill="url(#dummy-grad-4)"
                          />
                          <path
                            d="M 0.0 60.0 L 150.0 130.0 L 300.0 50.0"
                            stroke="#00C187"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="0.0" cy="60.0" r="6" fill="transparent" />
                          <circle
                            cx="150.0"
                            cy="130.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="300.0"
                            cy="50.0"
                            r="6"
                            fill="transparent"
                          />
                        </svg>
                      </div>
                      <div className="chart-stats">
                        <div className="stat-col">
                          <div className="stat-label">Initial</div>
                          <div className="stat-value">4.5 10³ /μL</div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Current</div>
                          <div
                            className="stat-value"
                            style={{ color: "#00C187" }}
                          >
                            4.7 10³ /μL
                          </div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Change</div>
                          <div
                            className="stat-value"
                            style={{ color: "#00C187" }}
                          >
                            +5.2%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 5 */}
                  <div className="chart-card">
                    <div
                      className="preview-shimmer"
                      style={{ width: "100%", pointerEvents: "none" }}
                    >
                      <div className="chart-header">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <h3 className="chart-title" style={{ margin: 0 }}>
                            Lymphocytes Percentage
                          </h3>
                        </div>
                        <span
                          className="chart-trend"
                          style={{
                            background: "#FFECEC",
                            color: "#FF5C5C",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}
                        >
                          ↓ 42.1%
                        </span>
                      </div>
                      <div
                        className="mini-chart"
                        style={{ position: "relative" }}
                      >
                        <svg
                          className="chart-canvas"
                          viewBox="0 0 300 160"
                          style={{ overflow: "visible" }}
                        >
                          <defs>
                            <linearGradient
                              id="dummy-grad-5"
                              x1="0%"
                              y1="0%"
                              x2="0%"
                              y2="100%"
                            >
                              <stop
                                offset="0%"
                                style={{
                                  stopColor: "#FF5C5C",
                                  stopOpacity: 0.12,
                                }}
                              />
                              <stop
                                offset="100%"
                                style={{ stopColor: "#FF5C5C", stopOpacity: 0 }}
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0.0 30.0 L 150.0 90.0 L 300.0 140.0 L 300.0 160.0 L 0.0 160.0 Z"
                            fill="url(#dummy-grad-5)"
                          />
                          <path
                            d="M 0.0 30.0 L 150.0 90.0 L 300.0 140.0"
                            stroke="#FF5C5C"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="0.0" cy="30.0" r="6" fill="transparent" />
                          <circle
                            cx="150.0"
                            cy="90.0"
                            r="6"
                            fill="transparent"
                          />
                          <circle
                            cx="300.0"
                            cy="140.0"
                            r="6"
                            fill="transparent"
                          />
                        </svg>
                      </div>
                      <div className="chart-stats">
                        <div className="stat-col">
                          <div className="stat-label">Initial</div>
                          <div className="stat-value">38.0 %</div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Current</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FF5C5C" }}
                          >
                            22.0 %
                          </div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Change</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FF5C5C" }}
                          >
                            -42.1%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 6 */}
                  <div className="chart-card">
                    <div
                      className="preview-shimmer"
                      style={{ width: "100%", pointerEvents: "none" }}
                    >
                      <div className="chart-header">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <h3 className="chart-title" style={{ margin: 0 }}>
                            Lymphocytes Absolute
                          </h3>
                        </div>
                        <span
                          className="chart-trend"
                          style={{
                            background: "#FFF4E6",
                            color: "#FFA500",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}
                        >
                          — 0.0%
                        </span>
                      </div>
                      <div
                        className="mini-chart"
                        style={{ position: "relative" }}
                      >
                        <svg
                          className="chart-canvas"
                          viewBox="0 0 300 160"
                          style={{ overflow: "visible" }}
                        >
                          <defs>
                            <linearGradient
                              id="dummy-grad-6"
                              x1="0%"
                              y1="0%"
                              x2="0%"
                              y2="100%"
                            >
                              <stop
                                offset="0%"
                                style={{
                                  stopColor: "#FFA500",
                                  stopOpacity: 0.12,
                                }}
                              />
                              <stop
                                offset="100%"
                                style={{ stopColor: "#FFA500", stopOpacity: 0 }}
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0.0 80.0 L 300.0 80.0 L 300.0 160.0 L 0.0 160.0 Z"
                            fill="url(#dummy-grad-6)"
                          />
                          <line
                            x1="0"
                            y1="80"
                            x2="300"
                            y2="80"
                            stroke="#FFA500"
                            strokeWidth="2.5"
                            strokeDasharray="6 4"
                            opacity="0.4"
                          />
                          <circle cx="0.0" cy="80.0" r="6" fill="transparent" />
                          <circle
                            cx="300.0"
                            cy="80.0"
                            r="6"
                            fill="transparent"
                          />
                        </svg>
                      </div>
                      <div className="chart-stats">
                        <div className="stat-col">
                          <div className="stat-label">Initial</div>
                          <div className="stat-value">1.8 10³ /μL</div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Current</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FFA500" }}
                          >
                            1.8 10³ /μL
                          </div>
                        </div>
                        <div className="stat-col">
                          <div className="stat-label">Change</div>
                          <div
                            className="stat-value"
                            style={{ color: "#FFA500" }}
                          >
                            0.0%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Error state ── */}
              {!comparativeLoading && comparativeError && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    color: "#FF5C5C",
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ marginBottom: "12px" }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ fontWeight: 600, marginBottom: "6px" }}>
                    Failed to load analysis
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#8A94A6",
                      marginBottom: "16px",
                    }}
                  >
                    {comparativeError}
                  </p>
                  <button
                    onClick={fetchComparativeAnalysis}
                    style={{
                      padding: "8px 20px",
                      background: "#2A66FF",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* ── Empty state ── */}
              {!comparativeLoading &&
                !comparativeError &&
                comparativeLoadedFor !== null &&
                comparativeData.length === 0 && (
                  <div style={{ textAlign: "center", padding: "64px 24px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: "20px",
                      }}
                    >
                      <svg
                        width="56"
                        height="56"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#8A94A6"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: 0.6 }}
                      >
                        <line x1="3" y1="3" x2="3" y2="21" />
                        <line x1="3" y1="21" x2="21" y2="21" />
                        <polyline points="7 16 11 11 15 14 20 7" />
                        <circle
                          cx="20"
                          cy="7"
                          r="1.5"
                          fill="#8A94A6"
                          stroke="none"
                        />
                        <circle
                          cx="15"
                          cy="14"
                          r="1.5"
                          fill="#8A94A6"
                          stroke="none"
                        />
                        <circle
                          cx="11"
                          cy="11"
                          r="1.5"
                          fill="#8A94A6"
                          stroke="none"
                        />
                        <circle
                          cx="7"
                          cy="16"
                          r="1.5"
                          fill="#8A94A6"
                          stroke="none"
                        />
                      </svg>
                    </div>
                    <h3
                      style={{
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "var(--dm-text-primary, #0E1A34)",
                        marginBottom: "12px",
                      }}
                    >
                      No Comparative Analysis Data Available
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        lineHeight: "1.5",
                        color: "var(--dm-text-muted, #8A94A6)",
                        maxWidth: "400px",
                        margin: "0 auto",
                      }}
                    >
                      Comparative analysis data has not been generated for this
                      patient yet. Add lab reports across multiple visits to
                      view trend charts and comparisons here.
                    </p>
                  </div>
                )}

              {/* ── Data state ── */}
              {!comparativeLoading &&
                !comparativeError &&
                comparativeData.length > 0 &&
                (() => {
                  // Derive the max number of visits across all tests
                  const maxVisits = comparativeData.reduce((max, test) => {
                    const pts = Array.isArray(test.all_points)
                      ? test.all_points.length
                      : 0;
                    return pts > max ? pts : max;
                  }, 0);

                  // Build deduplicated visit labels in order
                  const visitLabels = [];
                  comparativeData.forEach((test) => {
                    (test.all_points || []).forEach((pt) => {
                      if (!visitLabels.includes(pt.visit_label))
                        visitLabels.push(pt.visit_label);
                    });
                  });

                  // Helpers for trend styling
                  const getTrendStyle = (trend, status) => {
                    const isCritical =
                      (status || "").toLowerCase() === "critical";
                    if (trend === "up")
                      return {
                        bg: isCritical
                          ? "var(--status-critical-bg)"
                          : "var(--status-stable-bg)",
                        color: isCritical
                          ? "var(--status-critical-text)"
                          : "var(--status-stable-text)",
                        arrow: "↑",
                      };
                    if (trend === "down")
                      return {
                        bg: isCritical
                          ? "var(--status-critical-bg)"
                          : "var(--status-stable-bg)",
                        color: isCritical
                          ? "var(--status-critical-text)"
                          : "var(--status-stable-text)",
                        arrow: "↓",
                      };
                    return {
                      bg: "var(--status-warning-bg)",
                      color: "var(--status-warning-text)",
                      arrow: "—",
                    };
                  };

                  const getChartColor = (trend, status) => {
                    const isCritical =
                      (status || "").toLowerCase() === "critical";
                    if (trend === "up")
                      return isCritical ? "#FF5C5C" : "#00C187";
                    if (trend === "down")
                      return isCritical ? "#FF5C5C" : "#00C187";
                    return "#FFA500";
                  };

                  // Build SVG polyline from all_points
                  const buildChartPath = (points) => {
                    if (!points || points.length === 0)
                      return { line: "", area: "", dots: [] };
                    const W = 300,
                      H = 160;
                    const values = points.map((p) => Number(p.value));
                    const minV = Math.min(...values);
                    const maxV = Math.max(...values);
                    const range = maxV - minV;

                    // Define vertical drawing area with padding to keep points away from edges
                    const topPadding = 40;
                    const bottomPadding = 40;
                    const usableHeight = H - topPadding - bottomPadding;

                    const coords = points.map((p, i) => {
                      const x =
                        points.length === 1
                          ? W / 2
                          : (i / (points.length - 1)) * W;
                      let y;
                      if (range === 0) {
                        // Center the point vertically if there's no variation or only one point
                        y = H / 2;
                      } else {
                        // Map values into the usable height, inverting so higher values have lower y
                        y =
                          H -
                          bottomPadding -
                          ((Number(p.value) - minV) / range) * usableHeight;
                      }
                      return { x, y, ...p };
                    });
                    const lineD = coords
                      .map(
                        (c, i) =>
                          `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
                      )
                      .join(" ");
                    const areaD =
                      lineD +
                      ` L ${coords[coords.length - 1].x.toFixed(1)} ${H} L ${coords[0].x.toFixed(1)} ${H} Z`;
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
                          const isCritical =
                            status.toLowerCase() === "critical";
                          const tStyle = getTrendStyle(trend, status);
                          const chartColor = getChartColor(trend, status);
                          const points = Array.isArray(test.all_points)
                            ? test.all_points
                            : [];
                          const { line, area, dots } = buildChartPath(points);
                          const firstValue =
                            points.length > 0 ? points[0].value : "N/A";
                          const currentValue =
                            comp.current_value != null
                              ? comp.current_value
                              : "N/A";
                          const changePercent = comp.change_percentage;
                          const noPrevious =
                            comp.previous_value === "No previous" ||
                            comp.previous_value == null;
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
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  <h3
                                    className="chart-title"
                                    style={{ margin: 0 }}
                                  >
                                    {test.test_name}
                                  </h3>
                                </div>
                                {!noPrevious && (
                                  <span
                                    className="chart-trend"
                                    style={{
                                      background: tStyle.bg,
                                      color: tStyle.color,
                                      flexShrink: 0,
                                      marginLeft: "8px",
                                      transition: "all 0.5s ease-in-out",
                                    }}
                                  >
                                    {tStyle.arrow}{" "}
                                    {Math.abs(changePercent ?? 0).toFixed(1)}%
                                  </span>
                                )}
                              </div>

                              {/* SVG Chart */}
                              <div
                                className="mini-chart"
                                style={{ position: "relative" }}
                              >
                                <svg
                                  className="chart-canvas"
                                  viewBox="0 0 300 160"
                                  style={{ overflow: "visible" }}
                                  onMouseLeave={() =>
                                    setChartTooltip((prev) => ({
                                      ...prev,
                                      visible: false,
                                    }))
                                  }
                                >
                                  <defs>
                                    <linearGradient
                                      id={gradId}
                                      x1="0%"
                                      y1="0%"
                                      x2="0%"
                                      y2="100%"
                                    >
                                      <stop
                                        offset="0%"
                                        style={{
                                          stopColor: chartColor,
                                          stopOpacity: 0.2,
                                        }}
                                      />
                                      <stop
                                        offset="100%"
                                        style={{
                                          stopColor: chartColor,
                                          stopOpacity: 0,
                                        }}
                                      />
                                    </linearGradient>
                                  </defs>
                                  {points.length > 1 && (
                                    <>
                                      <path
                                        d={area}
                                        fill={`url(#${gradId})`}
                                        style={{ transition: "all 0.5s ease" }}
                                      />
                                      <path
                                        d={line}
                                        stroke={chartColor}
                                        strokeWidth="2.5"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transition: "all 0.5s ease" }}
                                      />
                                    </>
                                  )}
                                  {points.length === 1 && (
                                    <line
                                      x1="0"
                                      y1="80"
                                      x2="300"
                                      y2="80"
                                      stroke={chartColor}
                                      strokeWidth="2"
                                      strokeDasharray="6 4"
                                      opacity="0.4"
                                    />
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
                                          const svg =
                                            e.currentTarget.closest("svg");
                                          const svgRect =
                                            svg.getBoundingClientRect();
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
                                        r={
                                          chartTooltip.visible &&
                                          chartTooltip.testIdx === testIdx &&
                                          chartTooltip.pointIdx === di
                                            ? "6"
                                            : "4"
                                        }
                                        fill={chartColor}
                                        stroke="white"
                                        strokeWidth="1.5"
                                        style={{ pointerEvents: "none" }}
                                      />
                                    </g>
                                  ))}
                                </svg>

                                {/* Tooltip */}
                                {chartTooltip.visible &&
                                  chartTooltip.testIdx === testIdx && (
                                    <div
                                      className="ca-chart-tooltip"
                                      style={{
                                        position: "absolute",
                                        left: `${chartTooltip.x}px`,
                                        top:
                                          chartTooltip.y < 80
                                            ? `${chartTooltip.y + 15}px`
                                            : `${chartTooltip.y - 85}px`,
                                        transform: "translateX(-50%)",
                                        background: "var(--dm-bg-card)",
                                        backdropFilter: "blur(8px)",
                                        border:
                                          "1px solid var(--dm-border-color)",
                                        color: "var(--dm-text-primary)",
                                        padding: "10px 14px",
                                        borderRadius: "12px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        pointerEvents: "none",
                                        zIndex: 100,
                                        whiteSpace: "nowrap",
                                        boxShadow: "var(--dm-shadow-card)",
                                        transition:
                                          "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontWeight: 800,
                                          fontSize: "14px",
                                          marginBottom: "2px",
                                          color: "var(--dm-text-primary)",
                                        }}
                                      >
                                        {chartTooltip.value}
                                      </div>
                                      {chartTooltip.date && (
                                        <div
                                          style={{
                                            color: "var(--dm-text-muted)",
                                            fontSize: "11px",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {chartTooltip.date}
                                        </div>
                                      )}
                                      {chartTooltip.status && (
                                        <div
                                          style={{
                                            marginTop: "6px",
                                            fontSize: "10px",
                                            fontWeight: 800,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                            color:
                                              chartTooltip.status.toLowerCase() ===
                                              "critical"
                                                ? "var(--status-critical-text)"
                                                : "var(--status-stable-text)",
                                          }}
                                        >
                                          {chartTooltip.status}
                                        </div>
                                      )}
                                      {/* tooltip arrow */}
                                      <div
                                        style={{
                                          position: "absolute",
                                          ...(chartTooltip.y < 80
                                            ? { top: "-6px" }
                                            : { bottom: "-6px" }),
                                          left: "50%",
                                          transform: "translateX(-50%)",
                                          width: 0,
                                          height: 0,
                                          borderLeft: "6px solid transparent",
                                          borderRight: "6px solid transparent",
                                          ...(chartTooltip.y < 80
                                            ? {
                                                borderBottom:
                                                  "6px solid var(--dm-bg-card)",
                                              }
                                            : {
                                                borderTop:
                                                  "6px solid var(--dm-bg-card)",
                                              }),
                                        }}
                                      />
                                    </div>
                                  )}
                              </div>

                              {/* Footer Stats */}
                              <div className="chart-stats">
                                <div className="stat-col">
                                  <div className="stat-label">Initial</div>
                                  <div className="stat-value">
                                    {firstValue} {test.unit || ""}
                                  </div>
                                </div>
                                <div className="stat-col">
                                  <div className="stat-label">Current</div>
                                  <div
                                    className="stat-value"
                                    style={{ color: chartColor }}
                                  >
                                    {currentValue} {test.unit || ""}
                                  </div>
                                </div>
                                <div className="stat-col">
                                  <div className="stat-label">Change</div>
                                  <div
                                    className="stat-value"
                                    style={{
                                      color: noPrevious
                                        ? "#8A94A6"
                                        : chartColor,
                                      transition: "all 0.5s ease-in-out",
                                    }}
                                  >
                                    {noPrevious
                                      ? "N/A"
                                      : `${(changePercent ?? 0) >= 0 ? "+" : ""}${(changePercent ?? 0).toFixed(1)}%`}
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
            className={`tab-content ${
              activeTab === "decision" ? "active" : ""
            }`}
            id="decision"
          >
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: "20px" }}>
                <span className="ai-pulse"></span>
                AI-Powered Decision Support
              </h2>

              {/* Priority: sub-loading/generating → locked → ds-loading → error → empty → data */}
              {isSubLoading ||
              decisionSupportLoading ||
              isGeneratingDecisionSupport ? (
                <div className="likelihood-stack">
                  {/* Card 1 */}
                  <div
                    className="preview-shimmer"
                    style={{ pointerEvents: "none", width: "100%" }}
                  >
                    <div className="likelihood-card high">
                      <div className="likelihood-header">
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#FF5C5C",
                              marginBottom: "3px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            HIGH LIKELIHOOD
                          </div>
                          <div className="likelihood-title">
                            Sjogren's Syndrome
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{
                            color: "#FF5C5C",
                            flexShrink: 0,
                            marginLeft: "16px",
                          }}
                        >
                          82%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Patient
                        presentation aligns strongly with typical autoimmune
                        markers and symptomatic progression.
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div
                    className="preview-shimmer"
                    style={{ pointerEvents: "none", width: "100%" }}
                  >
                    <div className="likelihood-card medium">
                      <div className="likelihood-header">
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#FFA500",
                              marginBottom: "3px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            POSSIBLE
                          </div>
                          <div className="likelihood-title">
                            Rheumatoid Arthritis
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{
                            color: "#FFA500",
                            flexShrink: 0,
                            marginLeft: "16px",
                          }}
                        >
                          74%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Secondary
                        indicators and joint inflammation markers suggest an
                        alternative presentation pathway.
                      </div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div
                    className="preview-shimmer"
                    style={{ pointerEvents: "none", width: "100%" }}
                  >
                    <div className="likelihood-card low">
                      <div className="likelihood-header">
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#8A94A6",
                              marginBottom: "3px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            LOW LIKELIHOOD
                          </div>
                          <div className="likelihood-title">
                            Systemic Lupus Erythematosus (SLE)
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{
                            color: "#8A94A6",
                            flexShrink: 0,
                            marginLeft: "16px",
                          }}
                        >
                          36%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Baseline ANA titers
                        and lack of systemic involvement decrease diagnostic
                        probability.
                      </div>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div
                    className="preview-shimmer"
                    style={{ pointerEvents: "none", width: "100%" }}
                  >
                    <div className="likelihood-card high">
                      <div className="likelihood-header">
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#FF5C5C",
                              marginBottom: "3px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            HIGH LIKELIHOOD
                          </div>
                          <div className="likelihood-title">
                            B-Cell Lymphoma
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{
                            color: "#FF5C5C",
                            flexShrink: 0,
                            marginLeft: "16px",
                          }}
                        >
                          12%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Lymphadenopathy and
                        persistent night sweats flag consideration for thorough
                        hematological review.
                      </div>
                    </div>
                  </div>

                  {/* Card 5 */}
                  <div
                    className="preview-shimmer"
                    style={{ pointerEvents: "none", width: "100%" }}
                  >
                    <div className="likelihood-card low">
                      <div className="likelihood-header">
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#8A94A6",
                              marginBottom: "3px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            LOW LIKELIHOOD
                          </div>
                          <div className="likelihood-title">Sarcoidosis</div>
                        </div>
                        <div
                          className="confidence"
                          style={{
                            color: "#8A94A6",
                            flexShrink: 0,
                            marginLeft: "16px",
                          }}
                        >
                          8%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Low correlation
                        with current clinical presentation and pulmonary workup.
                      </div>
                    </div>
                  </div>
                </div>
              ) : shouldShowLockedDecisionSupport ? (
                <div className="lf-wrapper">
                  {/* Blurred dummy background */}
                  <div className="lf-dummy" aria-hidden="true">
                    <div className="likelihood-stack">
                      <div className="likelihood-card high">
                        <div className="likelihood-header">
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#FF5C5C",
                                marginBottom: "3px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              HIGH LIKELIHOOD
                            </div>
                            <div className="likelihood-title">
                              Differential Consideration A
                            </div>
                          </div>
                          <div
                            className="confidence"
                            style={{
                              color: "#FF5C5C",
                              flexShrink: 0,
                              marginLeft: "16px",
                            }}
                          >
                            87%
                          </div>
                        </div>
                        <div className="reasoning">
                          <strong>Clinical Reasoning:</strong> Based on lab
                          results, imaging, and patient history patterns.
                        </div>
                      </div>
                      <div className="likelihood-card medium">
                        <div className="likelihood-header">
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#FFA500",
                                marginBottom: "3px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              MODERATE LIKELIHOOD
                            </div>
                            <div className="likelihood-title">
                              Differential Consideration B
                            </div>
                          </div>
                          <div
                            className="confidence"
                            style={{
                              color: "#FFA500",
                              flexShrink: 0,
                              marginLeft: "16px",
                            }}
                          >
                            54%
                          </div>
                        </div>
                        <div className="reasoning">
                          <strong>Clinical Reasoning:</strong> Secondary
                          indicators suggest an alternative presentation
                          pathway.
                        </div>
                      </div>
                      <div className="likelihood-card low">
                        <div className="likelihood-header">
                          <div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#8A94A6",
                                marginBottom: "3px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              LOW LIKELIHOOD
                            </div>
                            <div className="likelihood-title">
                              Differential Consideration C
                            </div>
                          </div>
                          <div
                            className="confidence"
                            style={{
                              color: "#8A94A6",
                              flexShrink: 0,
                              marginLeft: "16px",
                            }}
                          >
                            21%
                          </div>
                        </div>
                        <div className="reasoning">
                          <strong>Clinical Reasoning:</strong> Low correlation
                          with current clinical presentation and workup.
                        </div>
                      </div>
                    </div>
                  </div>
                  <LockedFeatureOverlay
                    title="Unlock Smarter Clinical Decisions"
                    description="Get AI-powered differential insights to support faster and more accurate diagnoses."
                    primaryLabel={
                      planNameLower === "basic"
                        ? "Upgrade to Pro"
                        : "Upgrade to Premium"
                    }
                    onPrimary={() =>
                      initiateUpgrade(
                        planNameLower === "basic" ? "Pro" : "Premium",
                        "recurring",
                        "decision",
                      )
                    }
                    secondaryLabel={
                      planNameLower === "basic"
                        ? "Upgrade to Premium"
                        : "Use Pay-Per-Use"
                    }
                    onSecondary={() =>
                      planNameLower === "basic"
                        ? initiateUpgrade("Premium", "recurring", "decision")
                        : initiateUpgrade("Pay-Per-Use", "ppu", "decision")
                    }
                    tertiaryLabel={
                      planNameLower === "basic" ? "Use Pay-Per-Use" : null
                    }
                    onTertiary={
                      planNameLower === "basic"
                        ? () =>
                            initiateUpgrade("Pay-Per-Use", "ppu", "decision")
                        : null
                    }
                  />
                </div>
              ) : (
                <>
                  {/* ── Error state ── (only reached when data exists but fetch failed) */}
                  {!shouldShowLockedDecisionSupport &&
                    !decisionSupportLoading &&
                    decisionSupportError && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "48px 24px",
                          color:
                            decisionSupportError === "401"
                              ? "#FF5C5C"
                              : "#8A94A6",
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
                        <p
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            marginBottom: "8px",
                          }}
                        >
                          {decisionSupportError === "401"
                            ? "Session Expired"
                            : "Unable to Load Decision Support"}
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            opacity: 0.75,
                            marginBottom: "20px",
                          }}
                        >
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
                  {!shouldShowLockedDecisionSupport &&
                    !(
                      canAccessDecisionSupportNow &&
                      hasTriggeredDecisionSupportGeneration.current
                    ) &&
                    !decisionSupportLoading &&
                    !decisionSupportError &&
                    Array.isArray(decisionSupport) &&
                    decisionSupport.length === 0 &&
                    decisionSupportLoadedFor === patientId && (
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
                        <p
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            marginBottom: "6px",
                          }}
                        >
                          No decision support available yet.
                        </p>
                        <p style={{ fontSize: "13px", opacity: 0.7 }}>
                          Decision support data will appear here once reports
                          are processed.
                        </p>
                      </div>
                    )}

                  {/* ── Data state ── */}
                  {!decisionSupportLoading &&
                    !decisionSupportError &&
                    Array.isArray(decisionSupport) &&
                    decisionSupport.length > 0 && (
                      <div className="likelihood-stack">
                        {decisionSupport.map((item) => {
                          const statusUpper = (item.status || "").toUpperCase();
                          const isHigh = statusUpper.includes("HIGH");
                          const isLow = statusUpper.includes("LOW");
                          const statusColor = isHigh
                            ? "#FF5C5C"
                            : isLow
                              ? "#8A94A6"
                              : "#FFA500";
                          const cardClass = isHigh
                            ? "high"
                            : isLow
                              ? "low"
                              : "medium";

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
                                  <div className="likelihood-title">
                                    {item.condition}
                                  </div>
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
            {visitedTabs["medications-tasks"] && (
              <MedicationsAndTasksTab
                patientId={patientId}
                isActive={activeTab === "medications-tasks"}
                initialNextVisitDate={nextVisitDate}
                onNextVisitSaved={(date) => setNextVisitDate(date)}
              />
            )}
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

              {/* Loading dummy preview */}
              {activitiesLoading && activities.length === 0 && (
                <div
                  className="preview-shimmer"
                  style={{
                    display: "block",
                    width: "100%",
                    pointerEvents: "none",
                  }}
                >
                  <div className="activity-timeline">
                    <div className="activity-item">
                      <div className="activity-text">
                        Dr. Tareq Ahmed deleted Medication: 'Panadol'
                      </div>
                      <div className="activity-time">Just now</div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-text">
                        Dr. Tareq Ahmed deleted Medication: 'Augmentin'
                      </div>
                      <div className="activity-time">5 mins ago</div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-text">
                        Dr. Tareq Ahmed deleted Task: 'CBC'
                      </div>
                      <div className="activity-time">1 hour ago</div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-text">
                        Dr. System updated is_completed to ''
                      </div>
                      <div className="activity-time">2 hours ago</div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-text">
                        Dr. Tareq Ahmed updated next visit date to 'Wed, April
                        22, 2026'
                      </div>
                      <div className="activity-time">1 day ago</div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-text">
                        Dr. Tareq Ahmed created Task: 'MRI 3'
                      </div>
                      <div className="activity-time">2 days ago</div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-text">
                        Dr. Tareq Ahmed created Visit on Apr 15, 2026
                      </div>
                      <div className="activity-time">2 days ago</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {!activitiesLoading && activitiesError && (
                <p style={{ color: "#FF5C5C", fontSize: "14px" }}>
                  {activitiesError}
                </p>
              )}

              {/* Empty */}
              {!activitiesLoading &&
                !activitiesError &&
                activitiesLoadedFor === patientId &&
                activities.length === 0 && (
                  <p style={{ color: "#8A94A6", fontSize: "14px" }}>
                    No activity yet.
                  </p>
                )}

              {/* Data */}
              {!activitiesError && activities.length > 0 && (
                <>
                  <div
                    className="activity-timeline"
                    style={{
                      opacity: activitiesLoading ? 0.6 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {activities.map((activity) => (
                      <div className="activity-item" key={activity.id}>
                        <div className="activity-text">{activity.message}</div>
                        <div className="activity-time">
                          {activity.time_ago || activity.created_at}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const PAGINATION_GROUP_SIZE = 10;
                    const currentGroup = Math.floor(
                      (activitiesCurrentPage - 1) / PAGINATION_GROUP_SIZE,
                    );
                    const startPage = currentGroup * PAGINATION_GROUP_SIZE + 1;
                    const endPage = Math.min(
                      startPage + PAGINATION_GROUP_SIZE - 1,
                      activitiesLastPage,
                    );

                    return (
                      activitiesLastPage > 1 && (
                        <div
                          className="pagination"
                          style={{
                            marginTop: "24px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            disabled={
                              activitiesCurrentPage <= 1 || activitiesLoading
                            }
                            onClick={() =>
                              fetchActivities(
                                Math.max(1, activitiesCurrentPage - 1),
                              )
                            }
                            title="Previous Page"
                          >
                            ◂ Prev
                          </button>

                          {startPage > 1 && (
                            <button
                              disabled={activitiesLoading}
                              onClick={() => fetchActivities(startPage - 1)}
                              title="Previous 10 Pages"
                            >
                              «
                            </button>
                          )}

                          {Array.from(
                            { length: endPage - startPage + 1 },
                            (_, i) => startPage + i,
                          ).map((page) => (
                            <button
                              key={page}
                              className={
                                activitiesCurrentPage === page ? "active" : ""
                              }
                              disabled={activitiesLoading}
                              onClick={() => fetchActivities(page)}
                            >
                              {page}
                            </button>
                          ))}

                          {endPage < activitiesLastPage && (
                            <button
                              disabled={activitiesLoading}
                              onClick={() => fetchActivities(endPage + 1)}
                              title="Next 10 Pages"
                            >
                              »
                            </button>
                          )}

                          <button
                            disabled={
                              activitiesCurrentPage >= activitiesLastPage ||
                              activitiesLoading
                            }
                            onClick={() =>
                              fetchActivities(
                                Math.min(
                                  activitiesLastPage,
                                  activitiesCurrentPage + 1,
                                ),
                              )
                            }
                            title="Next Page"
                          >
                            Next ▸
                          </button>
                        </div>
                      )
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Trigger */}
      <div
        className="chatbot-trigger"
        onClick={(e) => {
          e.stopPropagation();
          toggleChat();
        }}
      >
        <div className="chatbot-tooltip">DiagnoBot</div>
        <img src={diagnobotImg} alt="DiagnoBot" className="chatbot-icon" />
      </div>

      {/* Chatbot Overlay — closes panel when clicking outside */}
      {isChatOpen && (
        <div
          onClick={toggleChat}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "transparent",
          }}
        />
      )}

      {/* Chatbot Panel */}
      <div
        className={`chatbot-panel ${isChatOpen ? "active" : ""}`}
        id="chatPanel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-header">
          <div>
            <div style={{ fontWeight: 600 }}>DiagnoBot</div>
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
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
                minHeight: "120px",
              }}
            >
              <svg
                width="28"
                height="28"
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
          ) : shouldShowLockedChatbot ? (
            <>
              {/* Blurred dummy chat background */}
              <div className="lf-chat-dummy" aria-hidden="true">
                <div className="message ai">
                  Hello! How can I assist you today?
                </div>
                <div className="message user">
                  What are the latest lab findings?
                </div>
                <div className="message ai">
                  Based on the patient file, the key findings include...
                </div>
              </div>
              <LockedFeatureOverlay
                compact
                title="Meet Your DiagnoBot"
                description="Ask anything about your patient and get instant, source-based answers."
                primaryLabel="Upgrade to Premium"
                onPrimary={() =>
                  initiateUpgrade("Premium", "recurring", "chatbot")
                }
                secondaryLabel="Or use Pay-Per-Use"
                onSecondary={() =>
                  initiateUpgrade("Pay-Per-Use", "ppu", "chatbot")
                }
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
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <div className="chat-input" style={{ alignItems: "center" }}>
          <textarea
            id="chat-textarea"
            rows="1"
            placeholder="Ask me anything..."
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.value ? `${Math.min(e.target.scrollHeight, 120)}px` : "auto";
            }}
            onKeyDown={handleChatEnter}
            disabled={shouldShowLockedChatbot}
            dir={getDirection(chatInput)}
            style={{ 
              textAlign: getTextAlign(chatInput),
              resize: "none",
              overflowY: "auto",
              fontFamily: "inherit",
              lineHeight: "1.4"
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              className="chat-mic-btn"
              disabled={
                shouldShowLockedChatbot ||
                (isConnecting && recordingNoteId !== "diagnobot")
              }
              onClick={() => {
                if (isRecording && recordingNoteId !== "diagnobot") {
                  stopRecording();
                }
                setRecordingNoteId("diagnobot");
                toggleRecording();
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color:
                  isRecording && recordingNoteId === "diagnobot"
                    ? "#FF5C5C"
                    : "#2A66FF",
                transition: "color 0.2s",
                borderRadius: "50%",
                animation:
                  isRecording && recordingNoteId === "diagnobot"
                    ? "pulseMicIcon 1.5s infinite"
                    : "none",
              }}
              title={
                isRecording && recordingNoteId === "diagnobot"
                  ? "Stop Recording"
                  : "Voice Input"
              }
            >
              {isConnecting && recordingNoteId === "diagnobot" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="spin-icon"
                >
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
              ) : isRecording && recordingNoteId === "diagnobot" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
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
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={
                shouldShowLockedChatbot ||
                isChatSending ||
                isChatPreparing ||
                !chatInput.trim()
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                background:
                  !chatInput.trim() ||
                  shouldShowLockedChatbot ||
                  isChatSending ||
                  isChatPreparing
                    ? "#E6EAF2"
                    : "#2A66FF",
                color:
                  !chatInput.trim() ||
                  shouldShowLockedChatbot ||
                  isChatSending ||
                  isChatPreparing
                    ? "#A0AABF"
                    : "white",
                cursor:
                  !chatInput.trim() ||
                  shouldShowLockedChatbot ||
                  isChatSending ||
                  isChatPreparing
                    ? "not-allowed"
                    : "pointer",
                transition: "all 0.2s ease",
                padding: 0,
              }}
              title="Send Message"
            >
              {isChatPreparing || isChatSending ? (
                <svg
                  width="18"
                  height="18"
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
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      <EvidencePanel
        isOpen={evidencePanel.open}
        onClose={() => setEvidencePanel((p) => ({ ...p, open: false }))}
        ocrFiles={keyInfoOcrFiles}
        selectedAlert={evidencePanel.selectedAlert}
      />
    </div>
  );
};

export default PatientProfile;
