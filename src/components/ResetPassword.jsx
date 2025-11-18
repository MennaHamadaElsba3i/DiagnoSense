import React, { useState } from "react";
import { resetPasswordAPI, forgetPasswordAPI } from "./mockAPI";

const ResetPassword = ({ email, onResetSuccess, onBackToForget }) => {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const savedEmail = localStorage.getItem("resetEmail");

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const result = await resetPasswordAPI(
      otp,
      savedEmail,
      password,
      confirmPassword
    );

    if (result.success) {
      setSuccessMessage(result.message);

      setTimeout(() => {
        onResetSuccess();
      }, 2000);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  const handleResendOTP = async () => {
    const savedEmail = localStorage.getItem("resetEmail");

    if (!savedEmail) {
      setError("Email not found. Please go back and enter your email again.");
      return;
    }

    setIsResending(true);
    setError("");
    setSuccessMessage("");

    const result = await forgetPasswordAPI(savedEmail);

    if (result.success) {
      setSuccessMessage("A new OTP has been sent to your email.");
      setOtp("");
    } else {
      setError(result.message);
    }

    setIsResending(false);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Reset Password</h2>
        <p>Enter the 6-digit OTP sent to {email}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Enter 6 digit OTP"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value.length <= 6) {
                setOtp(value);
                setError("");
              }
            }}
            required
            
            className={error ? "error" : ""}
            style={{
              textAlign: "center",
              fontSize: "20px",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
            autoFocus
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <div className="password-input-wrapper">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="New Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setPasswordVisible(!passwordVisible)}
              disabled={isLoading}
            >
              {passwordVisible ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="1"
                    y1="1"
                    x2="23"
                    y2="23"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <small className="password-hint">Must be at least 8 characters</small>
        </div>

        <div className="form-group">
          <div className="password-input-wrapper">
            <input
              type={confirmPasswordVisible ? "text" : "password"}
              placeholder="Confirm New Password"
              name="confirm_password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="8"
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              disabled={isLoading}
            >
              {confirmPasswordVisible ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="1"
                    y1="1"
                    x2="23"
                    y2="23"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
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
          disabled={isLoading || otp.length !== 6}
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={isResending || isLoading}
            style={{
              background: "none",
              border: "none",
              color: "#667eea",
              cursor: isResending || isLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              textDecoration: "underline",
            }}
          >
            {isResending ? "Sending..." : "Didn't receive code? Resend"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!isLoading) {
                onBackToForget();
              }
            }}
            style={{
              color: "#667eea",
              textDecoration: "none",
              fontSize: "14px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            ← Change Email
          </a>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;
