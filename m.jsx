import React, { useState } from 'react';

// Login Component
const Login = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      alert('Login successful! Redirecting to dashboard...');
    }, 2000);
  };

  const handleGoogleLogin = () => {
    alert('Logging in with Google...');
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Login to your account</h2>
        <p>Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input type="email" placeholder="Email address" name="email" required />
        </div>

        <div className="form-group">
          <input type="password" placeholder="Password" name="password" required />
        </div>

        <div className="form-options">
          <label className="remember-me">
            <input type="checkbox" />
            Remember Me
          </label>
          <a href="#" className="forgot-password">Forgot Password?</a>
        </div>

        <button type="submit" className={`btn-primary ${isLoading ? 'loading' : ''}`}>
          {!isLoading && 'Login'}
        </button>
      </form>

      <div className="divider">
        <span>or continue with</span>
      </div>

      <div className="social-login">
        <button type="button" className="social-btn" onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
      </div>
    </div>
  );
};

// Register Component
const Register = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      alert('Account created successfully! Redirecting to dashboard...');
    }, 2000);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Create Account</h2>
        <p>Fill in your details to get started</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="name-row">
          <div className="form-group">
            <input type="text" placeholder="First Name" required />
          </div>
          <div className="form-group">
            <input type="text" placeholder="Last Name" required />
          </div>
        </div>

        <div className="form-group">
          <input type="email" placeholder="Email address" name="email" required />
        </div>

        <div className="form-group">
          <input type="password" placeholder="Password" name="password" required />
        </div>

        <div className="form-group">
          <input type="password" placeholder="Confirm Password" name="password_confirmation" required />
        </div>

        <div className="form-options" style={{ marginBottom: '20px' }}>
          <label className="remember-me">
            <input type="checkbox" required />
            I agree to Terms & Conditions
          </label>
        </div>

        <button type="submit" className={`btn-primary ${isLoading ? 'loading' : ''}`}>
          {!isLoading && 'Create Account'}
        </button>
      </form>
    </div>
  );
};

