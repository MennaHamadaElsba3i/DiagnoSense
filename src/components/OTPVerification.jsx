import React, { useState } from "react";
import { verifyOTPAPI, resendOTPAPI } from "./mockAPI";
import { setCookie } from "./cookieUtils.js";

const OTPVerification = ({ identity, onVerifySuccess }) => {
  const [otp, setOtp] = useState("");
//   const [userIdentity, setUserIdentity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
  //   if (onVerifySuccess.length > 0) { 
  //   onVerifySuccess(otp); 
  //   return;
  // }
    setIsLoading(true);
    setError("");

  //   if (skipVerification) {   // افتكري يا كوتي لو رجعتيها تحطيها فوق في البروبس يا نونو
  //   onVerifySuccess(otp);
  //   setIsLoading(false);
  //   return;
  // }
    const result = await verifyOTPAPI(identity, otp);

    if (result.success) {
      // بنجيب التوكن من الـ result، ولو مش موجود (زي في الـ Mock) بنحط قيمة "dummy"
      const tokenToStore = result.token || result.data?.token || "verified_user_token";
      
      setCookie("token", tokenToStore, 7);
      onVerifySuccess(otp); 
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    setError("");
    setSuccessMessage("");
    const result = await resendOTPAPI();
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
        <h2>Verify your account</h2>
        <p>Enter the code sent to: <strong>{identity}</strong></p>
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
            style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <button type="submit" className={`btn-primary ${isLoading ? "loading" : ""}`}>
          {!isLoading && "Verify Now"}
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