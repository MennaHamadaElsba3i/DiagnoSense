import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutAPI } from "./mockAPI";
import { deleteCookie } from "./cookieUtils";
import ConfirmModal from "./ConfirmModal";

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const LogoutConfirmation = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setError("");

    const result = await logoutAPI();

    if (result.success) {
      deleteCookie("user_token");
      deleteCookie("user");
      deleteCookie("isAuthenticated");

      // ── Clear the entire page cache so the next user never sees this doctor's data ──
      window.dispatchEvent(new CustomEvent("authChanged"));

      onClose();

      navigate("/login");
    } else {
      setError(result.message);
    }

    setIsLoggingOut(false);
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirmLogout}
      title="Logout"
      description={
        <>
          {error && <span style={{ color: "#ff4444", display: "block", marginBottom: "8px" }}>{error}</span>}
          Are you sure you want to logout?
        </>
      }
      confirmText={isLoggingOut ? "Logging out..." : "Logout"}
      cancelText="Cancel"
      variant="danger"
      icon={<LogoutIcon />}
    />
  );
};

export default LogoutConfirmation;
