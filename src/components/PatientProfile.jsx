import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { getPatientAnalysisAPI } from "./mockAPI";
import logo from "../assets/Logo_Diagnoo.png";
import "../css/PatientProfile.css";

const PatientProfile = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      text: "Hello Dr. Layla! How can I assist you with Nour Hassan's case today?",
    },
  ]);
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  const [activeAccordions, setActiveAccordions] = useState({});

  const [expandedLikelihoods, setExpandedLikelihoods] = useState({});

  const [tasks, setTasks] = useState([
    {
      id: 1,
      text: "Schedule MRI for liver assessment",
      done: false,
      badge: "Due Nov 5",
      badgeClass: "badge-critical",
    },
    {
      id: 2,
      text: "Complete Blood Test",
      done: true,
      badge: "Done Oct 30",
      badgeClass: "badge-stable",
    },
    {
      id: 3,
      text: "Follow-up consultation",
      done: false,
      badge: "Due Nov 15",
      badgeClass: "badge-info",
    },
    {
      id: 4,
      text: "Review medication adherence",
      done: true,
      badge: "Done Oct 28",
      badgeClass: "badge-stable",
    },
    {
      id: 5,
      text: "Nutritionist consultation",
      done: false,
      badge: "Due Nov 10",
      badgeClass: "badge-info",
    },
    {
      id: 6,
      text: "Repeat Liver Function Test",
      done: false,
      badge: "Due Nov 10",
      badgeClass: "badge-info",
    },
  ]);

  //   useEffect(() => {
  //     const fetchAnalysisData = async () => {
  //       const patientData = JSON.parse(localStorage.getItem("currentPatient"));
  //       if (patientData && patientData.patient_id) {
  //         setIsLoadingAnalysis(true);

  //         console.log(patientData.patient_id);
  //         const result = await getPatientAnalysisAPI(patientData.patient_id);
  //         if (result.success) {
  //             console.log(result.result);
  //           setAnalysisData(result.data);
  //         }

  //         setIsLoadingAnalysis(false);
  //       }
  //     };

  //     fetchAnalysisData();
  //   }, []);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      const patientData = JSON.parse(localStorage.getItem("currentPatient"));

      if (patientData && patientData.patient_id) {
        setIsLoadingAnalysis(true);

        const result = await getPatientAnalysisAPI(patientData.patient_id);

        if (result.success) {
          console.log("Analysis Data:", result.data);
          setAnalysisData(result.data);
        } else {
          console.error(result.message);
        }

        setIsLoadingAnalysis(false);
      }
    };

    fetchAnalysisData();
  }, []);

  // Selected Report State
  const [selectedReport, setSelectedReport] = useState(null);

  // Refs for scrolling
  const messagesEndRef = useRef(null);

  // -- Effects --
  useEffect(() => {
    // Scroll to bottom of chat when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // -- Handlers --

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleAccordion = (index) => {
    setActiveAccordions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleLikelihood = (index) => {
    setExpandedLikelihoods((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const handleReportClick = (index) => {
    setSelectedReport(index);
  };

  // Chatbot Logic
  const toggleChat = () => setIsChatOpen(!isChatOpen);

  const handleChatEnter = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;

    // Add user message
    const newMessages = [...chatMessages, { type: "user", text: chatInput }];
    setChatMessages(newMessages);
    const currentInput = chatInput.toLowerCase();
    setChatInput("");

    // Simulate AI response
    setTimeout(() => {
      let aiText =
        "I can help you with lab results, medication history, trends analysis, and patient summaries. What would you like to know?";

      if (currentInput.includes("hba1c")) {
        aiText =
          "6.1% (Oct 25, 2025). Within normal range for diabetic patients. Shows 0.7% improvement from baseline.";
      } else if (
        currentInput.includes("liver") ||
        currentInput.includes("alt")
      ) {
        aiText =
          "ALT slightly elevated at 48 U/L; however, showing consistent improvement overall. Last three readings: 62 → 55 → 48 U/L. Recommend follow-up test in 7 days.";
      } else if (
        currentInput.includes("medication") ||
        currentInput.includes("drug")
      ) {
        aiText =
          "Current medications: Atorvastatin 20mg daily, Metformin 500mg twice daily. No interactions detected. Patient reported good adherence.";
      } else if (
        currentInput.includes("blood pressure") ||
        currentInput.includes("bp")
      ) {
        aiText =
          "Blood pressure shows excellent improvement: 145/92 → 128/82 mmHg. Normalized over last 3 visits. Treatment effective.";
      }

      setChatMessages((prev) => [...prev, { type: "ai", text: aiText }]);
    }, 800);
  };

  // Modal Handlers
  const openDecisionSupport = () => setIsDecisionModalOpen(true);
  const closeDecisionSupport = () => setIsDecisionModalOpen(false);
  const upgradeToProPlan = () => {
    alert("Redirecting to subscription page...");
    closeDecisionSupport();
    // navigate('/subscription');
  };

  return (
    <div className="patient-profile-page">
      {/* Background Layer */}
      <div className="background-layer">
        <div className="ambient-ripple ripple-1"></div>
        <div className="ambient-ripple ripple-2"></div>
        <div className="ambient-ripple ripple-3"></div>
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text">
            <img src={logo} alt="DiagnoSense" />
          </span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-main">
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              <Link to="/dashboard" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </span>
                <span>Overview</span>
              </Link>
              <Link to="/patients" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span>Patients</span>
              </Link>
              <Link to="/subscription" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <span>Subscription</span>
              </Link>
              <Link to="/support" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </span>
                <span>Support</span>
              </Link>
            </div>
          </div>

          {/* Premium Decision Support Card */}
          <div className="nav-bottom">
            <div
              className="decision-support-card"
              onClick={openDecisionSupport}
            >
              <div className="card-header">
                <div className="card-icon">
                  <svg viewBox="0 0 24 24">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                </div>
                <span className="decision-card-title">Decision Support</span>
                <span className="card-pro-badge">PRO</span>
              </div>
              <div className="card-subtitle">Make accurate decisions</div>
              <button className="card-cta-btn">Try Now</button>
            </div>
          </div>
        </nav>
      </aside>

      {/* Top Navbar */}
      <nav className="top-navbar">
        <div className="search-container">
          <svg
            className="search-icon"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search patient or report…"
          />
        </div>

        <div className="navbar-right">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span>Online</span>
          </div>

          <div className="credits-badge">
            <span className="credits-icon">
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: "18px",
                  height: "18px",
                  stroke: "currentColor",
                  fill: "none",
                  strokeWidth: "2",
                }}
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </span>
            <span>Credits: 1,247</span>
          </div>

          <button className="icon-btn">
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge"></span>
          </button>

          <div className="user-avatar" onClick={() => navigate("/settings")}>
            LA
          </div>
        </div>
      </nav>

      {/* Decision Support Modal */}
      <div
        className={`modal-overlay ${isDecisionModalOpen ? "active" : ""}`}
        id="decisionSupportModal"
        onClick={(e) =>
          e.target.id === "decisionSupportModal" && closeDecisionSupport()
        }
      >
        <div className="modal-content">
          <button className="modal-close" onClick={closeDecisionSupport}>
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="modal-header">
            <div className="modal-icon">
              <svg viewBox="0 0 24 24">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </div>
            <h2 className="modal-title">Decision Support</h2>
            <p className="modal-subtitle">
              AI-powered clinical decision assistance
            </p>
          </div>
          <div className="modal-body">
            <p className="modal-text">
              Enhance your diagnostic accuracy with our advanced AI-powered
              Decision Support system. Get intelligent recommendations based on
              patient data, symptoms, and medical history.
            </p>
            <ul className="modal-features">
              <li>
                <svg viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>
                  Real-time diagnostic suggestions based on latest medical
                  research
                </span>
              </li>
              <li>
                <svg viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>
                  Comprehensive differential diagnosis lists with confidence
                  scores
                </span>
              </li>
              <li>
                <svg viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>
                  Treatment recommendations and drug interaction warnings
                </span>
              </li>
            </ul>
          </div>
          <div className="modal-footer">
            <button
              className="modal-button modal-button-secondary"
              onClick={closeDecisionSupport}
            >
              Maybe Later
            </button>
            <button
              className="modal-button modal-button-primary"
              onClick={upgradeToProPlan}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="content-layer">
        {/* Patient Header - Compact */}
        <header className="patient-header">
          <div className="patient-identity">
            <div className="patient-main-info">
              <div className="patient-avatar">NH</div>
              <div className="patient-details">
                <h1>Nour Hassan</h1>
                <p className="patient-meta">Dr. El-Sayed / Patient ID #2031</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary">Edit File</button>
              <button className="btn btn-secondary">Start Collaboration</button>
              <button className="btn btn-primary" style={{padding:"35px 40px"}}>Verify Summary</button>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <div className="container">
          {/* Tab Navigation */}
          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => handleTabClick("overview")}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === "keyinfo" ? "active" : ""}`}
              onClick={() => handleTabClick("keyinfo")}
            >
              Key Important Info
            </button>
            <button
              className={`tab-btn ${
                activeTab === "comparative" ? "active" : ""
              }`}
              onClick={() => handleTabClick("comparative")}
            >
              Comparative Analysis
            </button>
            <button
              className={`tab-btn ${activeTab === "records" ? "active" : ""}`}
              onClick={() => handleTabClick("records")}
            >
              Patient Records
            </button>
            <button
              className={`tab-btn ${activeTab === "decision" ? "active" : ""}`}
              onClick={() => handleTabClick("decision")}
            >
              Decision Support
            </button>
            <button
              className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
              onClick={() => handleTabClick("tasks")}
            >
              Tasks & Follow-ups
            </button>
            <button
              className={`tab-btn ${activeTab === "activity" ? "active" : ""}`}
              onClick={() => handleTabClick("activity")}
            >
              Activity Log
            </button>
          </nav>

          {/* Overview Tab */}
          <div
            className={`tab-content ${
              activeTab === "overview" ? "active" : ""
            }`}
            id="overview"
          >
            <div className="overview-layout">
              <div className="card smart-summary">
                <div className="card-header">
                  <h2 className="card-title">
                    <span className="ai-pulse"></span>
                    Smart Summary
                  </h2>
                </div>
                <div className="ai-insight">
                  <strong>AI Summary:</strong>{" "}
                  {isLoadingAnalysis
                    ? "Loading..."
                    : 
                      analysisData?.[0]?.result?.["ai-summary"] ||
                      "No insights available"}
                </div>

                <div className="critical-info-section">
                  <h3 className="section-header">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    Critical Key Information
                  </h3>
                  <div className="key-info-grid">
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Primary Condition
                      </div>
                      <div className="info-value">
                        Type 2 Diabetes, Hypertension
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        </svg>
                        Current Diagnosis
                      </div>

                      <div className="info-value">
                        {isLoadingAnalysis ? (
                          "Loading..."
                        ) : /* 1. التأكد إن الداتا موجودة والـ Array مش فاضية */
                        analysisData?.[0]?.result?.current_diagnoses?.length >
                          0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "5px",
                            }}
                          >
                            {/* 2. عمل Map لعرض كل تشخيص في سطر لوحده */}
                            {analysisData[0].result.current_diagnoses.map(
                              (diagnosis, index) => (
                                <span
                                  key={index}
                                  style={{
                                    display: "block",
                                    fontSize: "13px",
                                    lineHeight: "1.4",
                                  }}
                                >
                                  • {diagnosis}
                                </span>
                              )
                            )}
                          </div>
                        ) : (
                          "No diagnosis recorded"
                        )}
                      </div>
                    </div>
                    <div
                      className="info-item"
                      style={{ background: "#FFECEC", borderColor: "#FF5C5C" }}
                    >
                      <div className="info-label" style={{ color: "#FF5C5C" }}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Critical Allergy
                      </div>
                      <div className="info-value" style={{ color: "#FF5C5C" }}>
                        Penicillin (Anaphylaxis)
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          ></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                        </svg>
                        Date of Birth
                      </div>
                      <div className="info-value">
                        March 15, 1978 (47 years)
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                        </svg>
                        Blood Type
                      </div>
                      <div className="info-value">O+</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Contact Number
                      </div>
                      <div className="info-value">+20 101 234 5678</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Important Info Tab */}
          {/* <div
            className={`tab-content ${activeTab === "keyinfo" ? "active" : ""}`}
            id="keyinfo"
          >
            <div className="priority-sections">
              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon high"></span>
                    High Priority Alerts
                  </h3>
                  <button className="btn btn-primary">+ Add Note</button>
                </div>
                <div className="note-list">
                  <div className="note-item high-priority">
                    <div className="note-text">
                      <strong>ALT Elevation Requires Follow-up:</strong> Liver
                      enzyme ALT elevated at 48 U/L (normal range: 7-56 U/L).
                      Although showing improvement trend, recommend follow-up
                      liver function test in 7 days and abdominal ultrasound
                      review.
                    </div>
                    <div className="note-meta">
                      <span>📝 Dr. Sarah Ahmed</span>
                      <span>Oct 28, 2025</span>
                    </div>
                  </div>

                  <div className="note-item high-priority">
                    <div className="note-text">
                      <strong>Penicillin Allergy - Critical:</strong> Patient
                      has documented severe allergic reaction to Penicillin
                      (anaphylaxis). Always verify antibiotic alternatives
                      before prescribing. Consider carrying epinephrine
                      auto-injector.
                    </div>
                    <div className="note-meta">
                      <span>⚠️ Critical Medical Alert</span>
                      <span>Permanent Record</span>
                    </div>
                  </div>

                  <div className="note-item high-priority">
                    <div className="note-text">
                      <strong>Medication Adherence Check:</strong> Patient
                      should be counseled on importance of consistent medication
                      timing for Metformin (twice daily). Recent HbA1c suggests
                      good control but monitoring adherence remains essential.
                    </div>
                    <div className="note-meta">
                      <span>📋 Dr. El-Sayed</span>
                      <span>Oct 30, 2025</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon low"></span>
                    Low Priority Notes
                  </h3>
                  <button className="btn btn-primary">+ Add Note</button>
                </div>
                <div className="note-list">
                  <div className="note-item low-priority">
                    <div className="note-text">
                      <strong>Medication Cost Concern Addressed:</strong>{" "}
                      Patient inquired about generic alternatives for
                      Atorvastatin. Confirmed current prescription is already
                      generic formulation. Insurance coverage verified and
                      adequate.
                    </div>
                    <div className="note-meta">
                      <span>💊 Pharmacy Note</span>
                      <span>Oct 10, 2025</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* Key Important Info Tab */}
          <div
            className={`tab-content ${activeTab === "keyinfo" ? "active" : ""}`}
            id="keyinfo"
          >
            <div className="priority-sections">
              {/* --- High Priority Section --- */}
              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon high"></span>
                    High Priority Alerts
                  </h3>
                  <button className="btn btn-primary">+ Add Note</button>
                </div>

                <div className="note-list">
                  {isLoadingAnalysis ? (
                    <div style={{ padding: "20px", color: "#666" }}>
                      Loading High Priority Alerts...
                    </div>
                  ) : /* التحقق من وجود داتا وعرضها */
                  analysisData?.[0]?.result?.high_priority_alerts?.length >
                    0 ? (
                    analysisData[0].result.high_priority_alerts.map(
                      (alert, index) => (
                        <div className="note-item high-priority" key={index}>
                          <div className="note-text">
                            {/* عرض نص التحذير القادم من الـ API */}
                            <strong>Critical: </strong> {alert}
                          </div>
                          <div className="note-meta">
                            {/* بيانات ثابتة لأن الـ API يرسل النص فقط */}
                            <span>🤖 AI Analysis</span>
                            <span>{new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="note-item">
                      No high priority alerts detected.
                    </div>
                  )}
                </div>
              </div>

              {/* --- Low Priority Section --- */}
              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon low"></span>
                    Low Priority Notes
                  </h3>
                  <button className="btn btn-primary">+ Add Note</button>
                </div>

                <div className="note-list">
                  {isLoadingAnalysis ? (
                    <div style={{ padding: "20px", color: "#666" }}>
                      Loading Low Priority Notes...
                    </div>
                  ) : /* التحقق من وجود داتا وعرضها */
                  analysisData?.[0]?.result?.low_priority_alerts?.length > 0 ? (
                    analysisData[0].result.low_priority_alerts.map(
                      (alert, index) => (
                        <div className="note-item low-priority" key={index}>
                          <div className="note-text">
                            {/* عرض نص الملاحظة القادم من الـ API */}
                            <strong>Note: </strong> {alert}
                          </div>
                          <div className="note-meta">
                            <span>ℹ️ AI Suggestion</span>
                            <span>{new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="note-item">
                      No low priority notes available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Analysis Tab */}
          <div
            className={`tab-content ${
              activeTab === "comparative" ? "active" : ""
            }`}
            id="comparative"
          >
            <div className="card">
              <div className="timeline">
                <div className="timeline-node">Visit #1</div>
                <div className="timeline-node">Visit #2</div>
                <div className="timeline-node">Visit #3</div>
                <div className="timeline-node">Visit #4</div>
                <div className="timeline-node">Visit #5</div>
              </div>

              <div className="chart-grid">
                {/* Charts converted to SVG JSX */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Blood Pressure</h3>
                    <span className="chart-trend trend-down">↓ 8.2%</span>
                  </div>
                  <div className="mini-chart">
                    <svg className="chart-canvas" viewBox="0 0 300 180">
                      <defs>
                        <linearGradient
                          id="grad1"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            style={{ stopColor: "#2A66FF", stopOpacity: 0.3 }}
                          />
                          <stop
                            offset="100%"
                            style={{ stopColor: "#2A66FF", stopOpacity: 0 }}
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 120 L 75 100 L 150 80 L 225 70 L 300 65 L 300 180 L 0 180 Z"
                        fill="url(#grad1)"
                      />
                      <path
                        d="M 0 120 L 75 100 L 150 80 L 225 70 L 300 65"
                        stroke="#2A66FF"
                        strokeWidth="3"
                        fill="none"
                      />
                      <circle cx="0" cy="120" r="4" fill="#2A66FF" />
                      <circle cx="75" cy="100" r="4" fill="#2A66FF" />
                      <circle cx="150" cy="80" r="4" fill="#2A66FF" />
                      <circle cx="225" cy="70" r="4" fill="#2A66FF" />
                      <circle cx="300" cy="65" r="4" fill="#00C187" />
                    </svg>
                  </div>
                  <div className="chart-stats">
                    <div className="stat-col">
                      <div className="stat-label">Initial</div>
                      <div className="stat-value">145/92</div>
                    </div>
                    <div className="stat-col">
                      <div className="stat-label">Current</div>
                      <div className="stat-value" style={{ color: "#00C187" }}>
                        128/82
                      </div>
                    </div>
                    <div className="stat-col">
                      <div className="stat-label">Change</div>
                      <div className="stat-value" style={{ color: "#00C187" }}>
                        -17/-10
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Total Cholesterol</h3>
                    <span className="chart-trend trend-down">↓ 12.4%</span>
                  </div>
                  <div className="mini-chart">
                    <svg className="chart-canvas" viewBox="0 0 300 180">
                      <defs>
                        <linearGradient
                          id="grad2"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            style={{ stopColor: "#467DFF", stopOpacity: 0.3 }}
                          />
                          <stop
                            offset="100%"
                            style={{ stopColor: "#467DFF", stopOpacity: 0 }}
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 110 L 75 95 L 150 85 L 225 75 L 300 60 L 300 180 L 0 180 Z"
                        fill="url(#grad2)"
                      />
                      <path
                        d="M 0 110 L 75 95 L 150 85 L 225 75 L 300 60"
                        stroke="#467DFF"
                        strokeWidth="3"
                        fill="none"
                      />
                      <circle cx="0" cy="110" r="4" fill="#467DFF" />
                      <circle cx="75" cy="95" r="4" fill="#467DFF" />
                      <circle cx="150" cy="85" r="4" fill="#467DFF" />
                      <circle cx="225" cy="75" r="4" fill="#467DFF" />
                      <circle cx="300" cy="60" r="4" fill="#00C187" />
                    </svg>
                  </div>
                  <div className="chart-stats">
                    <div className="stat-col">
                      <div className="stat-label">Initial</div>
                      <div className="stat-value">223</div>
                    </div>
                    <div className="stat-col">
                      <div className="stat-label">Current</div>
                      <div className="stat-value" style={{ color: "#00C187" }}>
                        195
                      </div>
                    </div>
                    <div className="stat-col">
                      <div className="stat-label">Change</div>
                      <div className="stat-value" style={{ color: "#00C187" }}>
                        -28
                      </div>
                    </div>
                  </div>
                </div>

                {/* More charts can be added here following same pattern */}
              </div>
            </div>
          </div>

          {/* Patient Records Tab */}
          <div
            className={`tab-content ${activeTab === "records" ? "active" : ""}`}
            id="records"
          >
            <div className="records-layout">
              {/* Medical History Section */}
              <div className="section-card">
                <div className="section-title">
                  <div className="section-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  Medical History
                </div>

                <div
                  className={`accordion-item ${
                    activeAccordions[0] ? "active" : ""
                  }`}
                >
                  <div
                    className="accordion-header"
                    onClick={() => toggleAccordion(0)}
                  >
                    <span>Chronic Conditions</span>
                    <span className="accordion-icon">▼</span>
                  </div>
                  <div className="accordion-content">
                    <div className="history-entry">
                      <strong>Hypertension</strong> - Since 2018
                      <br />
                      <span style={{ fontSize: "11px", color: "#8A94A6" }}>
                        Currently managed with medication
                      </span>
                      <br />
                      <span
                        className="badge badge-info"
                        style={{ marginTop: "6px", display: "inline-block" }}
                      >
                        Verified by AI
                      </span>
                    </div>
                    <div className="history-entry">
                      <strong>Type 2 Diabetes</strong> - Since 2020
                      <br />
                      <span style={{ fontSize: "11px", color: "#8A94A6" }}>
                        Well controlled with lifestyle and medication
                      </span>
                      <br />
                      <span
                        className="badge badge-info"
                        style={{ marginTop: "6px", display: "inline-block" }}
                      >
                        Verified by AI
                      </span>
                    </div>
                  </div>
                </div>
                {/* Additional accordion items would follow same pattern */}
              </div>

              {/* Lab Reports Section */}
              <div className="section-card">
                <div className="section-title">
                  <div className="section-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  Lab & Reports
                </div>

                <div className="report-list">
                  <div
                    className={`report-card ${
                      selectedReport === 0 ? "selected" : ""
                    }`}
                    onClick={() => handleReportClick(0)}
                  >
                    <div className="report-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2A66FF"
                        strokeWidth="2"
                      >
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                    </div>
                    <div className="report-info">
                      <div className="report-name">Complete Blood Count</div>
                      <div className="report-date">Oct 30, 2025</div>
                    </div>
                    <span className="badge badge-stable">Normal</span>
                  </div>
                  {/* More report cards... */}
                </div>
              </div>
            </div>
          </div>

          {/* Decision Support Tab */}
          <div
            className={`tab-content ${
              activeTab === "decision" ? "active" : ""
            }`}
            id="decision"
          >
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: "20px" }}>
                <span className="ai-pulse"></span>
                AI-Powered Decision Support
              </h2>
              <div className="likelihood-stack">
                {isLoadingAnalysis ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    Analyzing diagnostic data...
                  </div>
                ) : (
                  <>
                    {/* 1. High Likelihood Section (Red) */}
                    {analysisData?.[0]?.result?.likely_diagnoses?.high_likelihood?.map(
                      (item, index) => (
                        <div
                          key={`high-${index}`}
                          className={`likelihood-card high ${
                            expandedLikelihoods[`high-${index}`]
                              ? "expanded"
                              : ""
                          }`}
                          onClick={() => toggleLikelihood(`high-${index}`)}
                        >
                          <div className="likelihood-header">
                            <div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#FF5C5C",
                                  marginBottom: "3px",
                                  fontWeight: 600,
                                }}
                              >
                                HIGH LIKELIHOOD
                              </div>
                              <div className="likelihood-title">
                                {item.condition}
                              </div>
                            </div>
                            <div
                              className="confidence"
                              style={{ color: "#FF5C5C" }}
                            >
                              {item.probability}
                            </div>
                          </div>
                          <div className="reasoning">
                            <strong>AI Analysis:</strong> This condition shows a
                            strong correlation with the patient's reported
                            symptoms and recent lab results. (Probability:{" "}
                            {item.probability})
                          </div>
                        </div>
                      )
                    )}

                    {/* 2. Possible Diagnoses Section (Orange) */}
                    {analysisData?.[0]?.result?.likely_diagnoses?.possible?.map(
                      (item, index) => (
                        <div
                          key={`poss-${index}`}
                          className={`likelihood-card medium ${
                            expandedLikelihoods[`poss-${index}`]
                              ? "expanded"
                              : ""
                          }`}
                          onClick={() => toggleLikelihood(`poss-${index}`)}
                          style={{ borderLeft: "4px solid #FFA500" }} // لون برتقالي للمحتمل
                        >
                          <div className="likelihood-header">
                            <div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#FFA500",
                                  marginBottom: "3px",
                                  fontWeight: 600,
                                }}
                              >
                                POSSIBLE DIAGNOSIS
                              </div>
                              <div className="likelihood-title">
                                {item.condition}
                              </div>
                            </div>
                            <div
                              className="confidence"
                              style={{ color: "#FFA500" }}
                            >
                              {item.probability}
                            </div>
                          </div>
                          <div className="reasoning">
                            <strong>AI Analysis:</strong> Potential diagnosis
                            based on partial symptom match. Further
                            investigation suggested.
                          </div>
                        </div>
                      )
                    )}

                    {/* 3. Low Likelihood Section (Blue/Grey) */}
                    {analysisData?.[0]?.result?.likely_diagnoses?.low_likelihood?.map(
                      (item, index) => (
                        <div
                          key={`low-${index}`}
                          className={`likelihood-card low ${
                            expandedLikelihoods[`low-${index}`]
                              ? "expanded"
                              : ""
                          }`}
                          onClick={() => toggleLikelihood(`low-${index}`)}
                          style={{ borderLeft: "4px solid #2A66FF" }} // لون أزرق للمنخفض
                        >
                          <div className="likelihood-header">
                            <div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#2A66FF",
                                  marginBottom: "3px",
                                  fontWeight: 600,
                                }}
                              >
                                LOW LIKELIHOOD
                              </div>
                              <div className="likelihood-title">
                                {item.condition}
                              </div>
                            </div>
                            <div
                              className="confidence"
                              style={{ color: "#2A66FF" }}
                            >
                              {item.probability}
                            </div>
                          </div>
                          <div className="reasoning">
                            <strong>AI Analysis:</strong> Considered unlikely
                            but monitored for differential diagnosis exclusion.
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tasks & Follow-ups Tab */}
          <div
            className={`tab-content ${activeTab === "tasks" ? "active" : ""}`}
            id="tasks"
          >
            <div className="card">
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#0E1A34",
                  marginBottom: "18px",
                }}
              >
                Upcoming Tasks
              </h3>
              <div className="task-list">
                {tasks.map((task) => (
                  <div
                    className="task-item"
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                  >
                    <div
                      className={`task-checkbox ${task.done ? "checked" : ""}`}
                    ></div>
                    <div className={`task-text ${task.done ? "done" : ""}`}>
                      {task.text}
                    </div>
                    <span className={`badge ${task.badgeClass}`}>
                      {task.badge}
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: "20px" }}>
                + Add New Follow-up
              </button>
            </div>
          </div>

          {/* Activity Log Tab */}
          <div
            className={`tab-content ${
              activeTab === "activity" ? "active" : ""
            }`}
            id="activity"
          >
            <div className="card">
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#0E1A34",
                  marginBottom: "18px",
                }}
              >
                Recent Activity
              </h3>
              <div className="activity-timeline">
                <div className="activity-item">
                  <div className="activity-text">
                    🕒 Dr. Ahmed uploaded new lab results
                  </div>
                  <div className="activity-time">Oct 31, 2025 - 2:30 PM</div>
                </div>
                <div className="activity-item">
                  <div className="activity-text">
                    ✅ AI summary verified by Dr. Sarah
                  </div>
                  <div className="activity-time">Oct 30, 2025 - 11:15 AM</div>
                </div>
                {/* More activity items... */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot Trigger */}
      <div className="chatbot-trigger" onClick={toggleChat}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>

      {/* Chatbot Panel */}
      <div
        className={`chatbot-panel ${isChatOpen ? "active" : ""}`}
        id="chatPanel"
      >
        <div className="chat-header">
          <div>
            <div style={{ fontWeight: 600 }}>AI Assistant</div>
            <div style={{ fontSize: "11px", opacity: 0.9 }}>
              Always here to help
            </div>
          </div>
          <button
            onClick={toggleChat}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "22px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div className="chat-messages" id="chatMessages">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Ask me anything..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleChatEnter}
          />
          <button className="btn btn-primary" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
