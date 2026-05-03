import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Logo_Diagnoo.png";
import stethoscope from "../assets/Stethoscope.png";
import closeIcon from "../assets/close.png";
import openIcon from "../assets/open.png";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ConfirmModal from "./ConfirmModal";
import "../css/PatientList.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import { useNotifications } from "./NotificationsContext";
import { getDoctorInitials } from "./Dashboard";
import { usePageCache } from "./PageCacheContext";
import {
  getPatientsAPI,
  searchPatientsAPI,
  getPatientsByStatusAPI,
  deletePatientAPI,
  updatePatientStatusAPI,
} from "./mockAPI";
const AIInsightBlock = ({ patient, onOpenModal }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const moreRef = useRef(null);
  const [displayLength, setDisplayLength] = useState(patient.aiInsight.length);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    if (!container || !textNode) return;

    let rafId;
    const measure = () => {
      const insight = patient.aiInsight;

      textNode.textContent = insight;
      if (moreRef.current) moreRef.current.style.display = "none";

      if (container.scrollHeight <= container.clientHeight) {
        setDisplayLength((prev) => {
          if (prev !== insight.length) {
            setIsTruncated(false);
            return insight.length;
          }
          return prev;
        });
        return;
      }

      if (moreRef.current) moreRef.current.style.display = "inline";

      let low = 0;
      let high = insight.length;
      let best = 0;

      while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        textNode.textContent = insight.slice(0, mid).trimEnd() + "… ";
        if (container.scrollHeight <= container.clientHeight) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setDisplayLength((prev) => {
        if (prev !== best) {
          setIsTruncated(true);
          return best;
        }
        return prev;
      });

      textNode.textContent = insight.slice(0, best).trimEnd() + "… ";
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [patient.aiInsight]);

  const previewText = isTruncated
    ? patient.aiInsight.slice(0, displayLength).trimEnd() + "… "
    : patient.aiInsight;

  return (
    <div className="ai-insight" style={patient.insightStyle}>
      <p
        ref={containerRef}
        style={{ margin: 0, padding: 0, maxHeight: "59px", overflow: "hidden" }}
      >
        <strong>AI Insight: </strong>
        <span ref={textRef} className="ai-insight-text">
          {previewText}
        </span>
        <button
          ref={moreRef}
          className="ai-insight-more"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal(patient.aiInsight);
          }}
          style={{ display: isTruncated ? "inline" : "none" }}
        >
          View more
        </button>
      </p>
    </div>
  );
};

