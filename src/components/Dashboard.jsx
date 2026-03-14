import React, { useState, useRef, useEffect } from "react";
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


const INITIAL_PATIENTS = [
  {
    id: 0, initials: "AM", color: "#FF4D6D",
    name: "Ahmed Mohamed", age: "52", gender: "Male", apptTime: "09:00 AM",
    aiInsight: "AI detected potential cardiac anomaly. Elevated troponin levels with ST-segment changes observed.",
    status: "pending",
  },
  {
    id: 1, initials: "SK", color: "#4C6EF5",
    name: "Sarah Kamal", age: "38", gender: "Female", apptTime: "10:00 AM",
    aiInsight: "Abnormal ECG patterns detected with irregular heart rhythm. Immediate consultation recommended.",
    status: "pending",
  },
  {
    id: 2, initials: "OH", color: "#E67700",
    name: "Omar Hamed", age: "61", gender: "Male", apptTime: "11:00 AM",
    aiInsight: "Blood pressure readings significantly elevated. Hypertensive crisis pattern detected.",
    status: "pending",
  },
  {
    id: 3, initials: "NR", color: "#2F9E44",
    name: "Nadia Rashid", age: "45", gender: "Female", apptTime: "12:00 PM",
    aiInsight: "Critical glucose levels detected. Diabetic ketoacidosis pattern identified.",
    status: "pending",
  },
];


