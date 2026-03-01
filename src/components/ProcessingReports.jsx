import '../css/ProcessingReports.css';

export default function ProcessingReports() {
  return (
    <>
      {/* Google Fonts */}
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