const PatientCard = ({
  patient,
  index,
  cardRef,
  navigate,
  setPatientToDelete,
  setIsDeleteModalOpen,
  setDeleteError,
  openInsightModal,
}) => {
  const normalizedStatus =
    patient.status?.toLowerCase().replace(/[\s_]+/g, "-") === "under-review" ||
    patient.status?.toLowerCase() === "underreview" ||
    patient.status?.toLowerCase() === "warning"
      ? "under-review"
      : patient.status?.toLowerCase().includes("critical")
        ? "critical"
        : "stable";

  const nameRef = useRef(null);
  const [isTwoLines, setIsTwoLines] = useState(false);
  const [isStatusHovered, setIsStatusHovered] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsStatusHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsStatusHovered(false);
    }, 350);
  };

  // Status mapping to power the quick-switch menus
  const STATUS_OPTIONS = [
    { id: "stable", color: "#00C187", label: "Stable" },
    { id: "under review", color: "#FFA500", label: "Under Review" },
    { id: "critical", color: "#FF5C5C", label: "Critical" },
  ];

  const handleQuickStatusChange = async (e, newStatus) => {
    e.stopPropagation();
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    // Optimistic UI dispatch directly triggers PatientList to re-render locally instantly
    window.dispatchEvent(
      new CustomEvent("patientStatusUpdated", {
        detail: { patientId: patient.id, status: newStatus },
      }),
    );

    try {
      await updatePatientStatusAPI(patient.id, newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsUpdatingStatus(false);
      setIsStatusHovered(false);
    }
  };

  useEffect(() => {
    if (nameRef.current) {
      // 24px is one line height. If it exceeds 30px, we definitively know it has wrapped to 2 lines.
      if (nameRef.current.clientHeight > 30) {
        setIsTwoLines(true);
      } else {
        setIsTwoLines(false);
      }
    }
  }, [patient.name]);

  return (
    <div
      ref={index === 0 ? cardRef : null}
      className={`patient-card ${isTwoLines ? "name-two-lines" : "name-single-line"}`}
      data-status={patient.status}
      data-patient={patient.name}
    >
      <div
        className="patient-header"
        style={{ alignItems: "center", border: "none", marginBottom: "0px" }}
      >
        <div
          className={`patient-avatar avatar-${normalizedStatus}`}
          style={{ width: "57px", height: "57px", fontSize: "20px" }}
        >
          {patient.initials}
        </div>
        <div className="patient-info" style={{ flexGrow: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div className="disc">
                <h3 ref={nameRef} title={patient.name}>
              {patient.name}
            </h3>
              <div
                className="patient-meta-row"
              >
               
                  <p className="patient-meta" style={{ margin: 0 }}>
                    Age: {patient.age}
                  </p>
                  <div
                    className="status-badge-wrapper"
                    style={{ position: "relative" }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span
                      className={`status-badge ${patient.statusType || patient.status}`}
                      style={{ transition: "all 0.3s ease", cursor: "pointer" }}
                    >
                      {patient.statusLabel}
                    </span>

                    <div
                      className={`status-quick-switch ${isStatusHovered ? "visible" : ""}`}
                    >
                      {STATUS_OPTIONS.filter(
                        (s) =>
                          s.id !==
                          (normalizedStatus === "under-review"
                            ? "under review"
                            : normalizedStatus),
                      ).map((opt, idx) => {
                        return (
                          <button
                            key={opt.id}
                            className={`status-circle status-${opt.id.replace(/\s+/g, "-")}`}
                            data-tooltip={opt.label}
                            onClick={(e) => handleQuickStatusChange(e, opt.id)}
                            style={{
                              background: opt.color,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
              </div>
            </div>

            <div className="icons">
              {" "}
              <button
                className="patient-card-delete-btn edit-action-btn"
                aria-label="Edit patient"
                title="Edit patient"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/edit-patient/${patient.id}`);
                }}
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
              <button
                className="patient-card-delete-btn"
                aria-label="Delete patient"
                title="Delete patient"
                style={{ margin: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPatientToDelete(patient);
                  setIsDeleteModalOpen(true);
                  setDeleteError("");
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
      </div>
      <AIInsightBlock patient={patient} onOpenModal={openInsightModal} />
      <div className="patient-details">
        <div className="detail-row">
          <span className="detail-label">Last Visit</span>
          <span className="detail-value">{patient.lastVisit}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Next Appointment</span>
          <span className="detail-value">{patient.nextAppointment}</span>
        </div>
      </div>
      <div className="pa">
        <div className="patient-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              navigate(`/patient-profile/${patient.id}`);
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

const PatientList = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { unreadCount, openNotifications } = useNotifications();
  const [selectedInsight, setSelectedInsight] = useState(null);
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const { credits, isCreditsLoading } = useSubscription();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
      if (event.key === "Escape") {
        setIsAvatarMenuOpen(false);
        setSelectedInsight(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getCache, setCache, invalidatePrefix } = usePageCache();

  const gridRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const observer = new ResizeObserver(() => {
      if (gridRef.current && cardRef.current) {
        const gridWidth = gridRef.current.clientWidth;
        const cardWidth = cardRef.current.offsetWidth;
        const computedStyle = window.getComputedStyle(gridRef.current);
        const gapString = computedStyle.columnGap || computedStyle.gap;
        const gap = parseFloat(gapString) || 24;

        const columns = Math.max(
          1,
          Math.floor((gridWidth + gap) / (cardWidth + gap)),
        );
        const newPageSize = columns * 3;

        console.log("columns:", columns);
        console.log("pageSize:", newPageSize);

        setPageSize((prev) => (prev !== newPageSize ? newPageSize : prev));
      }
    });

    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [patients.length]);

  const fetchPatients = async (pageNumber) => {
    const cacheKey = `patients_page_${pageNumber}`;
    const cached = getCache(cacheKey);
    if (cached) {
      setPatients(cached.patients);
      setCurrentPage(cached.currentPage);
      setLastPage(cached.lastPage);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log("[patients] fetching page", pageNumber);

    try {
      const res = await getPatientsAPI(pageNumber);
      console.log("[patients] rawResponse", res);

      if (res.success === false) {
        console.log("[patients] error", res.message);
        setError(res.message || "Failed to load patients");
        setLoading(false);
        return;
      }

      let rawPatients = [];
      let meta = {};

      if (res?.meta) {
        meta = res.meta;
      } else if (res?.data?.meta) {
        meta = res.data.meta;
      } else if (res?.data?.data?.meta) {
        meta = res.data.data.meta;
      }

      if (Array.isArray(res?.data)) {
        rawPatients = res.data;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        rawPatients = res.data.data;
      } else if (
        res?.data?.data?.patients &&
        Array.isArray(res.data.data.patients)
      ) {
        rawPatients = res.data.data.patients;
      } else if (Array.isArray(res)) {
        rawPatients = res;
      }

      console.log(
        "[patients] parsed meta",
        meta,
        "listLen",
        rawPatients?.length,
      );

      const gradients = [
        "linear-gradient(135deg, #467DFF, #2A66FF)",
        "linear-gradient(135deg, #FF5C5C, #FF8A8A)",
        "linear-gradient(135deg, #FFA500, #FFB84D)",
        "linear-gradient(135deg, #00C187, #00E5A0)",
        "linear-gradient(135deg, #9D5CFF, #B380FF)",
        "linear-gradient(135deg, #2A66FF, #5A8BFF)",
        "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
        "linear-gradient(135deg, #00C9A7, #00E5C0)",
      ];

      const mappedPatients = rawPatients.map((p, index) => {
        let status = p.status ? p.status.toLowerCase() : "stable";
        let statusLabel = "🟢 Stable";
        let statusType = "";
        let insightStyle = {
          borderLeftColor: "#00C187",
          background: "#F4FDF8",
        };

        if (status === "critical") {
          statusLabel = "🔴 Critical";
          insightStyle = { borderLeftColor: "#FF5C5C", background: "#FFECEC" };
        } else if (
          status === "under review" ||
          status === "underreview" ||
          status === "warning"
        ) {
          status = "underReview";
          statusLabel = "🟡 Under Review";
          statusType = "warning";
          insightStyle = { borderLeftColor: "#FFA500", background: "#FFF4E6" };
        }

        const nameParts = p.name ? p.name.split(" ") : ["U", "N"];
        let initials = "UN";
        if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
          initials = `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
        } else if (p.name && p.name.length >= 2) {
          initials = p.name.substring(0, 2).toUpperCase();
        }

        return {
          id: p.id || index,
          initials: p.initials || initials,
          name: p.name || "Unknown Patient",
          age: p.age || "N/A",
          condition: p.condition || p.disease || "Not specified",
          status: status,
          statusLabel: statusLabel,
          statusType: statusType,
          aiInsight:
            p.aiInsight || p.ai_insight || "No new insights available.",
          lastVisit: p.lastVisit || p.last_visit || "N/A",
          nextAppointment:
            p.nextAppointment ||
            p.next_appointment ||
            p.next_visit_date ||
            p.next_visit ||
            p.next_appointment_date ||
            p?.visit?.next_visit_date ||
            "No appointment scheduled",
          gradient: p.gradient || gradients[index % gradients.length],
          insightStyle: insightStyle,
        };
      });

      const resolvedPage = Number(meta?.current_page || pageNumber);
      const resolvedLastPage = Number(meta?.last_page || 1);

      setPatients(mappedPatients);
      setCurrentPage(resolvedPage);
      setLastPage(resolvedLastPage);

      console.log("[patients] state", {
        scheduledCurrentPage: resolvedPage,
        scheduledLastPage: resolvedLastPage,
        listLen: mappedPatients.length,
      });

      // ── Cache the result ──
      setCache(cacheKey, {
        patients: mappedPatients,
        currentPage: resolvedPage,
        lastPage: resolvedLastPage,
      });

      setLoading(false);
    } catch (err) {
      console.log("[patients] error fetch exception", err);
      setError("An error occurred while fetching patients.");
      setLoading(false);
    }
  };

  // ── Search fetch (reuses same response parsing + patient mapping as fetchPatients) ──
  const fetchSearch = async (pageNumber, term) => {
    const cacheKey = `patients_search_${term}_${pageNumber}`;
    const cached = getCache(cacheKey);
    if (cached) {
      setPatients(cached.patients);
      setCurrentPage(cached.currentPage);
      setLastPage(cached.lastPage);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await searchPatientsAPI(pageNumber, term);
      if (res.success === false) {
        setError(res.message || "Search failed");
        setPatients([]);
        setLastPage(1);
        setLoading(false);
        return;
      }

      let rawPatients = [];
      let meta = {};
      if (res?.meta) meta = res.meta;
      else if (res?.data?.meta) meta = res.data.meta;
      else if (res?.data?.data?.meta) meta = res.data.data.meta;

      if (Array.isArray(res?.data)) rawPatients = res.data;
      else if (res?.data?.data && Array.isArray(res.data.data))
        rawPatients = res.data.data;
      else if (Array.isArray(res)) rawPatients = res;

      console.log("[search] parsed", {
        meta,
        rawLen: rawPatients.length,
        firstItem: rawPatients[0],
      });

      const gradients = [
        "linear-gradient(135deg, #467DFF, #2A66FF)",
        "linear-gradient(135deg, #FF5C5C, #FF8A8A)",
        "linear-gradient(135deg, #FFA500, #FFB84D)",
        "linear-gradient(135deg, #00C187, #00E5A0)",
        "linear-gradient(135deg, #9D5CFF, #B380FF)",
        "linear-gradient(135deg, #2A66FF, #5A8BFF)",
        "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
        "linear-gradient(135deg, #00C9A7, #00E5C0)",
      ];
      const mappedPatients = rawPatients.map((p, index) => {
        let status = p.status ? p.status.toLowerCase() : "stable";
        let statusLabel = "🟢 Stable";
        let statusType = "";
        let insightStyle = {
          borderLeftColor: "#00C187",
          background: "#F4FDF8",
        };
        if (status === "critical") {
          statusLabel = "🔴 Critical";
          insightStyle = { borderLeftColor: "#FF5C5C", background: "#FFECEC" };
        } else if (
          status === "under review" ||
          status === "underreview" ||
          status === "warning"
        ) {
          status = "underReview";
          statusLabel = "🟡 Under Review";
          statusType = "warning";
          insightStyle = { borderLeftColor: "#FFA500", background: "#FFF4E6" };
        }
        const nameParts = p.name ? p.name.split(" ") : ["U", "N"];
        let initials = "UN";
        if (nameParts.length > 1 && nameParts[0] && nameParts[1])
          initials = `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
        else if (p.name && p.name.length >= 2)
          initials = p.name.substring(0, 2).toUpperCase();
        return {
          id: p.id || index,
          initials: p.initials || initials,
          name: p.name || "Unknown Patient",
          age: p.age || "N/A",
          condition: p.condition || p.disease || "Not specified",
          status,
          statusLabel,
          statusType,
          aiInsight:
            p.aiInsight || p.ai_insight || "No new insights available.",
          lastVisit: p.lastVisit || p.last_visit || "N/A",
          nextAppointment:
            p.nextAppointment ||
            p.next_appointment ||
            p.next_visit_date ||
            p.next_visit ||
            p.next_appointment_date ||
            p?.visit?.next_visit_date ||
            "No appointment scheduled",
          gradient: p.gradient || gradients[index % gradients.length],
          insightStyle,
        };
      });

      const resolvedPage = Number(meta?.current_page || pageNumber);
      const resolvedLastPage = Number(meta?.last_page || 1);

      setPatients(mappedPatients);
      setCurrentPage(resolvedPage);
      setLastPage(resolvedLastPage);
      console.log("[search] state", {
        currentPage: resolvedPage,
        lastPage: resolvedLastPage,
        listLen: mappedPatients.length,
      });

      // ── Cache the search result ──
      setCache(cacheKey, {
        patients: mappedPatients,
        currentPage: resolvedPage,
        lastPage: resolvedLastPage,
      });

      setLoading(false);
    } catch (err) {
      console.log("[search] error", err);
      setError("An error occurred while searching.");
      setLoading(false);
    }
  };

  // ── Status fetch ──
  const fetchByStatus = async (pageNumber, status) => {
    const STATUS_MAP = {
      critical: "critical",
      stable: "stable",
      underReview: "under review",
    };
    const statusSlug = STATUS_MAP[status] || status;

    const cacheKey = `patients_status_${statusSlug}_${pageNumber}`;
    const cached = getCache(cacheKey);
    if (cached) {
      setPatients(cached.patients);
      setCurrentPage(cached.currentPage);
      setLastPage(cached.lastPage);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    console.log("[status-filter] clicked:", status, "mapped:", statusSlug);

    try {
      const res = await getPatientsByStatusAPI(statusSlug, pageNumber);
      if (res.success === false) {
        setError(res.message || "Failed to load patients by status");
        setPatients([]);
        setLastPage(1);
        setLoading(false);
        return;
      }

      let rawPatients = [];
      let meta = {};
      if (res?.meta) meta = res.meta;
      else if (res?.data?.meta) meta = res.data.meta;
      else if (res?.data?.data?.meta) meta = res.data.data.meta;

      if (Array.isArray(res?.data)) rawPatients = res.data;
      else if (res?.data?.data && Array.isArray(res.data.data))
        rawPatients = res.data.data;
      else if (Array.isArray(res)) rawPatients = res;

      console.log("[status-filter] response first:", rawPatients?.[0]);
      console.log(`[status] parsed ${statusSlug}`, {
        meta,
        rawLen: rawPatients.length,
      });

      const gradients = [
        "linear-gradient(135deg, #467DFF, #2A66FF)",
        "linear-gradient(135deg, #FF5C5C, #FF8A8A)",
        "linear-gradient(135deg, #FFA500, #FFB84D)",
        "linear-gradient(135deg, #00C187, #00E5A0)",
        "linear-gradient(135deg, #9D5CFF, #B380FF)",
        "linear-gradient(135deg, #2A66FF, #5A8BFF)",
        "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
        "linear-gradient(135deg, #00C9A7, #00E5C0)",
      ];
      const mappedPatients = rawPatients.map((p, index) => {
        let pStatus = p.status ? p.status.toLowerCase() : "stable";
        let statusLabel = "🟢 Stable";
        let statusType = "";
        let insightStyle = {
          borderLeftColor: "#00C187",
          background: "#F4FDF8",
        };
        if (pStatus === "critical") {
          statusLabel = "🔴 Critical";
          insightStyle = { borderLeftColor: "#FF5C5C", background: "#FFECEC" };
        } else if (
          pStatus === "under review" ||
          pStatus === "underreview" ||
          pStatus === "warning" ||
          pStatus === "under_review"
        ) {
          pStatus = "underReview";
          statusLabel = "🟡 Under Review";
          statusType = "warning";
          insightStyle = { borderLeftColor: "#FFA500", background: "#FFF4E6" };
        }
        const nameParts = p.name ? p.name.split(" ") : ["U", "N"];
        let initials = "UN";
        if (nameParts.length > 1 && nameParts[0] && nameParts[1])
          initials = `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
        else if (p.name && p.name.length >= 2)
          initials = p.name.substring(0, 2).toUpperCase();
        return {
          id: p.id || index,
          initials: p.initials || initials,
          name: p.name || "Unknown Patient",
          age: p.age || "N/A",
          condition: p.condition || p.disease || "Not specified",
          status: pStatus,
          statusLabel,
          statusType,
          aiInsight:
            p.aiInsight || p.ai_insight || "No new insights available.",
          lastVisit: p.lastVisit || p.last_visit || "N/A",
          nextAppointment:
            p.nextAppointment ||
            p.next_appointment ||
            p.next_visit_date ||
            p.next_visit ||
            p.next_appointment_date ||
            p?.visit?.next_visit_date ||
            "No appointment scheduled",
          gradient: p.gradient || gradients[index % gradients.length],
          insightStyle,
        };
      });

      const resolvedPage = Number(meta?.current_page || pageNumber);
      const resolvedLastPage = Number(meta?.last_page || 1);

      setPatients(mappedPatients);
      setCurrentPage(resolvedPage);
      setLastPage(resolvedLastPage);

      // ── Cache the result ──
      setCache(cacheKey, {
        patients: mappedPatients,
        currentPage: resolvedPage,
        lastPage: resolvedLastPage,
      });

      setLoading(false);
    } catch (err) {
      console.log(`[status] error ${statusSlug}`, err);
      setError("An error occurred while fetching patients by status.");
      setLoading(false);
    }
  };

  // ── Single unified effect: search vs status vs list mode ──
  useEffect(() => {
    const trimmed = searchTerm.trim();

    let currentMode = "list";
    if (trimmed) {
      currentMode = "search";
    } else if (activeFilter !== "all") {
      currentMode = "status";
    }

    console.log(
      "[PatientList] mode",
      currentMode,
      "filter",
      activeFilter,
      "page",
      currentPage,
    );

    if (currentMode === "search") {
      fetchSearch(currentPage, trimmed);
    } else if (currentMode === "status") {
      fetchByStatus(currentPage, activeFilter);
    } else {
      fetchPatients(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, activeFilter]);

  // ── Sync status from PatientProfile updates ──
  useEffect(() => {
    const handleStatusSync = (e) => {
      const { patientId: updatedId, status: updatedStatus } = e.detail;

      if (activeFilter !== "all") {
        // Filter is active: refetch to remove patients that no longer match
        if (activeFilter === "critical") fetchByStatus(currentPage, "critical");
        else if (activeFilter === "stable")
          fetchByStatus(currentPage, "stable");
        else if (activeFilter === "underReview")
          fetchByStatus(currentPage, "underReview");
      } else {
        // No filter: update the matching card's status label/style in-place
        const STATUS_META = {
          stable: {
            statusLabel: "🟢 Stable",
            statusType: "",
            insightStyle: { borderLeftColor: "#00C187", background: "#F4FDF8" },
          },
          critical: {
            statusLabel: "🔴 Critical",
            statusType: "",
            insightStyle: { borderLeftColor: "#FF5C5C", background: "#FFECEC" },
          },
          "under review": {
            statusLabel: "🟡 Under Review",
            statusType: "warning",
            insightStyle: { borderLeftColor: "#FFA500", background: "#FFF4E6" },
          },
        };
        const displayStatus =
          updatedStatus === "under review" ? "underReview" : updatedStatus;
        const meta = STATUS_META[updatedStatus] ?? STATUS_META["stable"];

        setPatients((prev) =>
          prev.map((p) =>
            String(p.id) === String(updatedId)
              ? { ...p, status: displayStatus, ...meta }
              : p,
          ),
        );
      }
    };

    window.addEventListener("patientStatusUpdated", handleStatusSync);
    return () =>
      window.removeEventListener("patientStatusUpdated", handleStatusSync);
  }, [activeFilter, currentPage]); // re-bind when filter or page changes

  // ── Sync next visit date from PatientProfile updates ──
  useEffect(() => {
    const handleNextVisitSync = (e) => {
      const { patientId: updatedId, next_visit_date } = e.detail;
      setPatients((prev) =>
        prev.map((p) =>
          String(p.id) === String(updatedId)
            ? { ...p, nextAppointment: next_visit_date }
            : p,
        ),
      );
    };
    window.addEventListener("patientNextVisitUpdated", handleNextVisitSync);
    return () =>
      window.removeEventListener(
        "patientNextVisitUpdated",
        handleNextVisitSync,
      );
  }, []); // no dependencies — only needs to run once

  const visiblePatients = patients;

  console.log("columns:", Math.max(1, Math.floor(pageSize / 3)));
  console.log("pageSize:", pageSize);
  console.log("visible:", visiblePatients.length);

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);
  const openInsightModal = (insight) => setSelectedInsight(insight);
  const closeInsightModal = () => setSelectedInsight(null);

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await deletePatientAPI(patientToDelete.id);
      if (result && result.success === false) {
        setDeleteError(
          result.message || "Failed to delete patient. Please try again.",
        );
      } else {
        // ── Invalidate patient list + dashboard caches so both re-fetch on next visit ──
        window.dispatchEvent(new CustomEvent("patientListInvalidated"));
        window.dispatchEvent(new CustomEvent("dashboardInvalidated"));

        const trimmed = searchTerm.trim();
        if (trimmed) {
          fetchSearch(currentPage, trimmed);
        } else if (activeFilter !== "all") {
          fetchByStatus(currentPage, activeFilter);
        } else {
          fetchPatients(currentPage);
        }
        setIsDeleteModalOpen(false);
        setPatientToDelete(null);
      }
    } catch (err) {
      setDeleteError("An error occurred while deleting the patient.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Grouped Pagination Logic ──
  const PAGINATION_GROUP_SIZE = 10;
  const currentGroup = Math.floor((currentPage - 1) / PAGINATION_GROUP_SIZE);
  const startPage = currentGroup * PAGINATION_GROUP_SIZE + 1;
  const endPage = Math.min(startPage + PAGINATION_GROUP_SIZE - 1, lastPage);

  return (
    <>
      <div className="background-pattern"></div>

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

      {selectedInsight && (
        <div
          className="modal-overlay active"
          onClick={(e) =>
            e.target.className.includes("modal-overlay") && closeInsightModal()
          }
          style={{ zIndex: 1100 }}
        >
          <div className="modal-content">
            <button className="modal-close" onClick={closeInsightModal}>
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="modal-header" style={{ marginBottom: "16px" }}>
              <h2 className="modal-title" style={{ fontSize: "20px" }}>
                AI Insight
              </h2>
            </div>
            <div className="modal-body" style={{ marginBottom: "0" }}>
              <p
                className="modal-text"
                style={{
                  whiteSpace: "pre-wrap",
                  margin: "0",
                  fontSize: "14px",
                  lineHeight: "1.6",
                }}
              >
                {selectedInsight}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="patients-page-header">
          <h2 className="patients-title">Patient List</h2>
        </div>
        <div className="patients-top-row">
          <div className="page-search-container">
            <svg
              className="page-search-icon"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              className="page-search"
              style={{ padding: "12px 16px 12px 44px" }}
              placeholder="Search by name or national ID"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="addbtn">
            <a
              href="[Final] Add Patient.html"
              onClick={(e) => {
                e.preventDefault();
                navigate("/addpatient");
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginRight: "7px",
                  marginBottom: "1px",
                }}
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Add New Patient
            </a>
          </div>
        </div>

        <div className="filter-chips">
          <div
            className={`chip ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => {
              setActiveFilter("all");
              setCurrentPage(1);
            }}
          >
            <i className="fa-solid fa-user-plus"></i>
            <span>All Patients</span>
          </div>
          <div
            className={`chip ${activeFilter === "critical" ? "active" : ""}`}
            onClick={() => {
              setActiveFilter("critical");
              setCurrentPage(1);
            }}
          >
            Critical
          </div>
          <div
            className={`chip ${activeFilter === "stable" ? "active" : ""}`}
            onClick={() => {
              setActiveFilter("stable");
              setCurrentPage(1);
            }}
          >
            Stable
          </div>
          <div
            className={`chip ${activeFilter === "underReview" ? "active" : ""}`}
            onClick={() => {
              setActiveFilter("underReview");
              setCurrentPage(1);
            }}
          >
            Under Review
          </div>
        </div>

        <div className="patient-grid" ref={gridRef}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => {
              const types = [
                {
                  status: "critical",
                  type: "critical",
                  label: "🔴 Critical",
                  style: { borderLeftColor: "#FF5C5C", background: "#FFECEC" },
                },
                {
                  status: "stable",
                  type: "stable",
                  label: "🟢 Stable",
                  style: { borderLeftColor: "#00C187", background: "#F4FDF8" },
                },
                {
                  status: "under-review",
                  type: "warning",
                  label: "🟡 Under Review",
                  style: { borderLeftColor: "#FFA500", background: "#FFF4E6" },
                },
              ];
              const type = types[i % 3];
              const names = [
                "Fatma Ahmed Ali",
                "Mohamed Sayed",
                "Aisha Mahmoud",
                "Youssef Ibrahim",
                "Mona Tarek",
                "Khaled Yassin",
                "Nour Hassan",
                "Sara Othman",
              ];
              const initials = ["FA", "MS", "AM", "YI", "MT", "KY", "NH", "SO"];

              const dummyPatient = {
                id: `dummy-${i}`,
                initials: initials[i],
                name: names[i],
                age: `${35 + i * 4} Years`,
                status: type.status,
                statusLabel: type.label,
                statusType: type.type,
                aiInsight:
                  "Based on recent laboratory results and patient history, condition points to typical symptomatic patterns requiring baseline monitoring.",
                lastVisit: "May 10, 2026",
                nextAppointment: "Jun 14, 2026",
                insightStyle: type.style,
              };

              return (
                <div
                  key={i}
                  className="preview-shimmer"
                  style={{
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    borderRadius: "16px",
                    display: "block",
                  }}
                >
                  <PatientCard
                    patient={dummyPatient}
                    index={null}
                    cardRef={null}
                    navigate={() => {}}
                    setPatientToDelete={() => {}}
                    setIsDeleteModalOpen={() => {}}
                    setDeleteError={() => {}}
                    openInsightModal={() => {}}
                  />
                </div>
              );
            })
          ) : error ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                width: "100%",
                gridColumn: "1 / -1",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                borderRadius: "12px",
                border: "1px solid #fecaca",
              }}
            >
              <p style={{ margin: "0 0 10px 0", fontWeight: "500" }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Retry
              </button>
            </div>
          ) : visiblePatients.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                width: "100%",
                gridColumn: "1 / -1",
                color: "#6b7280",
              }}
            >
              No patients found.
            </div>
          ) : (
            visiblePatients.map((patient, index) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                index={index}
                cardRef={cardRef}
                navigate={navigate}
                setPatientToDelete={setPatientToDelete}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                setDeleteError={setDeleteError}
                openInsightModal={openInsightModal}
              />
            ))
          )}
        </div>

        <div className="pagination">
          <button
            disabled={currentPage <= 1 || patients.length === 0}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous Page"
          >
            ◂ Prev
          </button>

          {startPage > 1 && (
            <button
              onClick={() => setCurrentPage(startPage - 1)}
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
              className={currentPage === page ? "active" : ""}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          {endPage < lastPage && (
            <button
              onClick={() => setCurrentPage(endPage + 1)}
              title="Next 10 Pages"
            >
              »
            </button>
          )}

          <button
            disabled={currentPage >= lastPage || patients.length === 0}
            onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
            title="Next Page"
          >
            Next ▸
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setPatientToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Patient"
        description={
          <>
            Are you sure you want to delete this patient?
            {deleteError && (
              <div
                style={{
                  color: "var(--danger-color, #ef4444)",
                  marginTop: "8px",
                  fontSize: "14px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {deleteError}
              </div>
            )}
          </>
        }
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        variant="danger"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        }
      />
    </>
  );
};

export default PatientList;
