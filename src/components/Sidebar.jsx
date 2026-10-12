import React, { useState, useRef } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import { useTheme } from "./ThemeContext";
import ConfirmModal from "./ConfirmModal";
import {
  diagnoSenseLightLogo,
  diagnoSenseDarkLogo,
  stethoscopeLogo,
  openSidebarIcon,
  closeSidebarIcon
} from "../assets";
import "../css/Sidebar.css";
import { useSubscription } from "./SubscriptionContext";
import {
  cancelSubscriptionAPI,
  getSubscriptionPlansAPI,
  subscribeToPlanAPI,
} from "./mockAPI";

export default function Sidebar({ activePage }) {
  const navigate = useNavigate();
  const { isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen } = useSidebar();
  const { isDark } = useTheme();
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const { refreshSubscription, refreshCredits, subscriptionData } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    isSuccess: false,
  });
  const toastTimerRef = useRef(null);

  const [readMoreModal, setReadMoreModal] = useState({
    isOpen: false,
    message: "",
  });

  const showToast = (message, isSuccess) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ isOpen: true, message, isSuccess });
    toastTimerRef.current = setTimeout(() => {
      setToast({ isOpen: false, message: "", isSuccess: false });
    }, 10000);
  };

  const closeToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ isOpen: false, message: "", isSuccess: false });
  };
  const TOAST_TRUNCATE_LENGTH = 100;

  const openDecisionSupport = () => setIsDecisionModalOpen(true);
  const closeDecisionSupport = () => setIsDecisionModalOpen(false);

  const upgradeToProPlan = async () => {
    setIsUpgrading(true);
    try {
      const hasActivePlan =
        (subscriptionData?.billing_mode === "subscription" ||
          subscriptionData?.billing_mode === "pay-per-use") &&
        subscriptionData?.status &&
        subscriptionData.status.toLowerCase() === "active";

      if (hasActivePlan) {
        await cancelSubscriptionAPI();
      }

      const plansResult = await getSubscriptionPlansAPI();
      let proPlanId = "pro";
      if (plansResult.success && plansResult.data) {
        const proPlan = plansResult.data.find(
          (p) => p.name && p.name.toLowerCase().includes("pro")
        );
        if (proPlan) {
          proPlanId = proPlan.id;
        }
      }

      const result = await subscribeToPlanAPI(proPlanId);

      if (!result.success) {
        throw new Error(result.message || "Failed to subscribe to Pro plan.");
      }

      await refreshCredits();
      await refreshSubscription();

      closeDecisionSupport();

    } catch (error) {
      console.error("[UpgradeToPro] error:", error);
      const backendMessage = error.response?.data?.message || error.message || "An error occurred during upgrade.";

      closeDecisionSupport();
      showToast(backendMessage, false);
    } finally {
      setIsUpgrading(false);
    }
  };

  const planName = subscriptionData?.plan_name || subscriptionData?.planName || "";
  const billingMode = subscriptionData?.billing_mode || subscriptionData?.billingMode || "";
  const isActive = subscriptionData?.status?.toLowerCase() === "active";

  const hasProAccess =
    billingMode === "pay-per-use" ||
    (isActive && billingMode === "subscription" && (planName.toLowerCase().includes("pro") || planName.toLowerCase().includes("premium")));

  const logo = isDark ? diagnoSenseDarkLogo : diagnoSenseLightLogo;

  return (
    <>
      {/* ── Toast Notification ── */}
      {toast.isOpen && (
        <div
          onClick={() =>
            setReadMoreModal({ isOpen: true, message: toast.message })
          }
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
            gap: "8px",
            animation:
              "0.3s ease-out 0s 1 normal forwards running slideInRight",
            boxShadow:
              "rgba(0, 0, 0, 0.1) 0px 10px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px",
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
            }}
          >
            {toast.isSuccess ? "✓" : "✕"}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text-primary, #111)",
                marginBottom: "3px",
                letterSpacing: "0.01em",
              }}
            >
              {toast.isSuccess ? "Success" : "Failed"}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary, #6b7280)",
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}
            >
              {toast.message.length > TOAST_TRUNCATE_LENGTH
                ? toast.message.slice(0, TOAST_TRUNCATE_LENGTH).trimEnd() + "…"
                : toast.message}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeToast();
            }}
            style={{
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary, #9ca3af)",
              fontSize: "16px",
              lineHeight: 1,
              padding: "2px 4px",
              borderRadius: "4px",
              marginTop: "-1px",
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Read More Modal ── */}
      <ConfirmModal
        isOpen={readMoreModal.isOpen}
        onClose={() => setReadMoreModal({ isOpen: false, message: "" })}
        onConfirm={() => setReadMoreModal({ isOpen: false, message: "" })}
        title="Message Details"
        description={readMoreModal.message}
        confirmText="Ok, got it"
        variant="primary"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        }
      />

      {/* ── Mobile Overlay Menu ── */}
      <div className={`dm-mobile-drawer-menu ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="dm-mobile-header">
          <img className="dm-mobile-logo" src={logo} alt="DiagnoSense" onClick={() => navigate("/")} style={{ cursor: 'pointer' }} />
          <button className="dm-mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="dm-mobile-nav-list">
          <NavLink to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `dm-mobile-nav-item ${activePage === "dashboard" || isActive ? "active" : ""}`}>
            <span className="dm-mobile-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </span>
            <span className="dm-mobile-link-text">Dashboard</span>
          </NavLink>
          <NavLink to="/patients" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `dm-mobile-nav-item ${activePage === "patients" || isActive ? "active" : ""}`}>
            <span className="dm-mobile-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </span>
            <span className="dm-mobile-link-text">Patients</span>
          </NavLink>
          <NavLink to="/subscription" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `dm-mobile-nav-item ${activePage === "subscription" || isActive ? "active" : ""}`}>
            <span className="dm-mobile-nav-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><style>{`.banknote-element { stroke: #4A6785; fill: none; }.banknote-fill { fill: #A3BDCC; stroke: #4A6785; }.banknote-text { fill: #4A6785; font-family: Arial, sans-serif; font-weight: bold; }`}</style><g opacity="0.8"><rect x="18" y="10" width="42" height="24" rx="2" className="banknote-fill" strokeWidth="1.5" /><rect x="21" y="13" width="36" height="18" rx="1" className="banknote-element" strokeWidth="1" /><circle cx="39" cy="22" r="4" className="banknote-element" strokeWidth="1" /><text x="23" y="20" className="banknote-text" fontSize="6">$</text><text x="53" y="30" className="banknote-text" fontSize="6">$</text></g><g><rect x="4" y="22" width="46" height="28" rx="3" className="banknote-fill" strokeWidth="2" /><rect x="8" y="26" width="38" height="20" rx="2" className="banknote-element" strokeWidth="1" strokeDasharray="2 1" /><circle cx="27" cy="36" r="6" className="banknote-fill" strokeWidth="1.5" /><path d="M25 34C25 33 26 32 27 32C28 32 29 33 29 34V38C29 39 28 40 27 40C26 40 25 39 25 38V34Z" fill="#4A6785" /><text x="10" y="33" className="banknote-text" fontSize="7">$</text><text x="40" y="47" className="banknote-text" fontSize="7">$</text><rect x="10" y="43" width="8" height="2" fill="#4A6785" opacity="0.7" /><rect x="34" y="29" width="8" height="2" fill="#4A6785" opacity="0.7" /></g></svg>
            </span>
            <span className="dm-mobile-link-text">Subscription</span>
          </NavLink>
          <NavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `dm-mobile-nav-item ${activePage === "settings" || isActive ? "active" : ""}`}>
            <span className="dm-mobile-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </span>
            <span className="dm-mobile-link-text">Settings</span>
          </NavLink>
          <NavLink to="/support" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `dm-mobile-nav-item ${activePage === "support" || isActive ? "active" : ""}`}>
            <span className="dm-mobile-nav-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </span>
            <span className="dm-mobile-link-text">Support</span>
          </NavLink>

        </div>
      </div>

      <aside className={`sidebar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="sidebar-header" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px' }}>
          <div className="sidebar-logo" style={{ width: '100%', height: '42px', margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 auto' }}>
            {/* Expanded State: Full Logo */}
            <div className="logo-expanded-container" style={{ position: 'static', left: 'auto', transform: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img className="logo-expanded" src={logo} alt="DiagnoSense" onClick={() => navigate("/")} style={{ display: 'block', width: '120px', height: '42px', objectFit: 'contain', margin: '0 auto 0 calc(50% - 70px)', flexShrink: 0, cursor: 'pointer' }} />
            </div>

            {/* Collapsed State: Stethoscope Icon + Hover Expand Button */}
            <div className="sidebar-logo-slot">
              <img className="logo-collapsed" src={stethoscopeLogo} alt="DiagnoSense" onClick={() => navigate("/")} style={{ cursor: 'pointer' }} />
              <button
                className="logo-expand-btn"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <img src={openSidebarIcon} alt="Expand sidebar" />
              </button>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <img
              src={isSidebarCollapsed ? openSidebarIcon : closeSidebarIcon}
              alt={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="sidebar-toggle-icon"
            />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-main">
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-item ${activePage === "dashboard" || isActive ? "active" : ""}`}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </span>
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/patients"
                className={({ isActive }) => `nav-item ${activePage === "patients" || isActive ? "active" : ""}`}
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
              </NavLink>
              <NavLink
                to="/subscription"
                className={({ isActive }) => `nav-item ${activePage === "subscription" || isActive ? "active" : ""}`}
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
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) => `nav-item ${activePage === "settings" || isActive ? "active" : ""}`}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </span>
                <span>Settings</span>
              </NavLink>
              <NavLink
                to="/support"
                className={({ isActive }) => `nav-item ${activePage === "support" || isActive ? "active" : ""}`}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </span>
                <span>Support</span>
              </NavLink>
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
        onConfirm={hasProAccess ? closeDecisionSupport : upgradeToProPlan}
        isLoading={isUpgrading}
        title="Decision Support"
        description={
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ margin: 0 }}>
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
            {hasProAccess && (
              <p style={{ margin: "8px 0 0 0", textAlign: "center", color: isDark ? "#4ade80" : "#15803d", fontSize: "0.95em", fontWeight: 500 }}>
                You already have full access to our advanced AI-powered decision support system.
              </p>
            )}
          </div>
        }
        confirmText={hasProAccess ? "Got it" : "Upgrade to Pro"}
        cancelText={hasProAccess ? null : "Maybe Later"}
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
