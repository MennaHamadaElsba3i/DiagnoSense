import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { getPatientAnalysisAPI } from "./mockAPI";
import EvidencePanel from "../components/EvidencePanel.jsx";

import logo from "../assets/Logo_Diagnoo.png";
import "../css/PatientProfile.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";

const PatientProfile = () => {
  const navigate = useNavigate();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const [selectedStatus, setSelectedStatus] = useState(() => {
    const patientData = JSON.parse(localStorage.getItem("currentPatient"));
    return patientData && patientData.status ? patientData.status : "warning";
  }); // Default to "warning" if no status is found

  const [deletedNotes, setDeletedNotes] = useState({});

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
          console.log("Analysis Data Raw:", result.data);
          let transformedData = result.data;
          if (transformedData && transformedData[0] && transformedData[0].result) {
            transformedData = [...transformedData];
            const resultObj = { ...transformedData[0].result };
            ["high", "medium", "low"].forEach(priority => {
              const key = `${priority}_priority_alerts`;
              if (Array.isArray(resultObj[key])) {
                resultObj[key] = resultObj[key].map(alertText => ({
                  id: `${priority}-api-${Math.random().toString(36).substr(2, 9)}`,
                  text: typeof alertText === 'string' ? alertText : (alertText.text || '')
                }));
              }
            });
            transformedData[0].result = resultObj;
          }
          setAnalysisData(transformedData);
        } else {
          console.error(result.message);
        }

        setIsLoadingAnalysis(false);
      }
    };

    fetchAnalysisData();
  }, []);

  const [selectedReport, setSelectedReport] = useState(null);

  // Inline note editing state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Doctor-added new notes per priority section
  const [newNotes, setNewNotes] = useState({ high: [], medium: [], low: [] });
  const [newNoteTexts, setNewNoteTexts] = useState({});

  const addNewNote = (priority) => {
    const id = `new-${priority}-${Date.now()}`;
    setNewNotes((prev) => ({
      ...prev,
      [priority]: [
        ...prev[priority],
        { id, text: "", date: null, saved: false },
      ],
    }));
    setNewNoteTexts((prev) => ({ ...prev, [id]: "" }));
  };

  const saveNewNote = (priority, id) => {
    const text = newNoteTexts[id] || "";
    const date = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setNewNotes((prev) => ({
      ...prev,
      [priority]: prev[priority].map((n) =>
        n.id === id ? { ...n, text, date, saved: true } : n,
      ),
    }));
  };

  const cancelNewNote = (priority, id) => {
    setNewNotes((prev) => ({
      ...prev,
      [priority]: prev[priority].filter((n) => n.id !== id),
    }));
    setNewNoteTexts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const startEditNewNote = (id) => {
    // Re-open a saved new note for editing
    setNewNotes((prev) => {
      const updated = {};
      for (const priority of ["high", "medium", "low"]) {
        updated[priority] = prev[priority].map((n) =>
          n.id === id ? { ...n, saved: false } : n,
        );
      }
      return updated;
    });
  };

  // Static note texts (editable)
  const [staticNotes, setStaticNotes] = useState({
    "high-1":
      "Persistent high-grade fever (38-39°C) in a patient with an implanted pacemaker raises concern for pacemaker-related infection or infective endocarditis.",
    "high-2":
      "Patient has documented severe allergic reaction. Always verify antibiotic alternatives before prescribing.",
    "medium-1":
      "Use of Concor and Forxiga despite no prior history of hypertension or diabetes requires monitoring and indication verification.",
    "medium-2":
      "Liver enzyme ALT slightly elevated at last check. Recommend repeat liver function test in 7 days.",
    "low-1":
      "Medication cost concern addressed. Patient inquired about generic alternatives; current prescription is already generic. Insurance verified.",
  });

  const startEditNote = (id, currentText) => {
    setEditingNoteId(id);
    setEditingNoteText(currentText);
  };

  const saveEditNote = (id, newText) => {
    console.log("Saving note:", id, "with text:", newText);
    if (id.includes("-api-")) {
      const priority = id.split("-")[0];
      setAnalysisData(prev => {
        if (!prev || !prev[0] || !prev[0].result) return prev;
        const newData = [...prev];
        const resultObj = { ...newData[0].result };
        const arrName = `${priority}_priority_alerts`;
        if (resultObj[arrName]) {
          resultObj[arrName] = resultObj[arrName].map(item =>
            item.id === id ? { ...item, text: newText } : item
          );
        }
        newData[0].result = resultObj;
        return newData;
      });
    } else {
      setStaticNotes((prev) => {
        const updated = { ...prev, [id]: newText };
        console.log("Updated staticNotes:", updated);
        return updated;
      });
    }
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

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
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    );
  };

  const handleReportClick = (index) => {
    setSelectedReport(index);
  };

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  const handleChatEnter = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { type: "user", text: chatInput }];
    setChatMessages(newMessages);
    const currentInput = chatInput.toLowerCase();
    setChatInput("");

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

  const openDecisionSupport = () => setIsDecisionModalOpen(true);
  const closeDecisionSupport = () => setIsDecisionModalOpen(false);
  const upgradeToProPlan = () => {
    alert("Redirecting to subscription page...");
    closeDecisionSupport();
    // navigate('/subscription');
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  // Delete alert modal state
  const [isDeleteAlertModalOpen, setIsDeleteAlertModalOpen] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState(null);

  const openDeleteAlertModal = (alertId) => {
    setAlertToDelete(alertId);
    setIsDeleteAlertModalOpen(true);
  };

  const closeDeleteAlertModal = () => {
    setIsDeleteAlertModalOpen(false);
    setAlertToDelete(null);
  };

  const confirmDeleteAlert = () => {
    console.log("[delete-alert] id:", alertToDelete);
    if (alertToDelete && typeof alertToDelete === "string") {
      if (alertToDelete.startsWith("new-")) {
        const parts = alertToDelete.split("-");
        const priority = parts[1];
        cancelNewNote(priority, alertToDelete);
      } else if (alertToDelete.includes("-api-")) {
        const priority = alertToDelete.split("-")[0];
        setAnalysisData(prev => {
          if (!prev || !prev[0] || !prev[0].result) return prev;
          const newData = [...prev];
          const resultObj = { ...newData[0].result };
          const arrName = `${priority}_priority_alerts`;
          if (resultObj[arrName]) {
            resultObj[arrName] = resultObj[arrName].filter(item => item.id !== alertToDelete);
          }
          newData[0].result = resultObj;
          return newData;
        });
      } else {
        setStaticNotes(prev => {
          const next = { ...prev };
          delete next[alertToDelete];
          return next;
        });
        setDeletedNotes(prev => ({ ...prev, [alertToDelete]: true }));
      }
    }
    closeDeleteAlertModal();
  };

  return (
    <div className="pp-scope patient-profile-page">
      <div className="background-layer">
        <div className="ambient-ripple ripple-1"></div>
        <div className="ambient-ripple ripple-2"></div>
        <div className="ambient-ripple ripple-3"></div>
      </div>

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
              <a
                href="#"
                className="nav-item"
                onClick={(e) => {
                  e.preventDefault();
                  openLogoutModal();
                }}
              >
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M10 16l4-4-4-4"></path>
                    <path d="M14 12H8"></path>
                  </svg>
                </span>
                <span>Logout</span>
              </a>
            </div>
          </div>

          <div className="nav-bottom">
            <div
              className="decision-support-card"
              onClick={openDecisionSupport}
            >
              <div
                className="card-header"
                style={{
                  marginBottom: "0px",
                  gap: "10px",
                  paddingBottom: "8px",
                }}
              >
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

      <nav className="top-navbar">
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

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
      />

      {/* Delete Alert Confirmation Modal */}
      {isDeleteAlertModalOpen && (
        <div className="modal-overlay active" onClick={closeDeleteAlertModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDeleteAlertModal}>
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="modal-header">
              <div
                className="modal-icon"
                style={{
                  background:
                    "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  stroke="white"
                  fill="none"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>
              <h2 className="modal-title">Delete alert?</h2>
              <p className="modal-subtitle">
                Are you sure you want to delete this alert?
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="modal-button modal-button-secondary"
                onClick={closeDeleteAlertModal}
              >
                Cancel
              </button>
              <button
                className="modal-button modal-button-primary"
                onClick={confirmDeleteAlert}
                style={{
                  background: "linear-gradient(135deg, #ff4444, #cc0000)",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div
        className="content-layer"
        style={{
          position: "relative",
          zIndex: "1",
          marginLeft: "240px",
          marginTop: "64px",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <header className="patient-header pp-header">
          <div className="patient-identity">
            <div className="patient-main-info">
              <div className="patient-avatar" style={{ borderRadius: "50%" }}>
                NH
              </div>
              <div className="patient-details" style={{ marginBottom: "0px" }}>
                <h1>Nour Hassan</h1>
                <p className="patient-meta">
                  Dr. El-Sayed / National ID: #30410141201075
                </p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: " all 0.3s ease",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  background: "transparent",
                  color: "#2A66FF",
                  border: "1px solid #2A66FF",
                  fontWeight: "bold",
                }}
                onClick={(e) => {
                  navigate("/add-patient");
                }}
              >
                Edit File
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: " all 0.3s ease",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  background: "rgb(42, 102, 255)",
                  color: "white",
                  border: "1px solid #2A66FF",
                  fontWeight: "bold",
                }}
              >
                Start Collaboration
              </button>
            </div>
          </div>
        </header>

        <div className="tabs-bar" style={{ background: "none" }}>
          <div
            className="container"
            style={{ position: "relative", background: "none" }}
          >
            <nav
              className="tab-nav"
              style={{
                width: "96%",
                position: "absolute",
                top: "0",
                "border-radius": "15px",
              }}
            >
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
                className={`tab-btn ${activeTab === "comparative" ? "active" : ""
                  }`}
                onClick={() => handleTabClick("comparative")}
              >
                Comparative Analysis
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
          </div>
        </div>

        <div className="container">
          <div
            className={`tab-content ${activeTab === "overview" ? "active" : ""
              }`}
            id="overview"
          >
            <div className="overview-layout">
              <div className="card smart-summary">
                <div
                  className="card-header"
                  style={{ background: "none", display: "block" }}
                >
                  <h2 className="card-title">
                    <span className="ai-pulse"></span>
                    Smart Summary
                  </h2>
                  <div
                    className="ai-insight"
                    style={{ marginTop: "-10px", marginBottom: "0" }}
                  >
                    <strong>AI Summary:</strong>{" "}
                    {isLoadingAnalysis
                      ? "This 51-year-old male patient presented initially with sudden-onset severe headache and dizziness, later found to be caused by profound bradycardia (HR 21 bpm), requiring pacemaker implantation. After initial improvement, he developed recurrence of symptoms due to pacemaker failure, followed by surgical site infection and persistent high-grade fever. He is currently hospitalized for management of suspected pacemaker-related infection. There is no significant past medical history, no chronic illnesses, and no relevant family history."
                      : analysisData?.[0]?.result?.["ai-summary"] ||
                      "No insights available No insights available No insights available No insights available No insights available No insights available No insights available"}
                  </div>
                </div>

                <div
                  className="critical-info-section"
                  style={{ marginTop: "0" }}
                >
                  <div className="section-header-container">
                    <h3 className="section-header" style={{ marginBottom: 0 }}>
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
                    <div className="status-buttons-group">
                      <span
                        className={`status-badge stable ${selectedStatus !== "stable" ? "inactive" : ""}`}
                        onClick={() => setSelectedStatus("stable")}
                        style={{ cursor: "pointer" }}
                      >
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor: "#00C187",
                            boxShadow: "none",
                            animation: "none",
                          }}
                        ></span>{" "}
                        Stable
                      </span>
                      <span
                        className={`status-badge critical ${selectedStatus !== "critical" ? "inactive" : ""}`}
                        onClick={() => setSelectedStatus("critical")}
                        style={{ cursor: "pointer" }}
                      >
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor: "#FF5C5C",
                            boxShadow: "none",
                            animation: "none",
                          }}
                        ></span>{" "}
                        Critical
                      </span>
                      <span
                        className={`status-badge warning ${selectedStatus !== "warning" ? "inactive" : ""}`}
                        onClick={() => setSelectedStatus("warning")}
                        style={{ cursor: "pointer" }}
                      >
                        <span
                          className="status-dot"
                          style={{
                            backgroundColor: "#FFA500",
                            boxShadow: "none",
                            animation: "none",
                          }}
                        ></span>{" "}
                        Under Review
                      </span>
                    </div>
                  </div>
                  <div className="key-info-grid">
                    {/* Row 1 / Col 1 */}
                    <div className="info-item age-smoker-split">
                      {/* Mini-field A: Age */}
                      <div className="mini-field">
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
                          Age
                        </div>
                        <div className="info-value">47 Years</div>
                      </div>

                      {/* Mini-field B: Smoker */}
                      <div className="mini-field">
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
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <circle cx="12" cy="16" r="1"></circle>
                          </svg>
                          Smoker
                        </div>
                        <div className="info-value">No</div>
                      </div>
                    </div>

                    {/* Row 1 / Col 2 */}
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
                        Chronic Disease
                      </div>
                      <div className="info-value">
                        Type 2 Diabetes, Hypertension
                      </div>
                    </div>

                    {/* Row 2 / Col 1 */}
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
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Previous Surgeries
                      </div>
                      <div className="info-value">Appendectomy (2015)</div>
                    </div>

                    {/* Row 2 / Col 2 */}
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
                        Known Allergies
                      </div>
                      <div className="info-value" style={{ color: "#FF5C5C" }}>
                        Penicillin (Anaphylaxis)
                      </div>
                    </div>

                    {/* Row 3 / Col 1 */}
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
                            x="2"
                            y="7"
                            width="20"
                            height="14"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                        Medications
                      </div>
                      <div className="info-value">
                        Atorvastatin 20mg, Metformin 500mg
                      </div>
                    </div>

                    {/* Row 3 / Col 2 */}
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
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Family Medical History
                      </div>
                      <div className="info-value">Father: Hypertension</div>
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
                  <button
                    className="pp-add-note-btn"
                    onClick={() => addNewNote("high")}
                  >
                    + Add Note
                  </button>
                </div>

                <div className="note-list">
                  {isLoadingAnalysis ? (
                    staticNotes["high-1"] && <div className="note-item high-priority">
                      <div className="pp-note-actions">
                        <button
                          className="pp-note-edit-btn"
                          onClick={() =>
                            startEditNote("high-1", staticNotes["high-1"])
                          }
                          title="Edit"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      </div>
                      {editingNoteId === "high-1" ? (
                        <>
                          <textarea
                            className="pp-note-edit-textarea"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="pp-edit-footer-row">
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">Jan 28, 2026</span>
                                <button
                                  className="pp-evidence-icon-btn"
                                  onClick={() => setIsPanelOpen(true)}
                                  title="View Evidence"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line
                                      x1="21"
                                      y1="21"
                                      x2="16.65"
                                      y2="16.65"
                                    ></line>
                                  </svg>
                                  View Evidence
                                </button>
                              </div>
                            </div>
                            <div className="pp-note-save-row">
                              <button
                                className="pp-note-save-btn"
                                onClick={() =>
                                  saveEditNote("high-1", editingNoteText)
                                }
                              >
                                Save
                              </button>
                              <button
                                className="pp-note-cancel-btn"
                                onClick={cancelEditNote}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="note-text">
                          <strong>Critical:</strong> {staticNotes["high-1"]}
                        </div>
                      )}
                      {editingNoteId !== "high-1" && (
                        <div className="note-footer">
                          <div className="note-meta-stack">
                            <span className="note-date">Jan 28, 2026</span>
                            <button
                              className="pp-evidence-icon-btn"
                              onClick={() => setIsPanelOpen(true)}
                              title="View Evidence"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="11" cy="11" r="8"></circle>
                                <line
                                  x1="21"
                                  y1="21"
                                  x2="16.65"
                                  y2="16.65"
                                ></line>
                              </svg>
                              View Evidence
                            </button>
                          </div>
                          <button
                            className="pp-note-delete-btn"
                            onClick={() => openDeleteAlertModal("high-1")}
                            title="Delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : analysisData?.[0]?.result?.high_priority_alerts?.length >
                    0 ? (
                    analysisData[0].result.high_priority_alerts.map(
                      (alertObj) => {
                        const noteId = alertObj.id;
                        const alert = alertObj.text;
                        return (
                          <div className="note-item high-priority" key={noteId}>
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() => startEditNote(noteId, alert)}
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                            {editingNoteId === noteId ? (
                              <>
                                <textarea
                                  className="pp-note-edit-textarea"
                                  value={editingNoteText}
                                  onChange={(e) =>
                                    setEditingNoteText(e.target.value)
                                  }
                                  autoFocus
                                />
                                <div className="pp-edit-footer-row">
                                  <div className="note-footer">
                                    <div className="note-meta-stack">
                                      <span className="note-date">
                                        🤖 AI Analysis ·{" "}
                                        {new Date().toLocaleDateString()}
                                      </span>
                                      <button
                                        className="pp-evidence-icon-btn"
                                        onClick={() => setIsPanelOpen(true)}
                                        title="View Evidence"
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <circle
                                            cx="11"
                                            cy="11"
                                            r="8"
                                          ></circle>
                                          <line
                                            x1="21"
                                            y1="21"
                                            x2="16.65"
                                            y2="16.65"
                                          ></line>
                                        </svg>
                                        View Evidence
                                      </button>
                                    </div>
                                  </div>
                                  <div className="pp-note-save-row">
                                    <button className="pp-note-save-btn" onClick={() => saveEditNote(noteId, editingNoteText)}>Save</button>
                                    <button className="pp-note-cancel-btn" onClick={cancelEditNote}>Cancel</button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="note-text">
                                <strong>Critical: </strong> {alert}
                              </div>
                            )}
                            {editingNoteId !== noteId && (
                              <div className="note-footer">
                                <div className="note-meta-stack">
                                  <span className="note-date">
                                    🤖 AI Analysis ·{" "}
                                    {new Date().toLocaleDateString()}
                                  </span>
                                  <button
                                    className="pp-evidence-icon-btn"
                                    onClick={() => setIsPanelOpen(true)}
                                    title="View Evidence"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="11" cy="11" r="8"></circle>
                                      <line
                                        x1="21"
                                        y1="21"
                                        x2="16.65"
                                        y2="16.65"
                                      ></line>
                                    </svg>
                                    View Evidence
                                  </button>
                                </div>
                                <button
                                  className="pp-note-delete-btn"
                                  onClick={() => openDeleteAlertModal(noteId)}
                                  title="Delete"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )
                  ) : (
                    <>
                      {staticNotes["high-1"] && (
                        <div className="note-item high-priority">
                          <div className="pp-note-actions">
                            <button
                              className="pp-note-edit-btn"
                              onClick={() => startEditNote("high-1", staticNotes["high-1"])}
                              title="Edit"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                          {editingNoteId === "high-1" ? (
                            <>
                              <textarea
                                className="pp-note-edit-textarea"
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                autoFocus
                              />
                              <div className="pp-edit-footer-row">
                                <div className="note-footer">
                                  <div className="note-meta-stack">
                                    <span className="note-date">Jan 28, 2026</span>
                                    <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                      </svg>
                                      View Evidence
                                    </button>
                                  </div>
                                </div>
                                <div className="pp-note-save-row">
                                  <button className="pp-note-save-btn" onClick={() => saveEditNote("high-1", editingNoteText)}>Save</button>
                                  <button className="pp-note-cancel-btn" onClick={cancelEditNote}>Cancel</button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="note-text">
                              <strong>Critical:</strong> {staticNotes["high-1"]}
                            </div>
                          )}
                          {editingNoteId !== "high-1" && (
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">Jan 28, 2026</span>
                                <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                  </svg>
                                  View Evidence
                                </button>
                              </div>
                              <button
                                className="pp-note-delete-btn"
                                onClick={() => openDeleteAlertModal("high-1")}
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {staticNotes["high-2"] && (
                        <div className="note-item high-priority">
                          <div className="pp-note-actions">
                            <button
                              className="pp-note-edit-btn"
                              onClick={() => startEditNote("high-2", staticNotes["high-2"])}
                              title="Edit"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                          {editingNoteId === "high-2" ? (
                            <>
                              <textarea
                                className="pp-note-edit-textarea"
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                autoFocus
                              />
                              <div className="pp-edit-footer-row">
                                <div className="note-footer">
                                  <div className="note-meta-stack">
                                    <span className="note-date">⚠️ Critical Medical Alert · Permanent Record</span>
                                    <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                      </svg>
                                      View Evidence
                                    </button>
                                  </div>
                                </div>
                                <div className="pp-note-save-row">
                                  <button className="pp-note-save-btn" onClick={() => saveEditNote("high-2", editingNoteText)}>Save</button>
                                  <button className="pp-note-cancel-btn" onClick={cancelEditNote}>Cancel</button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="note-text">
                              <strong>Penicillin Allergy:</strong> {staticNotes["high-2"]}
                            </div>
                          )}
                          {editingNoteId !== "high-2" && (
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">⚠️ Critical Medical Alert · Permanent Record</span>
                                <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                  </svg>
                                  View Evidence
                                </button>
                              </div>
                              <button
                                className="pp-note-delete-btn"
                                onClick={() => openDeleteAlertModal("high-2")}
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {/* Doctor-added new notes for High Priority */}
                  {newNotes.high.map((note) => (
                    <div className="note-item high-priority" key={note.id}>
                      {note.saved ? (
                        <>
                          <div className="pp-note-actions">
                            <button
                              className="pp-note-edit-btn"
                              onClick={() => startEditNewNote(note.id)}
                              title="Edit"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                          <div className="note-text">{note.text}</div>
                          <div className="note-footer">
                            <div className="note-meta-stack">
                              <span className="note-date">{note.date}</span>
                            </div>
                            <button
                              className="pp-note-delete-btn"
                              onClick={() => openDeleteAlertModal(note.id)}
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <textarea
                            className="pp-note-edit-textarea"
                            value={newNoteTexts[note.id] || ""}
                            onChange={(e) =>
                              setNewNoteTexts((prev) => ({
                                ...prev,
                                [note.id]: e.target.value,
                              }))
                            }
                            autoFocus
                            placeholder="Type your note here…"
                          />
                          <div className="pp-edit-footer-row">
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                            </div>
                            <div className="pp-note-save-row">
                              <button
                                className="pp-note-save-btn"
                                onClick={() => saveNewNote("high", note.id)}
                              >
                                Save
                              </button>
                              <button
                                className="pp-note-cancel-btn"
                                onClick={() => cancelNewNote("high", note.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon medium"></span>
                    Medium Priority Alerts
                  </h3>
                  <button
                    className="pp-add-note-btn"
                    onClick={() => addNewNote("medium")}
                  >
                    + Add Note
                  </button>
                </div>
                <div className="note-list">
                  {staticNotes["medium-1"] && (
                    <div className="note-item medium-priority">
                      <div className="pp-note-actions">
                        <button
                          className="pp-note-edit-btn"
                          onClick={() => startEditNote("medium-1", staticNotes["medium-1"])}
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      </div>
                      {editingNoteId === "medium-1" ? (
                        <>
                          <textarea
                            className="pp-note-edit-textarea"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="pp-edit-footer-row">
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">Jan 30, 2026</span>
                                <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                  </svg>
                                  View Evidence
                                </button>
                              </div>
                            </div>
                            <div className="pp-note-save-row">
                              <button className="pp-note-save-btn" onClick={() => saveEditNote("medium-1", editingNoteText)}>Save</button>
                              <button className="pp-note-cancel-btn" onClick={cancelEditNote}>Cancel</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="note-text">
                          <strong>Medication review:</strong> {staticNotes["medium-1"]}
                        </div>
                      )}
                      {editingNoteId !== "medium-1" && (
                        <div className="note-footer">
                          <div className="note-meta-stack">
                            <span className="note-date">Jan 30, 2026</span>
                            <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                              </svg>
                              View Evidence
                            </button>
                          </div>
                          <button
                            className="pp-note-delete-btn"
                            onClick={() => openDeleteAlertModal("medium-1")}
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {staticNotes["medium-2"] && (
                    <div className="note-item medium-priority">
                      <div className="pp-note-actions">
                        <button
                          className="pp-note-edit-btn"
                          onClick={() => startEditNote("medium-2", staticNotes["medium-2"])}
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      </div>
                      {editingNoteId === "medium-2" ? (
                        <>
                          <textarea
                            className="pp-note-edit-textarea"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="pp-edit-footer-row">
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">Jan 25, 2026</span>
                                <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                  </svg>
                                  View Evidence
                                </button>
                              </div>
                            </div>
                            <div className="pp-note-save-row">
                              <button className="pp-note-save-btn" onClick={() => saveEditNote("medium-2", editingNoteText)}>Save</button>
                              <button className="pp-note-cancel-btn" onClick={cancelEditNote}>Cancel</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="note-text">
                          <strong>Lab follow-up:</strong> {staticNotes["medium-2"]}
                        </div>
                      )}
                      {editingNoteId !== "medium-2" && (
                        <div className="note-footer">
                          <div className="note-meta-stack">
                            <span className="note-date">Jan 25, 2026</span>
                            <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                              </svg>
                              View Evidence
                            </button>
                          </div>
                          <button
                            className="pp-note-delete-btn"
                            onClick={() => openDeleteAlertModal("medium-2")}
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Doctor-added new notes for Medium Priority */}
                  {newNotes.medium.map((note) => (
                    <div className="note-item medium-priority" key={note.id}>
                      {note.saved ? (
                        <>
                          <div className="pp-note-actions">
                            <button
                              className="pp-note-edit-btn"
                              onClick={() => startEditNewNote(note.id)}
                              title="Edit"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                          <div className="note-text">{note.text}</div>
                          <div className="note-footer">
                            <div className="note-meta-stack">
                              <span className="note-date">{note.date}</span>
                            </div>
                            <button
                              className="pp-note-delete-btn"
                              onClick={() => openDeleteAlertModal(note.id)}
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <textarea
                            className="pp-note-edit-textarea"
                            value={newNoteTexts[note.id] || ""}
                            onChange={(e) =>
                              setNewNoteTexts((prev) => ({
                                ...prev,
                                [note.id]: e.target.value,
                              }))
                            }
                            autoFocus
                            placeholder="Type your note here…"
                          />
                          <div className="pp-edit-footer-row">
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                            </div>
                            <div className="pp-note-save-row">
                              <button
                                className="pp-note-save-btn"
                                onClick={() => saveNewNote("medium", note.id)}
                              >
                                Save
                              </button>
                              <button
                                className="pp-note-cancel-btn"
                                onClick={() => cancelNewNote("medium", note.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="priority-card">
                <div className="priority-header">
                  <h3 className="priority-title">
                    <span className="priority-icon low"></span>
                    Low Priority Alerts
                  </h3>
                  <button
                    className="pp-add-note-btn"
                    onClick={() => addNewNote("low")}
                  >
                    + Add Note
                  </button>
                </div>

                <div className="note-list">
                  {isLoadingAnalysis ? (
                    staticNotes["low-1"] && <div className="note-item low-priority">
                      <div className="pp-note-actions">
                        <button
                          className="pp-note-edit-btn"
                          onClick={() =>
                            startEditNote("low-1", staticNotes["low-1"])
                          }
                          title="Edit"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      </div>
                      {editingNoteId === "low-1" ? (
                        <>
                          <textarea
                            className="pp-note-edit-textarea"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="pp-edit-footer-row">
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">Oct 10, 2025</span>
                                <button
                                  className="pp-evidence-icon-btn"
                                  onClick={() => setIsPanelOpen(true)}
                                  title="View Evidence"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line
                                      x1="21"
                                      y1="21"
                                      x2="16.65"
                                      y2="16.65"
                                    ></line>
                                  </svg>
                                  View Evidence
                                </button>
                              </div>
                            </div>
                            <div className="pp-note-save-row">
                              <button
                                className="pp-note-save-btn"
                                onClick={() => saveEditNote("low-1", editingNoteText)}
                              >
                                Save
                              </button>
                              <button
                                className="pp-note-cancel-btn"
                                onClick={cancelEditNote}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="note-text">
                          <strong>Note:</strong> {staticNotes["low-1"]}
                        </div>
                      )}
                      {editingNoteId !== "low-1" && (
                        <div className="note-footer">
                          <div className="note-meta-stack">
                            <span className="note-date">Oct 10, 2025</span>
                            <button
                              className="pp-evidence-icon-btn"
                              onClick={() => setIsPanelOpen(true)}
                              title="View Evidence"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="11" cy="11" r="8"></circle>
                                <line
                                  x1="21"
                                  y1="21"
                                  x2="16.65"
                                  y2="16.65"
                                ></line>
                              </svg>
                              View Evidence
                            </button>
                          </div>
                          <button
                            className="pp-note-delete-btn"
                            onClick={() => openDeleteAlertModal("low-1")}
                            title="Delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : analysisData?.[0]?.result?.low_priority_alerts?.length >
                    0 ? (
                    analysisData[0].result.low_priority_alerts.map(
                      (alertObj) => {
                        const noteId = alertObj.id;
                        const alert = alertObj.text;
                        return (
                          <div className="note-item low-priority" key={noteId}>
                            <div className="pp-note-actions">
                              <button
                                className="pp-note-edit-btn"
                                onClick={() => startEditNote(noteId, alert)}
                                title="Edit"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                            {editingNoteId === noteId ? (
                              <>
                                <textarea
                                  className="pp-note-edit-textarea"
                                  value={editingNoteText}
                                  onChange={(e) =>
                                    setEditingNoteText(e.target.value)
                                  }
                                  autoFocus
                                />
                                <div className="pp-edit-footer-row">
                                  <div className="note-footer">
                                    <div className="note-meta-stack">
                                      <span className="note-date">
                                        ℹ️ AI Suggestion ·{" "}
                                        {new Date().toLocaleDateString()}
                                      </span>
                                      <button
                                        className="pp-evidence-icon-btn"
                                        onClick={() => setIsPanelOpen(true)}
                                        title="View Evidence"
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <circle
                                            cx="11"
                                            cy="11"
                                            r="8"
                                          ></circle>
                                          <line
                                            x1="21"
                                            y1="21"
                                            x2="16.65"
                                            y2="16.65"
                                          ></line>
                                        </svg>
                                        View Evidence
                                      </button>
                                    </div>
                                  </div>
                                  <div className="pp-note-save-row">
                                    <button className="pp-note-save-btn" onClick={() => saveEditNote(noteId, editingNoteText)}>Save</button>
                                    <button className="pp-note-cancel-btn" onClick={cancelEditNote}>Cancel</button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="note-text">
                                <strong>Note: </strong> {alert}
                              </div>
                            )}
                            {editingNoteId !== noteId && (
                              <div className="note-footer">
                                <div className="note-meta-stack">
                                  <span className="note-date">
                                    ℹ️ AI Suggestion ·{" "}
                                    {new Date().toLocaleDateString()}
                                  </span>
                                  <button
                                    className="pp-evidence-icon-btn"
                                    onClick={() => setIsPanelOpen(true)}
                                    title="View Evidence"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="11" cy="11" r="8"></circle>
                                      <line
                                        x1="21"
                                        y1="21"
                                        x2="16.65"
                                        y2="16.65"
                                      ></line>
                                    </svg>
                                    View Evidence
                                  </button>
                                </div>
                                <button
                                  className="pp-note-delete-btn"
                                  onClick={() => openDeleteAlertModal(noteId)}
                                  title="Delete"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )
                  ) : (
                    <>
                      {staticNotes["low-1"] && (
                        <div className="note-item low-priority">
                          <div className="pp-note-actions">
                            <button
                              className="pp-note-edit-btn"
                              onClick={() => startEditNote("low-1", staticNotes["low-1"])}
                              title="Edit"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                          {editingNoteId === "low-1" ? (
                            <>
                              <textarea
                                className="pp-note-edit-textarea"
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                autoFocus
                              />
                              <div className="pp-edit-footer-row">
                                <div className="note-footer">
                                  <div className="note-meta-stack">
                                    <span className="note-date">Oct 10, 2025</span>
                                    <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                      </svg>
                                      View Evidence
                                    </button>
                                  </div>
                                </div>
                                <div className="pp-note-save-row">
                                  <button className="pp-note-save-btn" onClick={() => saveEditNote("low-1", editingNoteText)}>Save</button>
                                  <button className="pp-note-cancel-btn" onClick={cancelEditNote}>Cancel</button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="note-text">
                              <strong>Note:</strong> {staticNotes["low-1"]}
                            </div>
                          )}
                          {editingNoteId !== "low-1" && (
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">Oct 10, 2025</span>
                                <button className="pp-evidence-icon-btn" onClick={() => setIsPanelOpen(true)} title="View Evidence">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                  </svg>
                                  View Evidence
                                </button>
                              </div>
                              <button
                                className="pp-note-delete-btn"
                                onClick={() => openDeleteAlertModal("low-1")}
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {/* Doctor-added new notes for Low Priority */}
                  {newNotes.low.map((note) => (
                    <div className="note-item low-priority" key={note.id}>
                      {note.saved ? (
                        <>
                          <div className="pp-note-actions">
                            <button
                              className="pp-note-edit-btn"
                              onClick={() => startEditNewNote(note.id)}
                              title="Edit"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                          <div className="note-text">{note.text}</div>
                          <div className="note-footer">
                            <div className="note-meta-stack">
                              <span className="note-date">{note.date}</span>
                            </div>
                            <button
                              className="pp-note-delete-btn"
                              onClick={() => openDeleteAlertModal(note.id)}
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <textarea
                            className="pp-note-edit-textarea"
                            value={newNoteTexts[note.id] || ""}
                            onChange={(e) =>
                              setNewNoteTexts((prev) => ({
                                ...prev,
                                [note.id]: e.target.value,
                              }))
                            }
                            autoFocus
                            placeholder="Type your note here…"
                          />
                          <div className="pp-edit-footer-row">
                            <div className="note-footer">
                              <div className="note-meta-stack">
                                <span className="note-date">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                            </div>
                            <div className="pp-note-save-row">
                              <button
                                className="pp-note-save-btn"
                                onClick={() => saveNewNote("low", note.id)}
                              >
                                Save
                              </button>
                              <button
                                className="pp-note-cancel-btn"
                                onClick={() => cancelNewNote("low", note.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`tab-content ${activeTab === "comparative" ? "active" : ""
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
              </div>
            </div>
          </div>

          {/* Decision Support Tab */}
          <div
            className={`tab-content ${activeTab === "decision" ? "active" : ""
              }`}
            id="decision"
          >
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: "20px" }}>
                <span className="ai-pulse"></span>
                AI-Powered Decision Support
              </h2>
              <div className="likelihood-stack">
                {isLoadingAnalysis ||
                  !(
                    analysisData?.[0]?.result?.likely_diagnoses?.high_likelihood
                      ?.length > 0 ||
                    analysisData?.[0]?.result?.likely_diagnoses?.possible
                      ?.length > 0 ||
                    analysisData?.[0]?.result?.likely_diagnoses?.low_likelihood
                      ?.length > 0
                  ) ? (
                  <>
                    <div
                      className={`likelihood-card high ${expandedLikelihoods["static-0"] ? "expanded" : ""}`}
                      onClick={() => toggleLikelihood("static-0")}
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
                            Pacemaker-related infection (device or lead
                            infection)
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{ color: "#FF5C5C" }}
                        >
                          94%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Based on elevated
                        ALT (48 U/L), BMI 29.4, cholesterol trend showing mild
                        elevation, and ultrasound findings consistent with fatty
                        infiltration. Patient's metabolic profile and lifestyle
                        factors support this diagnosis.
                      </div>
                    </div>
                    <div
                      className={`likelihood-card high ${expandedLikelihoods["static-1"] ? "expanded" : ""}`}
                      onClick={() => toggleLikelihood("static-1")}
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
                            Symptomatic sinus node dysfunction or high-grade AV
                            block
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{ color: "#FF5C5C" }}
                        >
                          76%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Elevated fasting
                        glucose (102 mg/dL), HbA1c at 6.1%, central obesity (BMI
                        29.4), and history of Type 2 Diabetes suggest ongoing
                        insulin resistance despite treatment. Recommend insulin
                        sensitivity assessment.
                      </div>
                    </div>
                    <div
                      className={`likelihood-card medium ${expandedLikelihoods["static-2"] ? "expanded" : ""}`}
                      onClick={() => toggleLikelihood("static-2")}
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
                            POSSIBLE
                          </div>
                          <div className="likelihood-title">
                            Infective endocarditis related to pacemaker leads
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{ color: "#FFA500" }}
                        >
                          5%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Patient presents
                        with 3 of 5 criteria: elevated fasting glucose (102
                        mg/dL), increased waist circumference, and dyslipidemia.
                        Blood pressure has normalized with treatment. Requires
                        continued monitoring.
                      </div>
                    </div>
                    <div
                      className={`likelihood-card medium ${expandedLikelihoods["static-3"] ? "expanded" : ""}`}
                      onClick={() => toggleLikelihood("static-3")}
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
                            POSSIBLE
                          </div>
                          <div className="likelihood-title">
                            Systemic bacterial infection secondary to surgical
                            site infection
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{ color: "#FFA500" }}
                        >
                          3%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Multiple risk
                        factors present including diabetes, hypertension
                        (controlled), dyslipidemia, and overweight status.
                        10-year cardiovascular risk score suggests moderate
                        elevation. Lifestyle modifications showing positive
                        effect.
                      </div>
                    </div>
                    <div
                      className={`likelihood-card low ${expandedLikelihoods["static-4"] ? "expanded" : ""}`}
                      onClick={() => toggleLikelihood("static-4")}
                    >
                      <div className="likelihood-header">
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#8A94A6",
                              marginBottom: "3px",
                              fontWeight: 600,
                            }}
                          >
                            LOW LIKELIHOOD
                          </div>
                          <div className="likelihood-title">
                            Primary neurological disorder causing headache and
                            dizziness
                          </div>
                        </div>
                        <div
                          className="confidence"
                          style={{ color: "#8A94A6" }}
                        >
                          1%
                        </div>
                      </div>
                      <div className="reasoning">
                        <strong>Clinical Reasoning:</strong> Negative hepatitis
                        panel from previous testing. ALT elevation is mild and
                        pattern more consistent with metabolic causes. No risk
                        factors or symptoms suggestive of viral infection.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 1. High Likelihood Section (Red) */}
                    {analysisData?.[0]?.result?.likely_diagnoses?.high_likelihood?.map(
                      (item, index) => (
                        <div
                          key={`high-${index}`}
                          className={`likelihood-card high ${expandedLikelihoods[`high-${index}`]
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
                      ),
                    )}

                    {/* 2. Possible Diagnoses Section (Orange) */}
                    {analysisData?.[0]?.result?.likely_diagnoses?.possible?.map(
                      (item, index) => (
                        <div
                          key={`poss-${index}`}
                          className={`likelihood-card medium ${expandedLikelihoods[`poss-${index}`]
                            ? "expanded"
                            : ""
                            }`}
                          onClick={() => toggleLikelihood(`poss-${index}`)}
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
                      ),
                    )}

                    {/* 3. Low Likelihood Section (Blue/Grey) */}
                    {analysisData?.[0]?.result?.likely_diagnoses?.low_likelihood?.map(
                      (item, index) => (
                        <div
                          key={`low-${index}`}
                          className={`likelihood-card low ${expandedLikelihoods[`low-${index}`]
                            ? "expanded"
                            : ""
                            }`}
                          onClick={() => toggleLikelihood(`low-${index}`)}
                        >
                          <div className="likelihood-header">
                            <div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#8A94A6",
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
                              style={{ color: "#8A94A6" }}
                            >
                              {item.probability}
                            </div>
                          </div>
                          <div className="reasoning">
                            <strong>AI Analysis:</strong> Considered unlikely
                            but monitored for differential diagnosis exclusion.
                          </div>
                        </div>
                      ),
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
            className={`tab-content ${activeTab === "activity" ? "active" : ""
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
      <EvidencePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  );
};

export default PatientProfile;
