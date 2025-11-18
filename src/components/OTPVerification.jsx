import React, { useState } from "react";
import { verifyOTPAPI, resendOTPAPI } from "./mockAPI";

const OTPVerification = ({ email, onVerifySuccess, onBackToForget }) => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const result = await verifyOTPAPI(email, otp);

    if (result.success) {
      setSuccessMessage("OTP verified successfully!");
      setTimeout(() => {
        onVerifySuccess(result.data.token || otp); // نمرر الـ token للـ reset password
      }, 2000);
    } else {
      setError(result.message || "Invalid OTP. Please try again.");
      setOtp("");
    }
    
    setIsLoading(false);
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setError("");
    setSuccessMessage("");

    const result = await resendOTPAPI(email);

    if (result.success) {
      setSuccessMessage("New code sent successfully!");
      setOtp("");
    } else {
      setError(result.message || "Failed to resend code. Please try again.");
    }

    setIsResending(false);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Verify Your Email</h2>
        <p>Enter the 6-digit code sent to {email}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value.length <= 6) {
                // setOtp(value);
                setOtp(value);
                setError(""); // مسح الـ
              }
            }}
            required
            maxLength="6"
            className={error ? "error" : ""}
            style={{
              textAlign: "center",
              fontSize: "24px",
              letterSpacing: "10px",
              fontWeight: "bold",
            }}
            autoFocus
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
            ✓ {successMessage}
          </div>
        )}

        <button
          type="submit"
          className={`btn-primary ${isLoading ? "loading" : ""}`}
          disabled={isLoading || otp.length !== 6}
        >
          {isLoading ? "Verifying..." : "Verify Code"}
        </button>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={isResending}
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

export default OTPVerification;
