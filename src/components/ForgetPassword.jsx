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
      // الانتقال لصفحة إدخال الـ reset token أو OTP
      setTimeout(() => {
        onOTPSent(email);
      }, 3000);
    } else {
      setError(
        result.message || "Failed to send reset link. Please try again."
      );
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
            ✓ {successMessage}
          </div>
        )}
        <button
          type="submit"
          className={`btn-primary ${isLoading ? "loading" : ""}`}
        >
          {!isLoading && "Send Verification Code"}
        </button>
      </form>

      <div className="back-to-login">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onBackToLogin();
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
