import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import { useSubscription } from "./SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import LogoutConfirmation from "./ConfirmationModal.jsx";
import { useNotifications } from "./NotificationsContext";
import { sendSupportAPI } from "./mockAPI";
import { getJsonCookie } from "./cookieUtils";
import "../css/support.css";
import { getDoctorInitials } from "./Dashboard";

const getUser = () => {
  try {
    if (typeof getJsonCookie === "function") return getJsonCookie("user");
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("user="))
      ?.split("=")[1];
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    return null;
  }
};

const SUPPORT_DRAFT_KEY = "support_form_draft";
function Support() {
  const navigate = useNavigate();
  const { isSidebarCollapsed } = useSidebar();
  const { credits, isCreditsLoading } = useSubscription();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { unreadCount, openNotifications } = useNotifications();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  const user = getUser();
  const userIdentity = user?.email || user?.phone || "";
  const userInitials = getDoctorInitials();

  const savedDraft = (() => {
    try {
      return JSON.parse(localStorage.getItem(SUPPORT_DRAFT_KEY));
    } catch {
      return null;
    }
  })();

  const [formName, setFormName] = useState(user?.name ?? "");

  const [category, setCategory] = useState(savedDraft?.category ?? "");
  const [urgency, setUrgency] = useState(savedDraft?.urgency ?? "Medium");
  const [message, setMessage] = useState(savedDraft?.message ?? "");
  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [activeFAQ, setActiveFAQ] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [tickets, setTickets] = useState([]);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target))
        setIsAvatarMenuOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const draft = { category, urgency, message };
    localStorage.setItem(SUPPORT_DRAFT_KEY, JSON.stringify(draft));
  }, [category, urgency, message]);

  const toggleFAQ = (index) => setActiveFAQ(activeFAQ === index ? null : index);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setAttachment(null);
      setAttachmentName("");
      return;
    }

    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setFormError("Only PDF, PNG, or JPG files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError("File must be smaller than 10 MB.");
      e.target.value = "";
      return;
    }

    setAttachment(file);
    setAttachmentName(file.name);
    setFormError("");
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (!category) {
      setFormError("Please select a category.");
      return;
    }
    if (!message.trim()) {
      setFormError("Please enter a message.");
      return;
    }

    setIsSubmitting(true);

    const result = await sendSupportAPI({
      name: formName,
      category,
      urgency,
      message,
      attachment,
    });

    setIsSubmitting(false);

    if (result.success) {
      console.log("the [SUPPORT] is result", result);
      setFormSuccess(
        result.message ||
          "Support message submitted successfully. We'll get back to you shortly.",
      );
      setTimeout(() => setFormSuccess(""), 30000);
      localStorage.removeItem(SUPPORT_DRAFT_KEY);

      const newTicket = {
        id: 1240 + tickets.length + 1,
        subject: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        status: "open",
        date: new Date().toLocaleDateString(),
        category,
        message,
      };
      setTickets((prev) => [...prev, newTicket]);

      setCategory("");
      setUrgency("medium");
      setMessage("");
      setAttachment(null);
      setAttachmentName("");
      const fileInput = document.getElementById("fileUpload");
      if (fileInput) fileInput.value = "";
    } else {
      setFormError(result.message || "Something went wrong. Please try again.");
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setChatMessages((prev) => [
      ...prev,
      { text: chatInput, time, sender: "user" },
    ]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          text: "Thank you! A support agent will respond shortly. Have you checked our FAQ section?",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sender: "agent",
        },
      ]);
    }, 1500);
  };

  return (
    <>
      <div className="background-pattern"></div>

      <Sidebar activePage="support" />

      {/* Top navbar */}
      <Navbar
        isSidebarCollapsed={isSidebarCollapsed}
        credits={credits}
        isCreditsLoading={isCreditsLoading}
        unreadCount={unreadCount}
        getDoctorInitials={getDoctorInitials}
        openNotifications={openNotifications}
        setIsLogoutModalOpen={setIsLogoutModalOpen}
      />

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      {/* ── Main content ── */}
      <div
        className={`main-content${
          isSidebarCollapsed ? " collapsed" : ""
        } support-page`}
      >
        {/* Page header */}
        <div
          className="page-header"
          style={{
            background: "#FFFFFF",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
            marginBottom: "24px",
            border: "1px solid #E6EAF2",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="head">
            <div className="title">
              <h1>Help & Support</h1>
              <p className="page-header-subtitle">
                We're here to help — typical response time under 24 hours
              </p>
            </div>
          </div>
          <div
            className="status-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "24px",
              fontSize: "13px",
              fontWeight: "600",
              background: "#E6FFF5",
              color: "#00C187",
              boxShadow: "0 2px 4px rgba(0, 193, 135, 0.1)",
            }}
          >
            <span
              className="status-dot"
              style={{
                width: "8px",
                height: "8px",
                background: "#00C187",
                borderRadius: "50%",
              }}
            ></span>
            All Systems Operational
          </div>
        </div>

        <div className="content-grid">
          {/* ── Left Column: FAQ + Resources ── */}
          <div>
            <div className="card support-card">
              <h3 className="card-title">Frequently Asked Questions</h3>
              <div className="search-bar">
                <span className="search-bar-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17" 
                    height="17" 
                    viewBox="0 0 24 24"
                    fill="none" 
                    stroke="#718096" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="search-icon"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input type="text" placeholder="Search help topics..." />
              </div>

              <div className="faq-category">
                <div className="category-label">GETTING STARTED</div>
                {[
                  {
                    id: 1,
                    q: "How do I create my first diagnostic report?",
                    a: "Navigate to the Reports section and click 'New Report'. Upload patient data and our AI will analyze it instantly.",
                  },
                  {
                    id: 2,
                    q: "How do I invite team members?",
                    a: "Go to Settings > Team Management and click 'Invite Member'. Enter their email and assign permissions.",
                  },
                ].map(({ id, q, a }) => (
                  <React.Fragment key={id}>
                    <div
                      className={`faq-item ${activeFAQ === id ? "active" : ""}`}
                      onClick={() => toggleFAQ(id)}
                    >
                      <span>{q}</span>
                      <span className="chevron">▼</span>
                    </div>
                    <div
                      className={`faq-answer ${activeFAQ === id ? "show" : ""}`}
                    >
                      {a}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              <div className="faq-category">
                <div className="category-label">REPORTS & UPLOADS</div>
                {[
                  {
                    id: 3,
                    q: "What file formats are supported?",
                    a: "We support PDF, DICOM, PNG, JPG, and CSV formats. Maximum file size is 50MB.",
                  },
                  {
                    id: 4,
                    q: "How long does AI analysis take?",
                    a: "Most analyses complete within 2-5 seconds. Complex multi-modal data may take up to 30 seconds.",
                  },
                ].map(({ id, q, a }) => (
                  <React.Fragment key={id}>
                    <div
                      className={`faq-item ${activeFAQ === id ? "active" : ""}`}
                      onClick={() => toggleFAQ(id)}
                    >
                      <span>{q}</span>
                      <span className="chevron">▼</span>
                    </div>
                    <div
                      className={`faq-answer ${activeFAQ === id ? "show" : ""}`}
                    >
                      {a}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              <div className="faq-category">
                <div className="category-label">BILLING & PAYMENTS</div>
                <div
                  className={`faq-item ${activeFAQ === 5 ? "active" : ""}`}
                  onClick={() => toggleFAQ(5)}
                >
                  <span>How do I upgrade my plan?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 5 ? "show" : ""}`}>
                  Visit Billing Settings to view available plans and upgrade
                  instantly.
                </div>
              </div>

              <div className="faq-category">
                <div className="category-label">AI INSIGHTS</div>
                <div
                  className={`faq-item ${activeFAQ === 6 ? "active" : ""}`}
                  onClick={() => toggleFAQ(6)}
                >
                  <span>How accurate is the AI analysis?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 6 ? "show" : ""}`}>
                  Our AI models achieve 94%+ accuracy on validated medical
                  datasets. All results should be reviewed by qualified
                  professionals.
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="card support-card" style={{ marginTop: "24px" }}>
              <h3 className="card-title">Resources & Tutorials</h3>
              <div className="resource-grid">
                {[
                  {
                    title: "Documentation",
                    desc: "Complete API and platform docs",
                  },
                  {
                    title: "Quick Start Guide",
                    desc: "Get up and running in 5 minutes",
                  },
                  {
                    title: "Video Tutorials",
                    desc: "Step-by-step walkthroughs",
                  },
                  {
                    title: "System Docs",
                    desc: "Technical specifications",
                  },
                ].map(({ icon, title, desc }) => (
                  <div className="resource-card" key={title}>
                    <div className="resource-card-title">
                      {icon} {title}
                    </div>
                    <div className="resource-card-desc">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column: Contact Form + Ticket History ── */}
          <div>
            {/* ── Contact Support Form ── */}
            <div className="card support-card">
              <h3 className="card-title">Contact Support</h3>

              <form onSubmit={handleSupportSubmit}>
                {/* Name — editable, prefilled */}
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                {/* Identity — disabled, from login data */}
                <div className="form-group">
                  <label className="form-label">Email or Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userIdentity}
                    disabled
                    readOnly
                    style={{
                      backgroundColor: "var(--input-disabled-bg, #F3F4F6)",
                      color: "var(--text-secondary, #6B7280)",
                      cursor: "not-allowed",
                    }}
                    title="Identity is locked to your account"
                  />
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">
                    Category <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setFormError("");
                    }}
                    required
                  >
                    <option value="" disabled>
                      Select a category...
                    </option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing Question</option>
                    <option value="general">General</option>
                  </select>
                </div>

                {/* Urgency */}
                <div className="form-group">
                  <label className="form-label">
                    Urgency <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Message */}
                <div className="form-group">
                  <label className="form-label">
                    Message <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setFormError("");
                    }}
                    required
                    placeholder="Describe your issue..."
                  ></textarea>
                </div>

                {/* Attachment */}
                <div className="form-group">
                  <label className="form-label">Attach File (Optional)</label>
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      id="fileUpload"
                      accept=".pdf,.png,.jpg,.jpeg"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                    <label htmlFor="fileUpload" className="file-upload-btn">
                      📎 Choose File
                    </label>
                    {attachmentName && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#6B7280",
                          marginLeft: "8px",
                        }}
                      >
                        {attachmentName}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#9CA3AF",
                      marginTop: "4px",
                    }}
                  >
                    Allowed: PDF, PNG, JPG · Max 10 MB
                  </p>
                </div>

                {/* Success banner */}
                {formSuccess && (
                  <div
                    style={{
                      background: "#E6FFF5",
                      border: "1px solid #00C187",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                      color: "#00875A",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>✓</span>
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Error banner */}
                {formError && (
                  <div
                    style={{
                      background: "#FEF2F2",
                      border: "1px solid #FCA5A5",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                      color: "#B91C1C",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>✕</span>
                    <span>{formError}</span>
                  </div>
                )}
                <div className="form-actions">
                  <button
                    type="submit"
                    className={`btn btn-primary${isSubmitting ? " loading" : ""}`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                    onClick={() => {
                      localStorage.removeItem(SUPPORT_DRAFT_KEY);
                      setFormName(user?.name ?? "");
                      setCategory("");
                      setUrgency("Medium");
                      setMessage("");
                      setAttachment(null);
                      setAttachmentName("");
                      setFormError("");
                      setFormSuccess("");
                      const fi = document.getElementById("fileUpload");
                      if (fi) fi.value = "";
                    }}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {/* Ticket History */}
            {/* <div className="card support-card" style={{ marginTop: "24px" }}>
              <h3 className="card-title">Ticket History</h3>
              {tickets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No tickets yet</div>
                  <div className="empty-state-text">
                    How can we help you today?
                  </div>
                </div>
              ) : (
                <table
                  className="ticket-table"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>#{ticket.id}</td>
                        <td>{ticket.subject}</td>
                        <td>
                          <span
                            className={`ticket-status-badge ${ticket.status}`}
                          >
                            {ticket.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{ticket.date}</td>
                        <td>
                          <button
                            className="view-ticket-btn"
                            onClick={() => {
                              setActiveTicket(ticket);
                              setTicketModalOpen(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div> */}
          </div>
        </div>
      </div>

      {/* ── Ticket detail modal ── */}
      {/* {ticketModalOpen && activeTicket && (
        <div className="modal active modal-overlay" style={{ display: "flex" }}>
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setTicketModalOpen(false)}
            >
              ×
            </button>
            <h2
              style={{
                marginBottom: "16px",
                color: "#0E1A34",
                fontSize: "20px",
              }}
            >
              Ticket Details
            </h2>
            <div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Ticket ID:</strong> #
                {activeTicket.id}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Status:</strong>{" "}
                <span className={`ticket-status-badge ${activeTicket.status}`}>
                  {activeTicket.status.toUpperCase()}
                </span>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Category:</strong>{" "}
                {activeTicket.category}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Created:</strong>{" "}
                {activeTicket.date}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Message:</strong>
                <p style={{ marginTop: "8px", lineHeight: "1.6" }}>
                  {activeTicket.message}
                </p>
              </div>
              <div
                style={{
                  padding: "16px",
                  background: "#F8FAFF",
                  borderRadius: "8px",
                  marginTop: "24px",
                }}
              >
                <strong style={{ color: "#0E1A34" }}>Support Response:</strong>
                <p
                  style={{
                    marginTop: "8px",
                    color: "#8A94A6",
                    fontStyle: "italic",
                  }}
                >
                  Your ticket is being reviewed. We'll respond within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </>
  );
}

export default Support;
