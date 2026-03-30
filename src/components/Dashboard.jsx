import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import logo from "../assets/Logo_Diagnoo.png";
import stethoscope from "../assets/Stethoscope.png";
import closeIcon from "../assets/close.png";
import openIcon from "../assets/open.png";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import "../css/Dashboard.css";
import { useNotifications } from "./NotificationsContext";
import {
  getDashboardWidgets,
  getDashboardStatusDistribution,
  getTopfiveDiseases,
  getTodayVisitsAPI,
  getPatientOverviewAPI,
  markPatientAttendedAPI,
} from "./mockAPI.js";

const AVATAR_COLORS = [
  "#FF4D6D",
  "#4C6EF5",
  "#E67700",
  "#2F9E44",
  "#9B5DE5",
  "#06D6A0",
  "#F77F00",
  "#3A86FF",
];

export function getDoctorInitials() {
  const name = localStorage.getItem('doctor_name') || '';
  // Strip "Dr." / "Dr " prefix, then take first letter of each remaining word
  const cleaned = name.replace(/^Dr\.?\s*/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function QueueSection() {
  const [queueData, setQueueData] = useState(null);
  const [queueList, setQueueList] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingLabel, setRemainingLabel] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [modalPatient, setModalPatient] = useState(null);
  const navigate = useNavigate();

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);

    const result = await getTodayVisitsAPI();

    if (result?.success && result?.data) {
      const data = result.data;

      const mapped = (data.full_queue_list || []).map((p) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        apptTime: p.appointment_time,
        status_tag: p.status_tag,
        aiInsight:
          data.current_attending?.id === p.id
            ? data.current_attending?.ai_insight?.summary || null
            : null,
        initials: p.name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join(""),
        color: AVATAR_COLORS[p.id % AVATAR_COLORS.length],
      }));

      const nowIdx = mapped.findIndex((p) => p.status_tag === "Now");
      setQueueList(mapped);
      setCurrentIdx(nowIdx >= 0 ? nowIdx : 0);
      setRemainingLabel(data.remaining_count_label || "");
    } else {
      setQueueList([]);
    }

    setLoadingQueue(false);
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const goToNextPatient = () => {
    setCurrentIdx((prev) => {
      const total = queueList.length;
      if (total === 0) return prev;

      for (let offset = 1; offset <= total; offset++) {
        const candidateIdx = (prev + offset) % total;
        const candidate = queueList[candidateIdx];
        if (
          candidate.status_tag === "Waiting" ||
          candidate.status_tag === "Now"
        ) {
          return candidateIdx;
        }
      }

      return prev;
    });
  };

  const handleViewDetails = async (patientId) => {
    if (!patientId) return;

    try {
      const result = await getPatientOverviewAPI(patientId);

      if (result?.success) {
        navigate(`/patient-profile/${patientId}`, { state: { patientId } });
      } else {
        console.warn(
          "[ViewDetails] overview fetch failed, navigating anyway:",
          result?.message,
        );
        navigate(`/patient-profile/${patientId}`, { state: { patientId } });
      }
    } catch (err) {
      console.error("[ViewDetails] unexpected error:", err);
      navigate(`/patient-profile/${patientId}`, { state: { patientId } });
    }
  };

  const handleMarkAttended = async () => {
    if (!activePatient?.id) return;

    const patientId = activePatient.id;

    const prevQueueList = queueList;
    const prevCurrentIdx = currentIdx;
    const prevRemainingLabel = remainingLabel;

    const queueWithoutAttended = queueList.filter((p) => p.id !== patientId);

    const queueAfterShift = queueWithoutAttended.map((p, i) => ({
      ...p,
      status_tag: i === 0 ? "Now" : "Waiting",
    }));

    setQueueList(queueAfterShift);
    setCurrentIdx(0);
    setRemainingLabel(
      `${queueAfterShift.filter((p) => p.status_tag === "Waiting").length} remaining`,
    );

    try {
      const result = await markPatientAttendedAPI(patientId);

      if (result?.success) {
        const refreshed = await getTodayVisitsAPI();

        if (
          refreshed?.success &&
          refreshed?.data?.full_queue_list?.length > 0
        ) {
          const data = refreshed.data;

          const remapped = (data.full_queue_list || []).map((p) => ({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            apptTime: p.appointment_time,
            status_tag: p.status_tag,
            aiInsight:
              data.current_attending?.id === p.id
                ? data.current_attending?.ai_insight?.summary || null
                : null,
            initials: p.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join(""),
            color: AVATAR_COLORS[p.id % AVATAR_COLORS.length],
          }));

          const nowIdx = remapped.findIndex((p) => p.status_tag === "Now");

          if (remapped.length >= queueAfterShift.length) {
            setQueueList(remapped);
            setCurrentIdx(nowIdx >= 0 ? nowIdx : 0);
            setRemainingLabel(
              data.remaining_count_label ||
                `${remapped.filter((p) => p.status_tag === "Waiting").length} remaining`,
            );
          }
        }
      } else {
        console.error("[MarkAttended] backend rejected:", result?.message);
        setQueueList(prevQueueList);
        setCurrentIdx(prevCurrentIdx);
        setRemainingLabel(prevRemainingLabel);
      }
    } catch (err) {
      console.error("[MarkAttended] network error:", err);
      setQueueList(prevQueueList);
      setCurrentIdx(prevCurrentIdx);
      setRemainingLabel(prevRemainingLabel);
    }
  };
  const markAttended = (id) => {
    setQueueList((list) =>
      list.map((p) => (p.id === id ? { ...p, status_tag: "Attended" } : p)),
    );
    goToNextPatient();
  };

  const skipPatient = (id) => {
    setQueueList((list) =>
      list.map((p) => (p.id === id ? { ...p, status_tag: "Skipped" } : p)),
    );
    goToNextPatient();
  };

  const activePatient = queueList[currentIdx] ?? null;
  const pendingCount = queueList.filter(
    (p) => p.status_tag === "Now" || p.status_tag === "Waiting",
  ).length;

  const badgeClass = (p, i) => {
    if (p.status_tag === "Attended") return "dsn-badge-success";
    if (p.status_tag === "Skipped") return "dsn-badge-warning";
    if (i === currentIdx) return "dsn-badge-danger";
    return "dsn-badge-muted";
  };
  const badgeText = (p, i) => {
    if (p.status_tag === "Attended") return "✓ Attended";
    if (p.status_tag === "Skipped") return "→ Skipped";
    if (i === currentIdx) return "● Now";
    return `#${i + 1} Waiting`;
  };

  if (loadingQueue) {
    return (
      <div className="dsn-queue-section">
        <div className="dsn-section-header">
          <div className="dsn-section-title">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
            </svg>
            Critical Patient Queue
          </div>
          <span className="dsn-queue-count dsn-loading-blur">— remaining</span>
        </div>
        <div
          className="dsn-active-card dsn-loading-blur"
          style={{ minHeight: 120 }}
        />
      </div>
    );
  }

  if (queueList.length === 0) {
    return (
      <div className="dsn-queue-section">
        <div className="dsn-section-header">
          <div className="dsn-section-title">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
            </svg>
            Critical Patient Queue
          </div>
          <span className="dsn-queue-count">0 remaining</span>
        </div>
        <div className="dsn-done-card">
          <div className="dsn-done-emoji">📋</div>
          <div className="dsn-done-title">No patients scheduled for today</div>
          <div className="dsn-done-sub">
            Today's queue is empty. Check back later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dsn-queue-section">
      <div className="dsn-section-header">
        <div className="dsn-section-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
          </svg>
          Critical Patient Queue
        </div>
        <span className="dsn-queue-count">
          {remainingLabel || `${pendingCount} remaining`}
        </span>
      </div>

      {activePatient &&
      activePatient.status_tag !== "Attended" &&
      activePatient.status_tag !== "Skipped" ? (
        <div className="dsn-active-card" key={activePatient.id}>
          <div
            className="dsn-active-avatar"
            style={{ background: activePatient.color }}
          >
            {activePatient.initials}
          </div>
          <div className="dsn-active-info">
            <div className="dsn-active-top">
              <span className="dsn-active-name">{activePatient.name}</span>
              <span className="dsn-now-badge">
                <span className="dsn-now-dot" /> Now Attending
              </span>
            </div>
            <div className="dsn-active-meta">
              <span className="dsn-active-meta-age">
                {activePatient.age} · {activePatient.gender}
              </span>
              <span className="dsn-active-appt">
                Appointment: {activePatient.apptTime}
              </span>
            </div>
            <div className="dsn-insight-box">
              <div className="dsn-insight-label">🤖 AI Insight</div>
              <div className="dsn-insight-text">
                {activePatient.aiInsight ||
                  "No AI insights available for this patient"}
              </div>
            </div>
          </div>
          <div className="dsn-active-actions">
            <button className="dsn-btn-attended" onClick={handleMarkAttended}>
              <svg viewBox="0 0 24 24" fill="white" className="dsn-btn-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Mark Attended
            </button>
            <button className="dsn-btn-next" onClick={goToNextPatient}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="dsn-btn-icon"
              >
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
              Next Patient
            </button>
            <button
              className="dsn-btn-view"
              onClick={() => handleViewDetails(activePatient.id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="dsn-btn-icon"
              >
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
              View Details
            </button>
          </div>
        </div>
      ) : (
        <div className="dsn-done-card">
          <div className="dsn-done-emoji">🎉</div>
          <div className="dsn-done-title">All patients attended!</div>
          <div className="dsn-done-sub">
            Today's queue is complete. Great work!
          </div>
        </div>
      )}

      <div className="dsn-queue-list">
        <div className="dsn-queue-list-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
          All Patients in Queue
        </div>
        {queueList.map((p, i) => (
          <div
            key={p.id}
            className={`dsn-mini-card${
              p.status_tag === "Attended"
                ? " dsn-attended"
                : p.status_tag === "Skipped"
                  ? " dsn-skipped"
                  : ""
            }`}
          >
            <div
              className={`dsn-queue-num${
                i === currentIdx &&
                (p.status_tag === "Now" || p.status_tag === "Waiting")
                  ? " dsn-active-num"
                  : ""
              }`}
            >
              {i + 1}
            </div>
            <div className="dsn-mini-avatar" style={{ background: p.color }}>
              {p.initials}
            </div>
            <div className="dsn-mini-info">
              <div className="dsn-mini-name">{p.name}</div>
              <div className="dsn-mini-sub">
                {p.age} · {p.gender} · {p.apptTime}
              </div>
            </div>
            <span className={`dsn-mini-badge ${badgeClass(p, i)}`}>
              {badgeText(p, i)}
            </span>
            <button
              className="dsn-mini-view-btn"
              onClick={() => setModalPatient(p)}
            >
              View
            </button>
          </div>
        ))}
      </div>

      {modalPatient && (
        <div
          id="dsn-modal-overlay"
          className="dsn-open"
          onClick={(e) => {
            if (e.target.id === "dsn-modal-overlay") setModalPatient(null);
          }}
        >
          <div id="dsn-modal-box">
            <div className="dsn-modal-header">
              <div
                className="dsn-modal-avatar"
                style={{ background: modalPatient.color }}
              >
                {modalPatient.initials}
              </div>
              <div>
                <div className="dsn-modal-title">{modalPatient.name}</div>
                <div className="dsn-modal-sub">
                  {modalPatient.age} · {modalPatient.gender} · Appointment:{" "}
                  {modalPatient.apptTime}
                </div>
              </div>
            </div>
            <div className="dsn-modal-divider" />
            <div className="dsn-modal-chips">
              {[
                {
                  label: "Age",
                  val: modalPatient.age,
                  className: "dsn-chip-default",
                },
                {
                  label: "Gender",
                  val: modalPatient.gender,
                  className: "dsn-chip-default",
                },
                {
                  label: "Appointment",
                  val: modalPatient.apptTime,
                  className: "dsn-chip-primary",
                },
                {
                  label: "Status",
                  val: modalPatient.status_tag,
                  className: "dsn-chip-status",
                },
              ].map((c) => (
                <div className={`dsn-modal-chip ${c.className}`} key={c.label}>
                  <div className="dsn-modal-chip-label">{c.label}</div>
                  <div className="dsn-modal-chip-val">{c.val}</div>
                </div>
              ))}
            </div>
            <div className="dsn-modal-notes">
              <strong>🤖 AI Insight:</strong>
              <br />
              {modalPatient.aiInsight ||
                "No AI insights available for this patient"}
            </div>
            <div className="dsn-modal-btns">
              <button
                className="dsn-modal-cancel"
                onClick={() => setModalPatient(null)}
              >
                Close
              </button>
              <button
                className="dsn-modal-confirm"
                onClick={() => {
                  setModalPatient(null);
                  handleViewDetails(modalPatient.id);
                }}
              >
                Open Full Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { unreadCount, openNotifications } = useNotifications();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const { credits, isCreditsLoading } = useSubscription();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const [data, setData] = useState(null);
  const [statusDistribution, setStatusDistribution] = useState(null);
  const [TopDiseases, setTopDiseases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getDashboardWidgets();
      const resultStatus = await getDashboardStatusDistribution();
      const resultTopDiseases = await getTopfiveDiseases();

      console.log(result);
      if (result.success) {
        setData(result.data);
        console.log("Dashboard Widgets:", result.data);
        if (result.data?.doctor_name) {
          localStorage.setItem("doctor_name", result.data.doctor_name);
        }
      }
      setLoading(false);

      if (resultStatus.success) {
        setStatusDistribution(resultStatus.data);
        console.log("Dashboard Status Distribution:", resultStatus.data);
      }
      setLoading(false);

      if (resultTopDiseases.success) {
        setTopDiseases(resultTopDiseases.data);
        console.log("Top 5 Diseases:", resultTopDiseases.data);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const growthDetails = data?.widgets.monthly_growth.details;
  return (
    <>
      <Sidebar activePage="dashboard" />

      <nav className={`top-navbar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="navbar-right">
          <div
            className="credits-badge"
            onClick={() =>
              navigate("/subscription", { state: { tab: "billing" } })
            }
          >
            <span className="credits-icon">
              <svg viewBox="0 0 24 24">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </span>
            <span>
              Credits:{" "}
              {isCreditsLoading ? "..." : (credits?.toLocaleString() ?? "0")}
            </span>
          </div>

          <button className="icon-btn" onClick={() => openNotifications()}>
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          <div className="user-avatar-container" ref={avatarMenuRef}>
            <div
              className="user-avatar"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
            >
              {getDoctorInitials()}
            </div>
            {isAvatarMenuOpen && (
              <div className="avatar-dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    navigate("/settings");
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--hover-bg, #f3f4f6)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile Settings
                </div>
                <div
                  className="dropdown-item dropdown-item--danger"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--danger-bg-subtle, #fee2e2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      {/* ── MAIN CONTENT (scoped under #dsn-main) ── */}
      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div id="dsn-main">
          {/* ── TOP WHITE WRAPPER ── */}
          <div className="dsn-top-wrapper">
            <div className="dsn-greeting">
              {loading ? (
                <>
                  <h1 className="dsn-loading-blur">Welcome, Dr. Loading...</h1>
                  <p className="dsn-loading-blur">
                    Here's a summary of today's key AI insights and patient
                    status.
                  </p>
                </>
              ) : (
                <>
                  <h1>Welcome, Dr. {data?.doctor_name || "User"}</h1>
                  <p>
                    Here's a summary of today's key AI insights and patient
                    status.
                  </p>
                </>
              )}
            </div>

            <div className="dsn-stats-grid">
              {[
                {
                  label: "Total Registered Patients",
                  val: data?.widgets.total_patients,
                  color: "#3B5BDB",
                  icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
                },
                {
                  label: "Today's Appointments",
                  val: data?.widgets.today_appointments,
                  color: "#3B5BDB",
                  icon: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
                },
                {
                  label: "Reports Analyzed",
                  val: data?.widgets.reports_analyzed,
                  color: "#2F9E44",
                  icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
                },
              ].map((item, idx) => (
                <div className="dsn-stat-card" key={idx}>
                  <div className="dsn-stat-label">
                    <svg
                      viewBox="0 0 24 24"
                      fill={item.color}
                      style={{ width: "20px" }}
                    >
                      <path d={item.icon} />
                    </svg>
                    <strong>{item.label}</strong>
                  </div>
                  <div>
                    {loading ? (
                      <span className="dsn-stat-value dsn-loading-blur">
                        12
                      </span>
                    ) : (
                      <span className="dsn-stat-value">{item.val ?? 0}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Card 4 — Monthly Growth */}
              <div className="dsn-stat-card dsn-stat-card--growth">
                <div className="dsn-stat-label dsn-stat-label--primary">
                  <svg
                    viewBox="0 0 24 24"
                    fill="var(--dsn-primary)"
                    style={{ width: "20px" }}
                  >
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
                  </svg>
                  <strong>Monthly Patient Growth</strong>
                </div>
                <div className="dsn-growth-grid">
                  {[
                    {
                      sub: "Last Mo.",
                      valPath: data?.widgets.monthly_growth.details.last_month,
                    },
                    {
                      sub: "This Mo.",
                      valPath: data?.widgets.monthly_growth.details.this_month,
                      className: "dsn-growth-val--primary",
                    },
                    {
                      sub: "Diff.",
                      valPath: data?.widgets.monthly_growth.details.difference,
                    },
                    {
                      sub: "Growth",
                      valPath: data?.widgets.monthly_growth.details.growth_rate,
                    },
                  ].map((g, i) => (
                    <div className="dsn-growth-col" key={i}>
                      <div className="dsn-growth-sub">{g.sub}</div>
                      {loading ? (
                        <div className="dsn-growth-val dsn-loading-blur">
                          124
                        </div>
                      ) : (
                        <div
                          className={`dsn-growth-val ${g.className || ""} ${
                            g.sub === "Diff."
                              ? g.valPath?.toString().startsWith("-")
                                ? "dsn-growth-val--danger"
                                : "dsn-growth-val--success"
                              : ""
                          } ${
                            g.sub === "Growth"
                              ? data?.widgets.monthly_growth.details.trend ===
                                "up"
                                ? "dsn-growth-val--success"
                                : "dsn-growth-val--danger"
                              : ""
                          }`}
                        >
                          {g.sub === "Growth"
                            ? `${data?.widgets.monthly_growth.details.trend === "up" ? "↑" : "↓"}${g.valPath}`
                            : (g.valPath ?? 0)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dsn-ai-status">
              {loading ? (
                <div className="dsn-loading-blur" style={{ fontSize: "12px" }}>
                  AI system running v0.0 Core — updated ...
                </div>
              ) : (
                <>
                  <div className="dsn-ai-dot" />
                  AI system running v3.2 Neural Core — updated 2h ago
                </>
              )}
            </div>
          </div>

          {/* ── CHARTS ROW ── */}
          <div className="dsn-charts-row">
            {/* Donut — Patient Status */}
            <div className="dsn-chart-card">
              <div
                className={`dsn-chart-title ${loading ? "dsn-loading-blur" : ""}`}
              >
                Patient Status Distribution
              </div>
              <div className="dsn-donut-wrap" style={{ position: "relative" }}>
                <svg
                  width="140"
                  height="140"
                  viewBox="0 0 130 130"
                  className={`dsn-donut-svg ${loading ? "dsn-loading-blur" : ""}`}
                >
                  {(() => {
                    const radius = 50;
                    const circumference = 2 * Math.PI * radius;
                    let cumulativePercentage = 0;

                    const statusColors = {
                      critical: "#FF4D6D",
                      stable: "#06D6A0",
                      "under review": "#FF8C42",
                    };

                    const displayData = loading
                      ? [
                          { status: "loading1", percentage: 33, value: 0 },
                          { status: "loading2", percentage: 33, value: 0 },
                          { status: "loading3", percentage: 34, value: 0 },
                        ]
                      : statusDistribution?.pie_chart_data || [];

                    return displayData.map((item, index) => {
                      const strokeLength =
                        (item.percentage / 100) * circumference;
                      const offset =
                        (cumulativePercentage / 100) * circumference;
                      cumulativePercentage += item.percentage;

                      return (
                        <circle
                          key={index}
                          cx="65"
                          cy="65"
                          r={radius}
                          fill="none"
                          stroke={
                            loading
                              ? "#eee"
                              : statusColors[item.status] || "#ccc"
                          }
                          strokeWidth="22"
                          strokeDasharray={`${strokeLength} ${circumference}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 65 65)"
                          className="dsn-donut-segment"
                          onMouseEnter={() =>
                            !loading && setHoveredStatus(item)
                          }
                          onMouseMove={(e) => {
                            if (!loading) {
                              setTooltipPos({
                                x: e.nativeEvent.offsetX,
                                y: e.nativeEvent.offsetY,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredStatus(null)}
                          style={{
                            transition: "all 0.3s ease",
                            cursor: loading ? "default" : "pointer",
                            opacity:
                              hoveredStatus &&
                              hoveredStatus.status !== item.status
                                ? 0.6
                                : 1,
                          }}
                        />
                      );
                    });
                  })()}

                  <circle cx="65" cy="65" r="39" fill="white" />
                  <text
                    x="65"
                    y="61"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    fill="#1A1D2E"
                    fontFamily="'Inter', sans-serif"
                    className={loading ? "dsn-loading-blur" : ""}
                  >
                    {loading
                      ? "00"
                      : statusDistribution?.total_registered_patients || 0}
                  </text>
                  <text
                    x="65"
                    y="76"
                    textAnchor="middle"
                    fontSize="10"
                    fill="#8C91A7"
                    fontFamily="'Inter', sans-serif"
                    className={loading ? "dsn-loading-blur" : ""}
                  >
                    patients
                  </text>
                </svg>

                {hoveredStatus && (
                  <div
                    className="dsn-custom-tooltip"
                    style={{
                      position: "absolute",
                      left: tooltipPos.x + 15,
                      top: tooltipPos.y - 10,
                      pointerEvents: "none",
                      zIndex: 100,
                    }}
                  >
                    <div
                      className="tooltip-status"
                      style={{ textTransform: "capitalize" }}
                    >
                      <strong>{hoveredStatus.status}</strong>
                    </div>
                    <div className="tooltip-value">
                      {hoveredStatus.value} Patients ({hoveredStatus.percentage}
                      %)
                    </div>
                  </div>
                )}

                <div className="dsn-legend-list">
                  {(loading
                    ? [
                        { status: "critical", percentage: 0 },
                        { status: "stable", percentage: 0 },
                        { status: "under review", percentage: 0 },
                      ]
                    : statusDistribution?.pie_chart_data || []
                  ).map((item, index) => {
                    const config = {
                      critical: { color: "#FF4D6D", bg: "#FFF0F3" },
                      stable: {
                        color: "#06D6A0",
                        bg: "#E6FAF5",
                      },
                      "under review": { color: "#FF8C42", bg: "#FFF5ED" },
                    };
                    const style = config[item.status] || {
                      color: "#ccc",
                      bg: "#f5f5f5",
                    };

                    return (
                      <div
                        key={index}
                        className={`dsn-legend-row ${loading ? "dsn-loading-blur" : ""}`}
                        style={{ background: style.bg }}
                      >
                        <div
                          className="dsn-legend-dot"
                          style={{ background: style.color }}
                        />
                        <span className="dsn-legend-label">{item.status}</span>
                        <span
                          className="dsn-legend-pct"
                          style={{ color: style.color }}
                        >
                          {loading ? "00%" : `${item.percentage}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bar Chart — Top 5 Chronic Diseases */}
            <div className="dsn-chart-card">
              <div
                className={`dsn-chart-title ${loading ? "dsn-loading-blur" : ""}`}
              >
                Top 5 Chronic Diseases
              </div>
              <div
                className={`dsn-chart-subtitle ${loading ? "dsn-loading-blur" : ""}`}
              >
                Selected by doctor in medical forms
              </div>
              <div className="dsn-bar-chart-wrap">
                <div className="dsn-bar-columns">
                  {(() => {
                    const barColors = [
                      "linear-gradient(180deg,#4361EE,#748FFC)",
                      "linear-gradient(180deg,#06D6A0,#3DCFB4)",
                      "linear-gradient(180deg,#FF8C42,#FFA96B)",
                      "linear-gradient(180deg,#FF4D6D,#FF7A93)",
                      "linear-gradient(180deg,#9B5DE5,#BB8AEE)",
                    ];

                    const displayData = loading
                      ? [
                          { label: "Loading", value: 10 },
                          { label: "Loading", value: 8 },
                          { label: "Loading", value: 6 },
                          { label: "Loading", value: 9 },
                          { label: "Loading", value: 7 },
                        ]
                      : TopDiseases || [];

                    const maxVal = Math.max(
                      ...(displayData.map((d) => d.value) || [1]),
                    );
                    const maxHeight = 160;

                    return displayData.map((item, i) => (
                      <div className="dsn-bar-col" key={i}>
                        <span
                          className={`dsn-bar-val ${loading ? "dsn-loading-blur" : ""}`}
                        >
                          {loading ? "00" : item.value}
                        </span>
                        <div
                          className={`dsn-bar-fill ${loading ? "dsn-loading-blur" : ""}`}
                          style={{
                            background: loading
                              ? "#eee"
                              : barColors[i % barColors.length],
                            height: `${(item.value / maxVal) * maxHeight}px`,
                            transition: "height 0.5s ease",
                          }}
                        />
                      </div>
                    ));
                  })()}
                </div>

                <div className="dsn-bar-labels">
                  {(loading
                    ? [1, 2, 3, 4, 5].map(() => ({ label: "Disease" }))
                    : TopDiseases || []
                  ).map((item, i) => (
                    <div
                      key={i}
                      className={`dsn-bar-lbl ${loading ? "dsn-loading-blur" : ""}`}
                      style={{
                        whiteSpace: "pre-line",
                        textTransform: "capitalize",
                      }}
                    >
                      {loading ? "Loading" : item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── QUEUE MANAGEMENT ── */}
          <QueueSection />
        </div>
      </main>
    </>
  );
}
