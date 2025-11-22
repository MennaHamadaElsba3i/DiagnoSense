import React, { useState } from 'react';
import Login from '../components/Login.jsx';
import Register from '../components/Register.jsx';
import ForgetPassword from '../components/ForgetPassword.jsx';
import ResetPassword from '../components/ResetPassword.jsx';
import logo from "../assets/Logo_Diagnoo.png"
import '../css/auth.css';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [currentView, setCurrentView] = useState('auth'); 
  const [userEmail, setUserEmail] = useState('');
  const [doctorImage, setDoctorImage] = useState('https://i.postimg.cc/MpcnGfzB/About-Us-Team-Photo-14.png');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentView('auth');
    if (tab === 'register') {
      setDoctorImage('https://i.postimg.cc/63zCzm6K/About-Us-Team-Photo-13.png');
    } else {
      setDoctorImage('https://i.postimg.cc/MpcnGfzB/About-Us-Team-Photo-14.png');
    }
  };

  const handleForgotPassword = () => {
    setCurrentView('forget');
  };

  const handleOTPSent = (email) => {
    setUserEmail(email);

    setCurrentView('reset');
  };

  const handleBackToLogin = () => {
    setCurrentView('auth');
    setActiveTab('login');
    setUserEmail('');
    setDoctorImage('https://i.postimg.cc/MpcnGfzB/About-Us-Team-Photo-14.png');
  };

  const handleBackToForget = () => {
    setCurrentView('forget');
  };

  const handleResetSuccess = () => {
    handleBackToLogin();
  };

  const renderContent = () => {
    switch (currentView) {
      case 'forget':
        return <ForgetPassword onOTPSent={handleOTPSent} onBackToLogin={handleBackToLogin} />;
      case 'reset':
        return (
          <ResetPassword 
            email={userEmail} 
            onResetSuccess={handleResetSuccess}
            onBackToForget={handleBackToForget}
          />
        );
      default:
        return activeTab === 'login' ? 
          <Login onForgotPassword={handleForgotPassword} /> : 
          <Register />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display:'flex', justifyContent:'center', alignItems:'center' }}>
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

          </div>

          <div className="left-content">
            <div className="logo">
              <span className="logo-text">
                <img src={logo} alt="DiagnoSense Logo" onError={(e) => e.target.style.display='none'} />
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
            {currentView === 'auth' && (
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
            )}

            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;