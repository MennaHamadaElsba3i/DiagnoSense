import React, { useState } from "react";
import { forgetPasswordAPI } from "./mockAPI";

const ForgetPassword = ({ onOTPSent, onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const result = await forgetPasswordAPI(email);

    if (result.success) {
      setSuccessMessage(result.message);

      localStorage.setItem("resetEmail", email);

      setTimeout(() => {
        onOTPSent(email);
      }, 2000);
    } else {
      setError(result.errors.email);
    }

    setIsLoading(false);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Forgot Password?</h2>
        <p>Enter your email address and we'll send you a verification code</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
