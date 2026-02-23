import React, { useState } from "react";
import {
  verifyOTPAPI,
  verifyOTPForResetAPI,
  resendOTPAPI,
  forgetPasswordAPI,
} from "./mockAPI";
// import { setCookie } from "./cookieUtils.js";

const OTPVerification = ({
  identity,
  onVerifySuccess,
  mode = "email_verification",
}) => {
  const [otp, setOtp] = useState("");
  //   const [userIdentity, setUserIdentity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const content = {
    email_verification: {
      title: "Verify your Email",
      subtitle: "Enter the code sent to your email:",
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
      result = await verifyOTPAPI(identity, otp);
      if (result.success) {
        onVerifySuccess(otp);
      } else {
        setError(result.message);
      }
    } else if (mode === "forget_password") {
      result = await verifyOTPForResetAPI(identity, otp);
      if (result.success) {
        const reset_token =
          result.data.reset_token
        onVerifySuccess(reset_token);
      } else {
        setError(result.message);
      }
    }
    
    // if (result.success) {
    //   // بنجيب التوكن من الـ result، ولو مش موجود (زي في الـ Mock) بنحط قيمة "dummy"
    //   const tokenToStore = result.token || result.data?.token || "verified_user_token";
      
    //   setCookie("token", tokenToStore, 7);
    //   onVerifySuccess(otp); 
    // } else {
    //   setError(result.message);
    // }
    setIsLoading(false);
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    setError("");
    setSuccessMessage("");

    let result;
    if (mode === "forget_password") {
      // In forget password flow, resend using the identity (email/phone)
      result = await forgetPasswordAPI(identity);
    } else {
      // In email verification flow, use the authenticated resend endpoint
      result = await resendOTPAPI();
    }

    if (result.success) {
      setSuccessMessage(result.message || "OTP sent successfully.");
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
          {subtitle} <strong>{identity}</strong>
        </p>
      </div>

      <form onSubmit={handleVerify}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Enter OTP Code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            maxLength="6"
            style={{
              textAlign: "center",
              fontSize: "24px",
              letterSpacing: "8px",
            }}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <button
          type="submit"
          className={`btn-primary ${isLoading ? "loading" : ""}`}
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : buttonLabel}
        </button>
      </form>

      <div className="form-options" style={{ justifyContent: 'center', marginTop: '15px' }}>
        <p>Didn't receive code? 
          <a href="#" onClick={handleResendOTP} style={{ pointerEvents: resendLoading ? 'none' : 'auto' }}> {resendLoading ? "Resending..." : "Resend"}</a>
        </p>
      </div>
    </div>
  );
};

export default OTPVerification;
