import React, { useState } from "react";
import { resetPasswordAPI } from "./mockAPI";

const ResetPassword = ({ email, resetToken, onResetSuccess, }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const savedEmail = localStorage.getItem("resetEmail");

    const otp = e.target.otp;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirm_password.value;

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    // const result = await resetPasswordAPI(email, password);
    const result = await resetPasswordAPI(
      otp,
      savedEmail,
      password,
      confirmPassword
    );

    if (result.success) {
      setSuccessMessage(result.message || "Password reset successful!");

      // ✅ الرجوع للوجين بعد ثانيتين
      setTimeout(() => {
        onResetSuccess();
      }, 2000);
    } else {
      setError(result.message || "Failed to reset password. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Reset Password</h2>
        <p>Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="password-input-wrapper">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="New Password"
              name="password"
              required
              minLength="8"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setPasswordVisible(!passwordVisible)}
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
              required
              minLength="8"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
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
            ✓ {successMessage}
          </div>
        )}
        <button
          type="submit"
          className={`btn-primary ${isLoading ? "loading" : ""}`}
        >
          {!isLoading && "Reset Password"}
        </button>
      </form>

      <div className="password-requirements">
        <p className="requirements-title">Password must contain:</p>
        <ul>
          <li>At least 8 characters</li>
          <li>One uppercase letter</li>
          <li>One lowercase letter</li>
          <li>One number</li>
        </ul>
      </div>
    </div>
  );
};

export default ResetPassword;
