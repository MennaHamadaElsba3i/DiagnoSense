import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPatientKeyInfoAPI } from './mockAPI.js'; // adjust path if needed
import '../css/ProcessingReports.css';

export default function ProcessingReports({ 
  patientId: propsPatientId, 
  token: propsToken, 
  onSuccess, 
  onFailure 
}) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const pollingRef = useRef(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    const patientId = propsPatientId || state?.patientId;
    const token = propsToken || state?.token;

    // Safety check — if missing, do nothing
    if (!patientId || !token) {
      console.warn("ProcessingReports: missing patientId or token", { patientId, token, state });
      return;
    }

    console.log("Starting polling for patientId:", patientId);

    pollingRef.current = setInterval(async () => {
      const result = await getPatientKeyInfoAPI(patientId, token);

      console.log("ProcessingReports: polling response:", result);

      if (result?.success && result?.data && !hasNavigated.current) {
        hasNavigated.current = true;         // prevent double navigation
        clearInterval(pollingRef.current);

        if (onSuccess) {
          onSuccess(result.data);
        } else {
          navigate(`/patient-profile/${patientId}`, {
            state: {
              keyInfoData: result.data,
              patientId: patientId,
            },
          });
        }
      } else if (result?.success === false) {
        // Check for explicit processing signal - continue polling if still processing
        if (result.message === "AI analysis is processing now") {
          // Keep loading / waiting, polling continues
        } else if (result.message && result.message.toLowerCase().includes('processing')) {
          // Any message indicating processing/ongoing work - keep polling
        } else if (result.message && result.message.toLowerCase().includes('failed') && 
                   result.message.toLowerCase().includes('no information')) {
          // The "process failed and no information retrieved" message appears to be 
          // an intermediate response in some cases - continue polling until we get
          // a definitive terminal state or timeout
          console.log("Received potential intermediate failure message, continuing polling:", result.message);
        } else {
          // Handle definite failure - only messages that clearly indicate terminal failure
          // Examples: explicit error messages without any processing context, network errors
          console.error("AI Analysis failed (terminal):", result.message);
          clearInterval(pollingRef.current);
          if (onFailure) {
            onFailure(result.message);
          } else {
            navigate(-1, { state: { error: result.message || "AI Analysis failed" } });
          }
        }
      }
    }, 4000); // polls every 4 seconds

    // Cleanup on unmount
    return () => clearInterval(pollingRef.current);
  }, []);   // runs once on mount

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="processing-reports-page">
        <div className="background-pattern"></div>

        <div className="ai-waves">
          <div className="wave"></div>
          <div className="wave"></div>
          <div className="wave"></div>
        </div>

        <div className="loading-container">
          <div className="loading-logo">
            <svg viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>

          <h1 className="loading-title">Processing Reports</h1>
          <p className="loading-subtitle">AI is analyzing patient data...</p>

          <div className="spinner-container">
            <div className="spinner"></div>
          </div>

          <div className="progress-container">
            <div className="progress-bar"></div>
          </div>

          <div className="status-message">Preparing diagnostic insights</div>

          <div className="loading-steps">
            <div className="loading-step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="step-text">Uploading medical files</span>
            </div>

            <div className="loading-step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="step-text">Analyzing lab results</span>
            </div>

            <div className="loading-step">
              <div className="step-icon">
                <div className="step-spinner"></div>
              </div>
              <span className="step-text">Generating patient profile</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}