// Main App Component
const App = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [doctorImage, setDoctorImage] = useState('https://i.postimg.cc/MpcnGfzB/About-Us-Team-Photo-14.png');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'register') {
      setDoctorImage('https://i.postimg.cc/63zCzm6K/About-Us-Team-Photo-13.png');
    } else {
      setDoctorImage('https://i.postimg.cc/MpcnGfzB/About-Us-Team-Photo-14.png');
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #F8FAFF 0%, #E9F0FF 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow: hidden;
          position: relative;
        }

        .background-elements {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 8s ease-in-out infinite;
        }

        .glow-orb.blue {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #2A66FF 0%, transparent 70%);
          top: -10%;
          right: -5%;
          animation-delay: 0s;
        }

        .glow-orb.cyan {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #00C187 0%, transparent 70%);
          bottom: -10%;
          left: -5%;
          animation-delay: 2s;
        }

        .floating-icon {
          position: absolute;
          opacity: 0.15;
          animation: drift 12s ease-in-out infinite;
        }

        .floating-icon svg {
          width: 60px;
          height: 60px;
          stroke: #2A66FF;
          stroke-width: 1.5;
          fill: none;
        }

        .icon-1 { top: 15%; left: 10%; animation-delay: 0s; }
        .icon-2 { top: 25%; right: 15%; animation-delay: 3s; }
        .icon-3 { bottom: 20%; left: 12%; animation-delay: 6s; }
        .icon-4 { bottom: 30%; right: 10%; animation-delay: 9s; }

        .data-grid {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image:
            linear-gradient(rgba(42, 102, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(42, 102, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridPulse 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.15; }
          50% { transform: translate(20px, -20px) rotate(10deg); opacity: 0.25; }
        }

        @keyframes gridPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }

        .main-container {
          width: 100%;
          min-width: 1100px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          position: relative;
          z-index: 1;
          height: fit-content;
        }

        .left-section {
          background: linear-gradient(135deg, #E9F0FF 0%, #F8FAFF 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 35px 30px 0 30px;
          overflow: visible;
        }

        .left-visual-elements {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .medical-icon {
          position: absolute;
          opacity: 0.08;
          animation: floatMedical 8s ease-in-out infinite;
        }

        .medical-icon svg {
          width: 80px;
          height: 80px;
          fill: none;
          stroke: #2563eb;
          stroke-width: 1.5;
        }

        .med-icon-1 { top: 15%; left: 5%; animation-delay: 0s; }
        .med-icon-2 { top: 45%; left: 8%; animation-delay: 2s; }
        .med-icon-3 { bottom: 25%; left: 10%; animation-delay: 4s; }

        .pulse-ring {
          position: absolute;
          border: 2px solid rgba(37, 99, 235, 0.15);
          border-radius: 50%;
          animation: pulse 3s ease-out infinite;
        }

        .ring-1 { width: 150px; height: 150px; top: 20%; right: 10%; animation-delay: 0s; }
        .ring-2 { width: 100px; height: 100px; bottom: 30%; right: 15%; animation-delay: 1.5s; }

        .dna-helix {
          position: absolute;
          top: 50%;
          left: 10%;
          transform: translateY(-50%);
          opacity: 0.06;
        }

        .dna-strand {
          width: 60px;
          height: 200px;
          position: relative;
        }

        .dna-line {
          position: absolute;
          width: 2px;
          height: 100%;
          background: linear-gradient(to bottom, #2563eb, #3b82f6);
          animation: dnaRotate 4s linear infinite;
        }

        .dna-line:nth-child(1) { left: 0; }
        .dna-line:nth-child(2) { right: 0; animation-delay: 2s; }

        @keyframes floatMedical {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.08; }
          50% { transform: translateY(-15px) scale(1.05); opacity: 0.12; }
        }

        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.3; }
          50% { opacity: 0.15; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        @keyframes dnaRotate {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.3); }
        }

        .left-content {
          position: relative;
          z-index: 2;
          text-align: center;
          width: 100%;
        }

        .logo img {
          width: 230px;
        }

        .welcome-text h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0E1A34;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .welcome-text p {
          font-size: 15px;
          font-weight: 400;
          color: #3A4560;
          line-height: 1.5;
        }

        .doctor-image-container {
          position: relative;
          width: 100%;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
          height: 100%;
          margin-top: auto;
          z-index: 10;
          overflow: visible;
        }

        .doctor-image {
          position: relative;
          z-index: 15;
          width: 227px;
          height: 461px;
          object-fit: cover;
          right: -33px;
          animation: floatDoctor 4s ease-in-out infinite;
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.15));
        }

        @keyframes floatDoctor {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .right-section {
          background: #FFFFFF;
          padding: 0 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.04);
        }

        .form-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .tabs-container {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
          align-items: center;
        }

        .tab {
          flex: 1;
          height: 48px;
          padding: 0 20px;
          background: #F3F4F6;
          border: 2px solid transparent;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: #9CA3AF;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tab.active {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #FFFFFF;
          border: 2px solid transparent;
          background-clip: padding-box;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .tab:hover:not(.active) {
          color: #6B7280;
          border: none
        }

        .tab-content {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .form-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #0E1A34;
          margin-bottom: 6px;
        }

        .form-header p {
          font-size: 13px;
          color: #6B7280;
        }

        .form-group {
          margin-bottom: 18px;
          transition: transform 0.2s ease;
        }

        input[type="email"],
        input[type="password"],
        input[type="text"] {
          width: 100%;
          height: 44px;
          padding: 10px 14px;
          border: 1px solid #D1D5DB;
          border-radius: 12px;
          font-size: 14px;
          color: #111827;
          background: #FFFFFF;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }

        input::placeholder {
          color: #9CA3AF;
        }

        input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 4px rgba(37, 99, 235, 0.2);
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .remember-me {
          display: flex;
          align-items: center;
          color: #4B5563;
          cursor: pointer;
        }

        .remember-me input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin-right: 6px;
          cursor: pointer;
          accent-color: #2563eb;
        }

        .forgot-password {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .forgot-password:hover {
          color: #3b82f6;
        }

        .btn-primary {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .btn-primary:hover::before {
          width: 300px;
          height: 300px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-primary.loading {
          pointer-events: none;
          opacity: 0.8;
        }

        .btn-primary.loading::after {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          top: 50%;
          left: 50%;
          margin-left: -9px;
          margin-top: -9px;
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 0.6s linear infinite;
          z-index: 1;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #E5E7EB;
        }

        .divider span {
          padding: 0 12px;
          font-size: 12px;
          color: #9CA3AF;
          font-weight: 400;
        }

        .social-login {
          display: flex;
          gap: 12px;
        }

        .social-btn {
          flex: 1;
          height: 48px;
          padding: 0 20px;
          border: 1px solid #D1D5DB;
          border-radius: 12px;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 16px;
          color: #374151;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
        }

        .social-btn:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .name-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .main-container {
            grid-template-columns: 1fr;
            height: auto;
            max-height: none;
          }

          .left-section {
            display: none;
          }

          .right-section {
            padding: 30px 25px;
          }
        }

        @media (max-width: 480px) {
          body {
            padding: 10px;
          }

          .main-container {
            border-radius: 12px;
          }

          .right-section {
            padding: 25px 20px;
          }

          .form-header h2 {
            font-size: 22px;
          }

          .tab {
            font-size: 15px;
            padding: 10px 16px;
          }

          .name-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="background-elements">
        <div className="data-grid"></div>
        <div className="glow-orb blue"></div>
        <div className="glow-orb cyan"></div>

        <div className="floating-icon icon-1">
          <svg viewBox="0 0 24 24">
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
        <div className="floating-icon icon-2">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M8 12h8" />
          </svg>
        </div>
        <div className="floating-icon icon-3">
          <svg viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div className="floating-icon icon-4">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M1 12h6m6 0h6" />
          </svg>
        </div>
      </div>

      <div className="main-container">
        <div className="left-section">
          <div className="left-visual-elements">
            <div className="medical-icon med-icon-1">
              <svg viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="medical-icon med-icon-2">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20" cy="10" r="2" />
              </svg>
            </div>

            <div className="medical-icon med-icon-3">
              <svg viewBox="0 0 24 24">
                <path d="M12 2v20M17 7H7v10h10V7z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12h6M12 9v6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="pulse-ring ring-1"></div>
            <div className="pulse-ring ring-2"></div>

            <div className="dna-helix">
              <div className="dna-strand">
                <div className="dna-line"></div>
                <div className="dna-line"></div>
              </div>
            </div>
          </div>

          <div className="left-content">
            <div className="logo">
              <span className="logo-text">
                <img src="./Logo_Diagnoo.png" alt="DiagnoSense Logo" onError={(e) => e.target.style.display='none'} />
              </span>
            </div>

            <div className="welcome-text">
              <h1>Welcome back, Doctor.</h1>
              <p>Login to access your DiagnoSense dashboard.</p>
            </div>
          </div>

          <div className="doctor-image-container">
            <img
              src={doctorImage}
              alt="Doctor"
              className="doctor-image"
              onError={(e) => e.target.style.display='none'}
            />
          </div>
        </div>

        <div className="right-section">
          <div className="form-wrapper">
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                Login
              </button>
              <button
                className={`tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => handleTabChange('register')}
              >
                Register
              </button>
            </div>

            {activeTab === 'login' ? <Login /> : <Register />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;