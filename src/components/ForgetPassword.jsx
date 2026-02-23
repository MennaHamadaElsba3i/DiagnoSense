import React, { useState } from "react";
import { forgetPasswordAPI } from "./mockAPI";

const ForgetPassword = ({ onOTPSent, onBackToLogin }) => {
  const [identity, setIdentity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const result = await forgetPasswordAPI(identity);

    if (result.success) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        onOTPSent(identity);
      }, 2000);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Forgot Password?</h2>
        <p>Enter your email or phone number to reset your password</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Email or Phone number"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            required
            className={error ? "error" : ""}
            disabled={isLoading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && (
          <div
            className="success-message"
            style={{
              color: "#10b981",
              marginBottom: "15px",
              padding: "10px",
              background: "#d1fae5",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            {successMessage}
          </div>
        )}
        <button
          type="submit"
          className={`btn-primary ${isLoading ? "loading" : ""}`}
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send Verification Code"}
        </button>
      </form>

      <div className="back-to-login">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!isLoading) {
              onBackToLogin();
            }
          }}
          style={{
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Login
        </a>
      </div>
    </div>
  );
};

export default ForgetPassword;
