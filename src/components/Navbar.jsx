import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  );
};

export default Navbar;