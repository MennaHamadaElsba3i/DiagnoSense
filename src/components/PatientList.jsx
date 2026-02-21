import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Logo_Diagnoo.png";
import "../css/PatientList.css";

const PatientList = () => {
    const navigate = useNavigate(); 
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const patients = [
    {
      id: 1,
      initials: "NH",
      name: "Nour Hassan",
      age: 47,
      condition: "Type II Diabetes",
      status: "stable",
      statusLabel: "🟢 Stable",
      aiInsight: "Stable. 2 new lab results added today.",
      lastVisit: "Oct 23, 2025",
      nextAppointment: "Nov 2, 2025",
      gradient: "linear-gradient(135deg, #467DFF, #2A66FF)",
    },
    {
      id: 2,
      initials: "RE",
      name: "Rana ElSayed",
      age: 33,
      condition: "Hypertension",
      status: "critical",
      statusLabel: "🔴 Critical",
      aiInsight: "Possible irregularity detected.",
      lastVisit: "Oct 29, 2025",
      nextAppointment: "Today",
      gradient: "linear-gradient(135deg, #FF5C5C, #FF8A8A)",
      insightStyle: { borderLeftColor: "#FF5C5C", background: "#FFECEC" },
    },
    {
      id: 3,
      initials: "OT",
      name: "Omar Tarek",
      age: 52,
      condition: "Post-surgery Recovery",
      status: "stable",
      statusLabel: "🟡 Under Review",
      statusType: "warning",
      aiInsight: "No new complications.",
      lastVisit: "Oct 26, 2025",
      nextAppointment: "Nov 5, 2025",
      gradient: "linear-gradient(135deg, #FFA500, #FFB84D)",
      insightStyle: { borderLeftColor: "#FFA500" },
    },
    {
      id: 4,
      initials: "MH",
      name: "Mariam Hassan",
      age: 41,
      condition: "Asthma",
      status: "stable",
      statusLabel: "🟢 Stable",
      aiInsight: "Improving after medication adjustment.",
      lastVisit: "Oct 25, 2025",
      nextAppointment: "Nov 8, 2025",
      gradient: "linear-gradient(135deg, #00C187, #00E5A0)",
    },
    {
      id: 5,
      initials: "KH",
      name: "Khaled Hassan",
      age: 61,
      condition: "Chronic Heart Disease",
      status: "stable",
      statusLabel: "🟢 Stable",
      aiInsight: "Medication adherence excellent. Vitals within normal range.",
      lastVisit: "Oct 27, 2025",
      nextAppointment: "Nov 3, 2025",
      gradient: "linear-gradient(135deg, #467DFF, #6B9FFF)",
    },
    {
      id: 6,
      initials: "LI",
      name: "Layla Ibrahim",
      age: 29,
      condition: "Pre-diabetes Management",
      status: "stable",
      statusLabel: "🟢 Stable",
      aiInsight: "Excellent progress. Diet and exercise plan working well.",
      lastVisit: "Oct 20, 2025",
      nextAppointment: "Nov 10, 2025",
      gradient: "linear-gradient(135deg, #9D5CFF, #B380FF)",
    },
    {
      id: 7,
      initials: "YM",
      name: "Youssef Mansour",
      age: 55,
      condition: "Arthritis",
      status: "stable",
      statusLabel: "🟢 Stable",
      aiInsight: "Pain management effective. Mobility improving.",
      lastVisit: "Oct 24, 2025",
      nextAppointment: "Nov 7, 2025",
      gradient: "linear-gradient(135deg, #2A66FF, #5A8BFF)",
    },
    {
      id: 8,
      initials: "NK",
      name: "Nadia Khalil",
      age: 44,
      condition: "Migraine",
      status: "stable",
      statusLabel: "🟢 Stable",
      aiInsight: "Frequency reduced by 60%. Treatment effective.",
      lastVisit: "Oct 21, 2025",
      nextAppointment: "Nov 11, 2025",
      gradient: "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
    },
    {
      id: 9,
      initials: "SF",
      name: "Samir Farid",
      age: 48,
      condition: "Sleep Apnea",
      status: "stable",
      statusLabel: "🟢 Stable",
      aiInsight: "CPAP therapy showing positive results.",
      lastVisit: "Oct 28, 2025",
      nextAppointment: "Nov 14, 2025",
      gradient: "linear-gradient(135deg, #00C9A7, #00E5C0)",
    },
  ];

  const filteredPatients = patients.filter((patient) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "critical" && patient.status === "critical") ||
      (activeFilter === "stable" && patient.status === "stable") ||
      activeFilter === "updates" ||
      activeFilter === "discharged";

    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const openDecisionSupport = () => setShowModal(true);
  const closeDecisionSupport = () => setShowModal(false);
  const upgradeToProPlan = () => {
    alert("Redirecting to subscription page...");
    closeDecisionSupport();
  };

  return (
    <>
      <div className="background-pattern"></div>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text">
            <img src={logo} alt="" />
          </span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-main">
            <div className="nav-section">
              <div className="nav-section-title">Main</div>
              <a href="[Final] Dashboard.html" className="nav-item" onClick={(e) => {
                  e.preventDefault();
                  navigate("/dashboard");
                }}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </span>
                <span>Overview</span>
              </a>
              <a href="[Final] Patient List.html" className="nav-item active">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <span>Patients</span>
              </a>
              <a href="[Final] Subscription.html" className="nav-item">
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
              </a>
              <a href="[Final] Support.html" className="nav-item">
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </span>
                <span>Support</span>
              </a>
            </div>
          </div>

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
            style={{padding:"12px 16px 12px 44px"}}
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
                  strokeWidth: 2,
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

          <div
            className="user-avatar"
            onClick={() =>
              (window.location.href = "[semiFinalAwy] Settings.html")
            }
          >
            LA
          </div>
        </div>
      </nav>

      {showModal && (
        <div
          className="modal-overlay active"
          onClick={(e) =>
            e.target.className.includes("modal-overlay") &&
            closeDecisionSupport()
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
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
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
                Decision Support system. Get intelligent recommendations based
                on patient data, symptoms, and medical history.
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
      )}

      <div className="main-content">
        <div className="page-header">
          <div className="head">
            <div className="title">
              <h1>Patient List</h1>
              <p className="page-header-subtitle">
                Manage and review all patients with real-time AI updates and
                insights.
              </p>
            </div>
            <div className="addbtn">
              <i className="fa-solid fa-user-plus"></i>
              <a href="[Final] Add Patient.html" onClick={(e) => {
                  e.preventDefault();
                  navigate("/addpatient");
                }}>Add New Paitent</a>
            </div>
          </div>

          <div className="page-search-container">
            <svg
              className="page-search-icon"
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
              className="page-search"
              style={{padding:"12px 16px 12px 44px"}}
              placeholder="Search by name, ID, or condition…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-chips">
            <div
              className={`chip ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All Patients
            </div>
            <div
              className={`chip ${activeFilter === "critical" ? "active" : ""}`}
              onClick={() => setActiveFilter("critical")}
            >
              Critical
            </div>
            <div
              className={`chip ${activeFilter === "stable" ? "active" : ""}`}
              onClick={() => setActiveFilter("stable")}
            >
              Stable
            </div>
            <div
              className={`chip ${activeFilter === "updates" ? "active" : ""}`}
              onClick={() => setActiveFilter("updates")}
            >
              New Updates
            </div>
            <div
              className={`chip ${
                activeFilter === "discharged" ? "active" : ""
              }`}
              onClick={() => setActiveFilter("discharged")}
            >
              Discharged
            </div>
          </div>
        </div>

        <div className="patient-grid">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="patient-card"
              data-status={patient.status}
              data-patient={patient.name}
            >
              <div className="patient-header">
                <div
                  className="patient-avatar"
                  style={{ background: patient.gradient }}
                >
                  {patient.initials}
                </div>
                <div className="patient-info">
                  <h3>{patient.name}</h3>
                  <p className="patient-meta">
                    Age: {patient.age} • {patient.condition}
                  </p>
                  <span
                    className={`status-badge ${
                      patient.statusType || patient.status
                    }`}
                  >
                    {patient.statusLabel}
                  </span>
                </div>
              </div>
              <div className="ai-insight" style={patient.insightStyle}>
                <p>
                  <strong>AI Insight:</strong> {patient.aiInsight}
                </p>
              </div>
              <div className="patient-details">
                <div className="detail-row">
                  <span className="detail-label">Last Visit</span>
                  <span className="detail-value">{patient.lastVisit}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Next Appointment</span>
                  <span className="detail-value">
                    {patient.nextAppointment}
                  </span>
                </div>
              </div>
              <div className="pa">
                <div className="patient-actions">
                  <button
                    className="btn btn-primary"
                    style={{display:"inline"}}
                     onClick={(e) => {
                  
                  navigate("/patient-profile");
                }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pagination">
          <button disabled>◂ Prev</button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <button>Next ▸</button>
        </div>
      </div>
    </>
  );
};

export default PatientList;
