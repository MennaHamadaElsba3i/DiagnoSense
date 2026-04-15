import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";

const Navbar = ({
  isSidebarCollapsed,
  credits,
  isCreditsLoading,
  unreadCount,
  getDoctorInitials,
  openNotifications,
  setIsLogoutModalOpen,
}) => {
  const navigate = useNavigate();
  const avatarMenuRef = useRef(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setIsAvatarMenuOpen(false);
      }
    };

    if (isAvatarMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAvatarMenuOpen]);

  return (
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
              <div className="dropdown-item" onClick={() => { setIsAvatarMenuOpen(false); navigate("/settings"); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Profile Settings
              </div>

              {/* ── Theme toggle pill ── */}
              <div className="dropdown-theme-row">
                <button
                  id="theme-toggle-light"
                  className={`theme-toggle-btn${!isDark ? " theme-toggle-btn--active" : ""}`}
                  onClick={() => { if (isDark) toggleTheme(); }}
                  aria-label="Switch to light mode"
                  title="Light mode"
                >
                  {/* Sun icon */}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </button>
                <button
                  id="theme-toggle-dark"
                  className={`theme-toggle-btn${isDark ? " theme-toggle-btn--active" : ""}`}
                  onClick={() => { if (!isDark) toggleTheme(); }}
                  aria-label="Switch to dark mode"
                  title="Dark mode"
                >
                  {/* Moon icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </button>
              </div>

              <div className="dropdown-item dropdown-item--danger" onClick={() => { setIsAvatarMenuOpen(false); setIsLogoutModalOpen(true); }}>
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
  );
};

export default Navbar;