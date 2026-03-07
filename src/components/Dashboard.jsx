import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal.jsx";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import logo from "../assets/Logo_Diagnoo.png";
import stethoscope from "../assets/Stethoscope.png";
import closeIcon from "../assets/close.png";
import openIcon from "../assets/open.png";
import { useSidebar } from "../components/SidebarContext";
import Sidebar from "./Sidebar";
import "../css/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
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

  const openDecisionSupport = () => {
    setIsModalOpen(true);
  };

  const closeDecisionSupport = () => {
    setIsModalOpen(false);
  };

  const upgradeToProPlan = () => {
    navigate("/subscription", { state: { tab: "plans" } });
    closeDecisionSupport();
  };

  const openLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false);
  };

  return (
    <>
      <Sidebar activePage="dashboard" openDecisionSupport={openDecisionSupport} />

      <nav className={`top-navbar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="navbar-right">
          <div
            className="credits-badge"
            onClick={() => navigate('/subscription', { state: { tab: 'billing' } })}
            style={{ cursor: "pointer" }}
          >
            <span className="credits-icon">
              <svg viewBox="0 0 24 24">
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

          <div
            className="user-avatar-container"
            style={{ position: "relative" }}
            ref={avatarMenuRef}
          >
            <div
              className="user-avatar"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              LA
            </div>
            {isAvatarMenuOpen && (
              <div
                className="avatar-dropdown-menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  backgroundColor: "var(--surface-color, #ffffff)",
                  border: "1px solid var(--border-color, #e5e7eb)",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  padding: "8px",
                  minWidth: "180px",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <div
                  className="dropdown-item"
                  onClick={() => { setIsAvatarMenuOpen(false); navigate("/settings"); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--text-primary, #111827)",
                    fontSize: "14px",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--hover-bg, #f3f4f6)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile Settings
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => { setIsAvatarMenuOpen(false); openLogoutModal(); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--danger-color, #ef4444)",
                    fontSize: "14px",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--danger-bg-subtle, #fee2e2)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
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

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={closeDecisionSupport}
        onConfirm={upgradeToProPlan}
        title="Decision Support"
        description={
          <>
            <p style={{ margin: "0 0 16px 0" }}>
              Enhance your diagnostic accuracy with our advanced AI-powered
              Decision Support system. Get intelligent recommendations based on
              patient data, symptoms, and medical history.
            </p>
            <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginTop: "3px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Real-time diagnostic suggestions based on latest medical research</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginTop: "3px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Comprehensive differential diagnosis lists with confidence scores</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginTop: "3px", flexShrink: 0, fill: "none", stroke: "currentColor", strokeWidth: 2 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Treatment recommendations and drug interaction warnings</span>
              </li>
            </ul>
          </>
        }
        confirmText="Upgrade to Pro"
        cancelText="Maybe Later"
        variant="primary"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
        }
      />

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
      />

      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="dashboard-grid">
          <div className="card welcome-panel">
            <div>
              <h1 className="welcome-title">Good Morning, Dr. Layla</h1>
              <p className="welcome-subtitle">
                Here's a summary of today's key AI insights and patient status.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-left">
                  <div className="stat-header">
                    <span className="stat-icon">🩺</span>
                    <span className="stat-label">Active Patients</span>
                  </div>
                  <div className="stat-value">24</div>
                </div>
                <div className="stat-right">
                  <div className="stat-trend up">
                    <span>↑</span>
                    <span>12%</span>
                  </div>
                  <div className="progress-ring">
                    <svg className="progress-ring-circle" viewBox="0 0 36 36">
                      <circle
                        className="progress-ring-bg"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                      <circle
                        className="progress-ring-fill"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-left">
                  <div className="stat-header">
                    <span className="stat-icon">⚠️</span>
                    <span className="stat-label">Critical Cases</span>
                  </div>
                  <div className="stat-value">2</div>
                </div>
                <div className="stat-right">
                  <div className="stat-trend down">
                    <span>↓</span>
                    <span>25%</span>
                  </div>
                  <div className="progress-ring">
                    <svg className="progress-ring-circle" viewBox="0 0 36 36">
                      <circle
                        className="progress-ring-bg"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                      <circle
                        className="progress-ring-fill"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-left">
                  <div className="stat-header">
                    <span className="stat-icon">🧠</span>
                    <span className="stat-label">Reports Analyzed</span>
                  </div>
                  <div className="stat-value">46</div>
                </div>
                <div className="stat-right">
                  <div className="stat-trend up">
                    <span>↑</span>
                    <span>18%</span>
                  </div>
                  <div className="progress-ring">
                    <svg className="progress-ring-circle" viewBox="0 0 36 36">
                      <circle
                        className="progress-ring-bg"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                      <circle
                        className="progress-ring-fill"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-left">
                  <div className="stat-header">
                    <span className="stat-icon">⏱</span>
                    <span className="stat-label">Avg. Time Saved</span>
                  </div>
                  <div className="stat-value">37%</div>
                </div>
                <div className="stat-right">
                  <div className="stat-trend up">
                    <span>↑</span>
                    <span>5%</span>
                  </div>
                  <div className="progress-ring">
                    <svg className="progress-ring-circle" viewBox="0 0 36 36">
                      <circle
                        className="progress-ring-bg"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                      <circle
                        className="progress-ring-fill"
                        cx="18"
                        cy="18"
                        r="16"
                      ></circle>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="system-status">
              AI system running v3.2 Neural Core — updated 2h ago
            </div>
          </div>

          <div className="card critical-distribution">
            <h2 className="card-title">Critical Case Distribution</h2>

            <div className="pie-chart-container">
              <div className="pie-chart"></div>
              <div className="pie-legend">
                <div className="legend-item">
                  <span className="legend-color heart"></span>
                  <span className="legend-text">Heart</span>
                  <span className="legend-value">40%</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color kidney"></span>
                  <span className="legend-text">Kidney</span>
                  <span className="legend-value">25%</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color liver"></span>
                  <span className="legend-text">Liver</span>
                  <span className="legend-value">20%</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color lung"></span>
                  <span className="legend-text">Lung</span>
                  <span className="legend-value">15%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card test-utilization">
            <h2 className="card-title">Top 5 Test Utilization</h2>

            <div className="bar-chart-container">
              <div className="bar-item">
                <div className="bar-column">
                  <div className="bar-fill color-1" style={{ height: "180px" }}>
                    <span className="bar-value">156</span>
                  </div>
                </div>
                <div className="bar-label">CBC</div>
              </div>
              <div className="bar-item">
                <div className="bar-column">
                  <div className="bar-fill color-2" style={{ height: "165px" }}>
                    <span className="bar-value">142</span>
                  </div>
                </div>
                <div className="bar-label">Glucose</div>
              </div>
              <div className="bar-item">
                <div className="bar-column">
                  <div className="bar-fill color-3" style={{ height: "125px" }}>
                    <span className="bar-value">98</span>
                  </div>
                </div>
                <div className="bar-label">Lipid Panel</div>
              </div>
              <div className="bar-item">
                <div className="bar-column">
                  <div className="bar-fill color-4" style={{ height: "110px" }}>
                    <span className="bar-value">87</span>
                  </div>
                </div>
                <div className="bar-label">Kidney Func.</div>
              </div>
              <div className="bar-item">
                <div className="bar-column">
                  <div className="bar-fill color-5" style={{ height: "95px" }}>
                    <span className="bar-value">73</span>
                  </div>
                </div>
                <div className="bar-label">Liver Func.</div>
              </div>
            </div>
          </div>

          <div className="card critical-alert">
            <div className="alert-header">
              <div className="alert-icon">AM</div>
              <div className="alert-patient-name">Ahmed Mohamed</div>
            </div>
            <h3 className="alert-title">⚠️ Critical Alert</h3>
            <div className="alert-detail">
              AI detected potential cardiac anomaly requiring immediate
              attention. Elevated troponin levels detected.
            </div>
            <div className="alert-metrics">
              <div className="alert-metric">
                <div className="alert-metric-label">Risk Level</div>
                <div className="alert-metric-value">High</div>
              </div>
              <div className="alert-metric">
                <div className="alert-metric-label">Priority</div>
                <div className="alert-metric-value">P1</div>
              </div>
            </div>
            <button className="alert-btn">View Full Report</button>
          </div>

          <div className="card critical-alert">
            <div className="alert-header">
              <div className="alert-icon">SH</div>
              <div className="alert-patient-name">Sarah Hany</div>
            </div>
            <h3 className="alert-title">⚠️ Critical Alert</h3>
            <div className="alert-detail">
              Abnormal ECG patterns detected with irregular heart rhythm.
              Immediate consultation recommended.
            </div>
            <div className="alert-metrics">
              <div className="alert-metric">
                <div className="alert-metric-label">Risk Level</div>
                <div className="alert-metric-value">High</div>
              </div>
              <div className="alert-metric">
                <div className="alert-metric-label">Priority</div>
                <div className="alert-metric-value">P1</div>
              </div>
            </div>
            <button className="alert-btn">View Full Report</button>
          </div>

          <div className="card critical-alert">
            <div className="alert-header">
              <div className="alert-icon">OH</div>
              <div className="alert-patient-name">Omar Hamed</div>
            </div>
            <h3 className="alert-title">⚠️ Critical Alert</h3>
            <div className="alert-detail">
              Blood pressure readings significantly elevated. Hypertensive
              crisis suspected. Urgent evaluation needed.
            </div>
            <div className="alert-metrics">
              <div className="alert-metric">
                <div className="alert-metric-label">Risk Level</div>
                <div className="alert-metric-value">High</div>
              </div>
              <div className="alert-metric">
                <div className="alert-metric-label">Priority</div>
                <div className="alert-metric-value">P2</div>
              </div>
            </div>
            <button className="alert-btn">View Full Report</button>
          </div>

          <div className="card ai-insights-summary">
            <div className="insights-summary-content">
              <span className="insights-icon">🤖</span>
              <span className="insights-text">
                System detected 3 new anomaly patterns today.
              </span>
            </div>
            <button className="review-btn">
              Review Insights
              <span>→</span>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