function QueueSection() {
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [modalPatient, setModalPatient] = useState(null);

  const getActiveIdx = (pts, startIdx) => {
    let idx = startIdx;
    while (idx < pts.length && pts[idx].status !== "pending") idx++;
    return idx;
  };

  const markAttended = (id) => {
    const next = patients.map((p) => (p.id === id ? { ...p, status: "attended" } : p));
    setPatients(next);
    setCurrentIdx((i) => getActiveIdx(next, i + 1));
  };

  const skipPatient = (id) => {
    const next = patients.map((p) => (p.id === id ? { ...p, status: "skipped" } : p));
    setPatients(next);
    setCurrentIdx((i) => getActiveIdx(next, i + 1));
  };

  const activeIdx = getActiveIdx(patients, currentIdx);
  const activePatient = activeIdx < patients.length ? patients[activeIdx] : null;
  const pendingCount = patients.filter((p) => p.status === "pending").length;

  const badgeClass = (p, i) => {
    if (p.status === "attended") return "dsn-badge-success";
    if (p.status === "skipped") return "dsn-badge-warning";
    if (i === activeIdx) return "dsn-badge-danger";
    return "dsn-badge-muted";
  };
  const badgeText = (p, i) => {
    if (p.status === "attended") return "✓ Attended";
    if (p.status === "skipped") return "→ Skipped";
    if (i === activeIdx) return "● Now";
    return `#${i + 1} Waiting`;
  };

  return (
    <div className="dsn-queue-section">
      <div className="dsn-section-header">
        <div className="dsn-section-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
          </svg>
          Critical Patient Queue
        </div>
        <span className="dsn-queue-count">{pendingCount} remaining</span>
      </div>

      {/* Active card */}
      {activePatient ? (
        <div className="dsn-active-card" key={activePatient.id}>
          <div className="dsn-active-avatar" style={{ background: activePatient.color }}>
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
                {activePatient.age} y/o · {activePatient.gender}
              </span>
              <span className="dsn-active-appt">
                Appointment: {activePatient.apptTime}
              </span>
            </div>
            <div className="dsn-insight-box">
              <div className="dsn-insight-label">🤖 AI Insight</div>
              <div className="dsn-insight-text">{activePatient.aiInsight}</div>
            </div>
          </div>
          <div className="dsn-active-actions">
            <button className="dsn-btn-attended" onClick={() => markAttended(activePatient.id)}>
              <svg viewBox="0 0 24 24" fill="white" className="dsn-btn-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Mark Attended
            </button>
            <button className="dsn-btn-next" onClick={() => skipPatient(activePatient.id)}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="dsn-btn-icon">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
              </svg>
              Next Patient
            </button>
            <button className="dsn-btn-view" onClick={() => setModalPatient(activePatient)}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="dsn-btn-icon">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              View Details
            </button>
          </div>
        </div>
      ) : (
        <div className="dsn-done-card">
          <div className="dsn-done-emoji">🎉</div>
          <div className="dsn-done-title">All patients attended!</div>
          <div className="dsn-done-sub">Today's queue is complete. Great work, Dr. Layla.</div>
        </div>
      )}

      {/* Queue list */}
      <div className="dsn-queue-list">
        <div className="dsn-queue-list-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
          All Patients in Queue
        </div>
        {patients.map((p, i) => (
          <div
            key={p.id}
            className={`dsn-mini-card${p.status === "attended" ? " dsn-attended" : p.status === "skipped" ? " dsn-skipped" : ""}`}
          >
            <div className={`dsn-queue-num${i === activeIdx && p.status === "pending" ? " dsn-active-num" : ""}`}>{i + 1}</div>
            <div className="dsn-mini-avatar" style={{ background: p.color }}>{p.initials}</div>
            <div className="dsn-mini-info">
              <div className="dsn-mini-name">{p.name}</div>
              <div className="dsn-mini-sub">{p.age} y/o · {p.gender} · {p.apptTime}</div>
            </div>
            <span className={`dsn-mini-badge ${badgeClass(p, i)}`}>{badgeText(p, i)}</span>
            <button className="dsn-mini-view-btn" onClick={() => setModalPatient(p)}>View</button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalPatient && (
        <div
          id="dsn-modal-overlay"
          className="dsn-open"
          onClick={(e) => { if (e.target.id === "dsn-modal-overlay") setModalPatient(null); }}
        >
          <div id="dsn-modal-box">
            <div className="dsn-modal-header">
              <div className="dsn-modal-avatar" style={{ background: modalPatient.color }}>
                {modalPatient.initials}
              </div>
              <div>
                <div className="dsn-modal-title">{modalPatient.name}</div>
                <div className="dsn-modal-sub">{modalPatient.age} y/o · {modalPatient.gender} · Appointment: {modalPatient.apptTime}</div>
              </div>
            </div>
            <div className="dsn-modal-divider" />
            <div className="dsn-modal-chips">
              {[
                { label: "Age", val: modalPatient.age, className: "dsn-chip-default" },
                { label: "Gender", val: modalPatient.gender, className: "dsn-chip-default" },
                { label: "Appointment", val: modalPatient.apptTime, className: "dsn-chip-primary" },
                { label: "Status", val: modalPatient.status, className: "dsn-chip-status" },
              ].map((c) => (
                <div className={`dsn-modal-chip ${c.className}`} key={c.label}>
                  <div className="dsn-modal-chip-label">{c.label}</div>
                  <div className="dsn-modal-chip-val">{c.val}</div>
                </div>
              ))}
            </div>
            <div className="dsn-modal-notes">
              <strong>🤖 AI Insight:</strong><br />{modalPatient.aiInsight}
            </div>
            <div className="dsn-modal-btns">
              <button className="dsn-modal-cancel" onClick={() => setModalPatient(null)}>
                Close
              </button>
              <button className="dsn-modal-confirm" onClick={() => setModalPatient(null)}>
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

  return (
    <>
      <Sidebar activePage="dashboard" />

      <nav className={`top-navbar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="navbar-right">
          <div
            className="credits-badge"
            onClick={() => navigate("/subscription", { state: { tab: "billing" } })}
          >
            <span className="credits-icon">
              <svg viewBox="0 0 24 24">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </span>
            <span>Credits: {isCreditsLoading ? "..." : (credits?.toLocaleString() ?? "0")}</span>
          </div>

          <button className="icon-btn" onClick={() => openNotifications()}>
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          <div
            className="user-avatar-container"
            ref={avatarMenuRef}
          >
            <div
              className="user-avatar"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
            >
              LA
            </div>
            {isAvatarMenuOpen && (
              <div className="avatar-dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => { setIsAvatarMenuOpen(false); navigate("/settings"); }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg, #f3f4f6)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile Settings
                </div>
                <div
                  className="dropdown-item dropdown-item--danger"
                  onClick={() => { setIsAvatarMenuOpen(false); setIsLogoutModalOpen(true); }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--danger-bg-subtle, #fee2e2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      <LogoutConfirmation isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} />

      {/* ── MAIN CONTENT (scoped under #dsn-main) ── */}
      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div id="dsn-main">

          {/* ── TOP WHITE WRAPPER ── */}
          <div className="dsn-top-wrapper">
            <div className="dsn-greeting">
              <h1>Welcome, Dr. Layla</h1>
              <p>Here's a summary of today's key AI insights and patient status.</p>
            </div>

            {/* Stats grid */}
            <div className="dsn-stats-grid">
              {/* Card 1 */}
              <div className="dsn-stat-card">
                <div className="dsn-stat-label">
                  <svg viewBox="0 0 24 24" fill="#3B5BDB">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  <strong>Total Registered Patients</strong>
                </div>
                <div><span className="dsn-stat-value">248</span></div>
              </div>

              {/* Card 2 */}
              <div className="dsn-stat-card">
                <div className="dsn-stat-label">
                  <svg viewBox="0 0 24 24" fill="#3B5BDB">
                    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                  </svg>
                  <strong>Today's Appointments</strong>
                </div>
                <div><span className="dsn-stat-value">8</span></div>
              </div>

              {/* Card 3 */}
              <div className="dsn-stat-card">
                <div className="dsn-stat-label">
                  <svg viewBox="0 0 24 24" fill="#2F9E44">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                  </svg>
                  <strong>Reports Analyzed</strong>
                </div>
                <div><span className="dsn-stat-value">1,340</span></div>
              </div>

              {/* Card 4 — Monthly Growth */}
              <div className="dsn-stat-card dsn-stat-card--growth">
                <div className="dsn-stat-label dsn-stat-label--primary">
                  <svg viewBox="0 0 24 24" fill="var(--dsn-primary)">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                  </svg>
                  <strong>Monthly Patient Growth</strong>
                </div>
                <div className="dsn-growth-grid">
                  {[
                    { sub: "Last Mo.", val: "34", className: "" },
                    { sub: "This Mo.", val: "45", className: "dsn-growth-val--primary" },
                    { sub: "Diff.", val: "+11", className: "dsn-growth-val--success" },
                    { sub: "Growth", val: "↑32%", className: "dsn-growth-val--success" },
                  ].map((g) => (
                    <div className="dsn-growth-col" key={g.sub}>
                      <div className="dsn-growth-sub">{g.sub}</div>
                      <div className={`dsn-growth-val ${g.className}`}>{g.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dsn-ai-status">
              <div className="dsn-ai-dot" />
              AI system running v3.2 Neural Core — updated 2h ago
            </div>
          </div>

          {/* ── CHARTS ROW ── */}
          <div className="dsn-charts-row">

            {/* Donut — Patient Status */}
            <div className="dsn-chart-card">
              <div className="dsn-chart-title">Patient Status Distribution</div>
              <div className="dsn-donut-wrap">
                <svg width="140" height="140" viewBox="0 0 130 130" className="dsn-donut-svg">
                  <circle cx="65" cy="65" r="50" fill="none" stroke="#2F9E44" strokeWidth="22"
                    strokeDasharray="188.5 125.7" strokeDashoffset="0" transform="rotate(-90 65 65)"/>
                  <circle cx="65" cy="65" r="50" fill="none" stroke="#F03E3E" strokeWidth="22"
                    strokeDasharray="78.5 235.6" strokeDashoffset="-188.5" transform="rotate(-90 65 65)"/>
                  <circle cx="65" cy="65" r="50" fill="none" stroke="#F59F00" strokeWidth="22"
                    strokeDasharray="47.1 267" strokeDashoffset="-267" transform="rotate(-90 65 65)"/>
                  <circle cx="65" cy="65" r="39" fill="white"/>
                  <text x="65" y="61" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A1D2E" fontFamily="Plus Jakarta Sans">248</text>
                  <text x="65" y="76" textAnchor="middle" fontSize="10" fill="#8C91A7" fontFamily="Plus Jakarta Sans">patients</text>
                </svg>
                <div className="dsn-legend-list">
                  {[
                    { color: "#2F9E44", bg: "var(--dsn-success-light)", label: "Stable", pct: "60%", pctColor: "#2F9E44" },
                    { color: "#F03E3E", bg: "#FFF5F5", label: "Critical", pct: "25%", pctColor: "#F03E3E" },
                    { color: "#F59F00", bg: "#FFF8E1", label: "Under Review", pct: "15%", pctColor: "#F59F00" },
                  ].map((row) => (
                    <div key={row.label} className="dsn-legend-row" style={{ background: row.bg }}>
                      <div className="dsn-legend-dot" style={{ background: row.color }} />
                      <span className="dsn-legend-label">{row.label}</span>
                      <span className="dsn-legend-pct" style={{ color: row.pctColor }}>{row.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bar Chart — Top 5 Chronic Diseases */}
            <div className="dsn-chart-card">
              <div className="dsn-chart-title">Top 5 Chronic Diseases</div>
              <div className="dsn-chart-subtitle">
                Selected by doctor in medical forms
              </div>
              <div className="dsn-bar-chart-wrap">
                <div className="dsn-bar-columns">
                  {[
                    { val: 156, color: "linear-gradient(180deg,#4361EE,#748FFC)", h: 160 },
                    { val: 142, color: "linear-gradient(180deg,#06D6A0,#3DCFB4)", h: 146 },
                    { val: 98,  color: "linear-gradient(180deg,#FF8C42,#FFA96B)", h: 100 },
                    { val: 87,  color: "linear-gradient(180deg,#FF4D6D,#FF7A93)", h: 89 },
                    { val: 73,  color: "linear-gradient(180deg,#9B5DE5,#BB8AEE)", h: 75 },
                  ].map((b, i) => (
                    <div className="dsn-bar-col" key={i}>
                      <span className="dsn-bar-val">{b.val}</span>
                      <div className="dsn-bar-fill" style={{ background: b.color, height: b.h }} />
                    </div>
                  ))}
                </div>
                <div className="dsn-bar-labels">
                  {["Hyper-\ntension", "Diabetes", "Heart\nDisease", "Kidney\nDisease", "Liver\nDisease"].map((lbl) => (
                    <div key={lbl} className="dsn-bar-lbl" style={{ whiteSpace: "pre-line" }}>{lbl}</div>
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