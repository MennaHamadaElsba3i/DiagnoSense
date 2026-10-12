import React, { useState, useEffect, useRef } from "react";
import {
  verifyOTPAPI,
  verifyOTPForResetAPI,
  resendOTPAPI,
  forgetPasswordAPI,
} from "./mockAPI";
import { getCookie } from "./cookieUtils.js";

const COUNTDOWN_SECONDS = 10 * 60;

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const OTPVerification = ({
  contact,
  onVerifySuccess,
  onSessionExpired,
  mode = "email_verification",
}) => {
  const [otpValues, setOtpValues] = useState(Array(6).fill(""));
  const otp = otpValues.join("");
  const inputRefs = useRef([]);
  //   const [userIdentity, setUserIdentity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTimeLeft(COUNTDOWN_SECONDS);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [mode]);
  useEffect(() => {
    if (mode === "email_verification") {
      const token = getCookie("user_token");
      if (!token) {
        console.error("[OTPVerification] No token on mount — redirecting");
        if (onSessionExpired) {
          onSessionExpired();
        } else {
          setError("Session expired. Please register again.");
        }
      }
    }
  }, [mode, onSessionExpired]);

  const handleChange = (index, value) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (!numericValue && value !== "") return; // Allow empty or numeric

    const newOtpValues = [...otpValues];
    newOtpValues[index] = numericValue.slice(-1); // Take the last digit if multiple
    setOtpValues(newOtpValues);

    if (numericValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otpValues[index] && index > 0) {
        e.preventDefault();
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = "";
        setOtpValues(newOtpValues);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pastedData) return;

    const newOtpValues = [...otpValues];
    let lastFilledIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (pastedData[i]) {
        newOtpValues[i] = pastedData[i];
        lastFilledIndex = i;
      }
    }
    setOtpValues(newOtpValues);

    if (lastFilledIndex < 5 && lastFilledIndex >= 0) {
      inputRefs.current[lastFilledIndex + 1]?.focus();
    } else if (lastFilledIndex === 5) {
      inputRefs.current[5]?.focus();
    }
  };

  const content = {
    email_verification: {
      title: "Verify your Email",
      subtitle: "Enter the code sent to:",
      buttonLabel: "Verify Account",
    },
    forget_password: {
      title: "Enter Reset Code",
      subtitle: "Enter the OTP sent to:",
      buttonLabel: "Verify & Continue",
    },
  };

  const { title, subtitle, buttonLabel } = content[mode];

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    let result;

    if (mode === "email_verification") {
      result = await verifyOTPAPI(contact, otp);
      if (result.success) {
        onVerifySuccess(otp);
      } else {
        setError(result.message);
      }
    } else if (mode === "forget_password") {
      result = await verifyOTPForResetAPI(contact, otp);
      console.log("OTP Verification Result:", result);
      if (result.success) {
        const reset_token = result.data.reset_token;
        onVerifySuccess(reset_token);
      } else {
        setError(result.message);
      }
    }

    setIsLoading(false);
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    setError("");
    setSuccessMessage("");

    let result;
    if (mode === "forget_password") {
      result = await forgetPasswordAPI(contact);
    } else {
      result = await resendOTPAPI();
    }

    if (result.success) {
      setSuccessMessage(result.message || "OTP sent successfully.");
      setTimeout(() => {
        setSuccessMessage("");
      }, 2000);
    } else {
      setError(result.message);
    }
    setResendLoading(false);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>{title}</h2>
        <p>
          {subtitle} <strong>{contact}</strong>
        </p>
      </div>

      <form onSubmit={handleVerify}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            marginBottom: "24px",
            flexWrap: "nowrap",
          }}
        >
          {otpValues.map((value, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              ref={(el) => (inputRefs.current[index] = el)}
              aria-label={`OTP digit ${index + 1}`}
              required={index === 0} // Only make first required to leverage native form validation loosely, or maybe don't need required attribute directly on all
              style={{
                flex: "0 0 auto",
                width: "42px",
                height: "48px",
                margin: 0,
                padding: 0,
                textAlign: "center",
                fontSize: "20px",
                fontWeight: "bold",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
                color: "#1f2937",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary, #3b82f6)";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.2)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
              }}
            />
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && (
          <div
            className="success-message"
            style={{
              color: "#10b981",
              marginBottom: "15px",
              padding: "10px",
              background: "var(--auth-success-bg, #d1fae5)",
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
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : buttonLabel}
        </button>
      </form>
      {timeLeft > 0 ? (
        <div
          style={{
            textAlign: "center",
            marginTop: "15px",
            color: "var(--text-muted, #6b7280)",
            fontSize: "14px",
          }}
        >
          Resend code available in{" "}
          <span
            style={{
              fontWeight: "600",
              color: "#e74c3c",
            }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      ) : (
        <div
          className="form-options"
          style={{ justifyContent: "center", marginTop: "15px" }}
        >
          <p>
            Didn't receive code?{" "}
            <a
              href="#"
              onClick={handleResendOTP}
              style={{
                pointerEvents: resendLoading ? "none" : "auto",
                color:
                  "var(--primary, #3b82f6)",
                fontWeight: "600",
                textDecoration:
                  "none",
              }}
            >
              {resendLoading ? "Resending..." : "Resend"}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default OTPVerification;
