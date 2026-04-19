import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import ConfirmModal from "./ConfirmModal";
import logo from "../assets/Logo_Diagnoo.png";
import stethoscope from "../assets/Stethoscope.png";
import openIcon from "../assets/OpenEdited.png";
import closeIcon from "../assets/CloseEdited.png";
import "../css/Sidebar.css";

export default function Sidebar({ activePage }) {
  const navigate = useNavigate();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);

  const openDecisionSupport = () => setIsDecisionModalOpen(true);
  const closeDecisionSupport = () => setIsDecisionModalOpen(false);

  const upgradeToProPlan = () => {
    navigate("/subscription", { state: { tab: "plans" } });
    closeDecisionSupport();
  };

  return (
    <>
      <aside className={`sidebar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {/* Expanded State: Full Logo */}
            <div className="logo-expanded-container">
              <img className="logo-expanded" src={logo} alt="DiagnoSense" />
            </div>

            {/* Collapsed State: Stethoscope Icon + Hover Expand Button */}
            <div className="sidebar-logo-slot">
              <img className="logo-collapsed" src={stethoscope} alt="DiagnoSense" />
              <button
                className="logo-expand-btn"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <img src={openIcon} alt="Expand sidebar" />
              </button>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <img
              src={isSidebarCollapsed ? openIcon : closeIcon}
              alt={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="sidebar-toggle-icon"
            />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-main">
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              <a
                href="#"
                className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/dashboard");
                }}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </span>
                <span>Dashboard</span>
              </a>
              <a
                href="#"
                className={`nav-item ${activePage === "patients" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/patients");
                }}
              >
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
              <a
                href="#"
                className={`nav-item ${activePage === "subscription" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/subscription");
                }}
              >
                <span className="nav-icon">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <style>{`
                      .banknote-element { stroke: #4A6785; fill: none; }
                      .banknote-fill { fill: #A3BDCC; stroke: #4A6785; }
                      .banknote-text { fill: #4A6785; font-family: Arial, sans-serif; font-weight: bold; }
                    `}</style>

                    <g opacity="0.8">
                      <rect x="18" y="10" width="42" height="24" rx="2" class="banknote-fill" stroke-width="1.5" />
                      <rect x="21" y="13" width="36" height="18" rx="1" class="banknote-element" stroke-width="1" />
                      <circle cx="39" cy="22" r="4" class="banknote-element" stroke-width="1" />
                      <text x="23" y="20" class="banknote-text" font-size="6">$</text>
                      <text x="53" y="30" class="banknote-text" font-size="6">$</text>
                    </g>

                    <g>
                      <rect x="4" y="22" width="46" height="28" rx="3" class="banknote-fill" stroke-width="2" />

                      <rect x="8" y="26" width="38" height="20" rx="2" class="banknote-element" stroke-width="1" stroke-dasharray="2 1" />

                      <circle cx="27" cy="36" r="6" class="banknote-fill" stroke-width="1.5" />
                      <path d="M25 34C25 33 26 32 27 32C28 32 29 33 29 34V38C29 39 28 40 27 40C26 40 25 39 25 38V34Z" fill="#4A6785" />

                      <text x="10" y="33" class="banknote-text" font-size="7">$</text>
                      <text x="40" y="47" class="banknote-text" font-size="7">$</text>

                      <rect x="10" y="43" width="8" height="2" fill="#4A6785" opacity="0.7" />
                      <rect x="34" y="29" width="8" height="2" fill="#4A6785" opacity="0.7" />
                    </g>
                  </svg>



                </span>
                <span>Subscription</span>
              </a>
              <a
                href="#"
                className={`nav-item ${activePage === "settings" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/settings");
                }}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </span>
                <span>Settings</span>
              </a>
              <a
                href="#"
                className={`nav-item ${activePage === "support" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/support");
                }}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </span>
                <span>Support</span>
              </a>
            </div>
          </div>

          <div className="nav-bottom">
            <div
              className="decision-support-card"
              onClick={openDecisionSupport}
            >
              <div
                className="card-header"
                style={{
                  marginBottom: "0px",
                  gap: "10px",
                  paddingBottom: "8px",
                }}
              >
                <div className="card-icon">
                  <svg viewBox="0 0 24 24">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                </div>
                <span className="decision-card-title">Decision Support</span>
                <span className="card-pro-badge">PRO</span>
              </div>
              <div className="card-subtitle">Make accurate decisions</div>
              <button className="card-cta-btn">Try Now</button>
            </div>
          </div>
        </nav>
      </aside >
      <ConfirmModal
        isOpen={isDecisionModalOpen}
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
    </>
  );
}
