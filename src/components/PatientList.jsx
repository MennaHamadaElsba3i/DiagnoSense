import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Logo_Diagnoo.png";
import "../css/PatientList.css";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import { getPatientsAPI } from "./mockAPI";

const PatientList = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [allPatients, setAllPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const gridRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const observer = new ResizeObserver(() => {
      if (gridRef.current && cardRef.current) {
        const gridWidth = gridRef.current.clientWidth;
        const cardWidth = cardRef.current.offsetWidth;
        const computedStyle = window.getComputedStyle(gridRef.current);
        const gapString = computedStyle.columnGap || computedStyle.gap;
        const gap = parseFloat(gapString) || 24;

        const columns = Math.max(1, Math.floor((gridWidth + gap) / (cardWidth + gap)));
        const newPageSize = columns * 3;

        console.log("columns:", columns);
        console.log("pageSize:", newPageSize);

        setPageSize((prev) => (prev !== newPageSize ? newPageSize : prev));
      }
    });

    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [allPatients.length]);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      const res = await getPatientsAPI();

      if (res.success === false) {
        setError(res.message || "Failed to load patients");
        setLoading(false);
        return;
      }

      let rawPatients = [];
      if (res?.data?.data?.patients && Array.isArray(res.data.data.patients)) {
        rawPatients = res.data.data.patients;
      } else if (Array.isArray(res?.data?.data)) {
        rawPatients = res.data.data;
      } else if (Array.isArray(res?.data)) {
        rawPatients = res.data;
      } else if (Array.isArray(res)) {
        rawPatients = res;
      }

      const gradients = [
        "linear-gradient(135deg, #467DFF, #2A66FF)",
        "linear-gradient(135deg, #FF5C5C, #FF8A8A)",
        "linear-gradient(135deg, #FFA500, #FFB84D)",
        "linear-gradient(135deg, #00C187, #00E5A0)",
        "linear-gradient(135deg, #9D5CFF, #B380FF)",
        "linear-gradient(135deg, #2A66FF, #5A8BFF)",
        "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
        "linear-gradient(135deg, #00C9A7, #00E5C0)"
      ];

      const mappedPatients = rawPatients.map((p, index) => {
        let status = p.status ? p.status.toLowerCase() : "stable";
        let statusLabel = "🟢 Stable";
        let statusType = "";
        let insightStyle = {};

        if (status === "critical") {
          statusLabel = "🔴 Critical";
          insightStyle = { borderLeftColor: "#FF5C5C", background: "#FFECEC" };
        } else if (status === "under review" || status === "underreview" || status === "warning") {
          status = "underReview";
          statusLabel = "🟡 Under Review";
          statusType = "warning";
          insightStyle = { borderLeftColor: "#FFA500" };
        }

        const nameParts = p.name ? p.name.split(" ") : ["U", "N"];
        let initials = "UN";
        if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
          initials = `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
        } else if (p.name && p.name.length >= 2) {
          initials = p.name.substring(0, 2).toUpperCase();
        }

        return {
          id: p.id || index,
          initials: p.initials || initials,
          name: p.name || "Unknown Patient",
          age: p.age || "N/A",
          condition: p.condition || p.disease || "Not specified",
          status: status,
          statusLabel: statusLabel,
          statusType: statusType,
          aiInsight: p.aiInsight || p.ai_insight || "No new insights available.",
          lastVisit: p.lastVisit || p.last_visit || "N/A",
          nextAppointment: p.nextAppointment || p.next_appointment || "N/A",
          gradient: p.gradient || gradients[index % gradients.length],
          insightStyle: insightStyle,
        };
      });

      setAllPatients(mappedPatients);
      setLoading(false);
    };

    fetchPatients();
  }, []);

  const filteredPatients = allPatients.filter((patient) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "critical" && patient.status === "critical") ||
      (activeFilter === "stable" && patient.status === "stable") ||
      (activeFilter === "underReview" && patient.statusType === "warning");

    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const start = (safeCurrentPage - 1) * pageSize;
  const end = start + pageSize;
  const visiblePatients = filteredPatients.slice(start, end);

  console.log("columns:", Math.max(1, Math.floor(pageSize / 3)));
  console.log("pageSize:", pageSize);
  console.log("visible:", visiblePatients.length);

  const openDecisionSupport = () => setShowModal(true);
  const closeDecisionSupport = () => setShowModal(false);
  const upgradeToProPlan = () => {
    alert("Redirecting to subscription page...");
    closeDecisionSupport();
  };

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

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
              <a
                href="[Final] Dashboard.html"
                className="nav-item"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/dashboard");
                }}
              >
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
            style={{ padding: "12px 16px 12px 44px" }}
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

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
      />

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
              <a
                href="[Final] Add Patient.html"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/addpatient");
                }}
              >
                Add New Paitent
              </a>
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
              style={{ padding: "12px 16px 12px 44px" }}
              placeholder="Search by name, ID, or condition…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="filter-chips">
            <div
              className={`chip ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => { setActiveFilter("all"); setCurrentPage(1); }}
            >
              <i className="fa-solid fa-user-plus"></i>
              <span>All Patients</span>
            </div>
            <div
              className={`chip ${activeFilter === "critical" ? "active" : ""}`}
              onClick={() => { setActiveFilter("critical"); setCurrentPage(1); }}
            >
              Critical
            </div>
            <div
              className={`chip ${activeFilter === "stable" ? "active" : ""}`}
              onClick={() => { setActiveFilter("stable"); setCurrentPage(1); }}
            >
              Stable
            </div>
            <div
              className={`chip ${activeFilter === "underReview" ? "active" : ""
                }`}
              onClick={() => { setActiveFilter("underReview"); setCurrentPage(1); }}
            >
              Under Review
            </div>
          </div>
        </div>

        <div className="patient-grid" ref={gridRef}>
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", width: "100%", gridColumn: "1 / -1", color: "#6b7280" }}>
              <div style={{ marginBottom: "10px" }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>
              Loading patients...
            </div>
          ) : error ? (
            <div style={{ padding: "20px", textAlign: "center", width: "100%", gridColumn: "1 / -1", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "12px", border: "1px solid #fecaca" }}>
              <p style={{ margin: "0 0 10px 0", fontWeight: "500" }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
              >
                Retry
              </button>
            </div>
          ) : visiblePatients.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", width: "100%", gridColumn: "1 / -1", color: "#6b7280" }}>
              No patients found.
            </div>
          ) : (
            visiblePatients.map((patient, index) => (
              <div
                key={patient.id}
                ref={index === 0 ? cardRef : null}
                className="patient-card"
                data-status={patient.status}
                data-patient={patient.name}
              >
                <div className="patient-header" style={{ alignItems: "center", border: 'none', marginBottom: '0px' }}>
                  <div
                    className="patient-avatar"
                    style={{
                      background: patient.gradient, width: '57px',
                      height: '57px', fontSize: '20px'
                    }}
                  >
                    {patient.initials}
                  </div>
                  <div className="patient-info">
                    <h3>{patient.name}</h3>
                    <div className="patient-meta-row">
                      <p className="patient-meta">
                        Age: {patient.age}
                      </p>
                      <span
                        className={`status-badge ${patient.statusType || patient.status
                          }`}
                      >
                        {patient.statusLabel}
                      </span>
                    </div>
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
                      onClick={(e) => {
                        navigate("/patient-profile");
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pagination">
          <button
            disabled={safeCurrentPage <= 1 || visiblePatients.length === 0}
            onClick={() => setCurrentPage(safeCurrentPage - 1)}
          >
            ◂ Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={safeCurrentPage === page ? "active" : ""}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            disabled={safeCurrentPage >= totalPages || visiblePatients.length === 0}
            onClick={() => setCurrentPage(safeCurrentPage + 1)}
          >
            Next ▸
          </button>
        </div>
      </div>
    </>
  );
};

export default PatientList;
