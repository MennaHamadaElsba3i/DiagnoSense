import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutAPI } from "./mockAPI";
import { deleteCookie } from "./cookieUtils";

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

      onClose();

      navigate("/login");
    } else {
      setError(result.message);
    }

    setIsLoggingOut(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="modal-header">
          <div
            className="modal-icon"
            style={{
              background: "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)",
            }}
          >
            <svg viewBox="0 0 24 24" stroke="white" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M10 16l4-4-4-4"></path>
              <path d="M14 12H8"></path>
            </svg>
          </div>
          <h2 className="modal-title">Confirm Logout</h2>
          <p className="modal-subtitle">
            Are you sure you want to log out of your account?
          </p>
        </div>

        <div className="modal-body">
          {error && (
            <div
              className="error-message"
              style={{
                marginBottom: "20px",
                textAlign: "center",
                color: "#ff4444",
              }}
            >
                {error}
            </div>
          )}

          <p
            className="modal-text"
            style={{ textAlign: "center", marginBottom: "20px" }}
          >
            You will be redirected to the login page after logging out.
          </p>
        </div>

        <div className="modal-footer">
          <button
            className="modal-button modal-button-secondary"
            onClick={onClose}
            disabled={isLoggingOut}
          >
            Cancel
          </button>
          <button
            className="modal-button modal-button-primary"
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            style={{
              background: isLoggingOut
                ? "#ccc"
                : "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)",
              cursor: isLoggingOut ? "not-allowed" : "pointer",
            }}
          >
            {isLoggingOut ? "Logging out..." : "Yes, Logout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmation;
