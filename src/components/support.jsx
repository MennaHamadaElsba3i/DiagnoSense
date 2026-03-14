import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import { useSubscription } from "./SubscriptionContext";
import Sidebar from "./Sidebar";
import LogoutConfirmation from "./ConfirmationModal.jsx";
import NotificationsPanel from "./NotificationsPanel";
import "../css/support.css";

function Support() {
  const navigate = useNavigate();
  const { isSidebarCollapsed } = useSidebar();
  const { credits, isCreditsLoading } = useSubscription();

  // Shared app shell state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  // Support-specific state
  const [activeFAQ, setActiveFAQ] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      text: "Hi! I'm here to help. How can I assist you today?",
      time: "Just now",
      sender: "agent",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [tickets, setTickets] = useState([]);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setIsAvatarMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  // Support handlers
  const toggleFAQ = (index) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const category = formData.get("category");
    const message = formData.get("message");

    const newTicket = {
      id: 1240 + tickets.length + 1,
      subject:
        message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      status: "open",
      date: new Date().toLocaleDateString(),
      category,
      message,
    };

    setTickets([...tickets, newTicket]);
    setToastMessage(`✓ Ticket #${newTicket.id} created! We'll reply within 24 hours.`);
    setTimeout(() => setToastMessage(null), 5000);
    e.target.reset();
  };

  const viewTicket = (ticket) => {
    setActiveTicket(ticket);
    setTicketModalOpen(true);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setChatMessages([
      ...chatMessages,
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

      {/* Shared Native top bar matching other components */}
      <nav className={`top-navbar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="navbar-right">
          <div
            className="credits-badge"
            onClick={() => navigate('/subscription', { state: { tab: 'billing' } })}
            style={{ cursor: "pointer" }}
          >
            <span className="credits-icon">
              <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", stroke: "currentColor", fill: "none", strokeWidth: 2 }}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </span>
            <span>Credits: {isCreditsLoading ? "..." : (credits?.toLocaleString() ?? "0")}</span>
          </div>
          <button className="icon-btn" onClick={() => setIsNotificationsOpen(true)}>
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge"></span>
          </button>
          <div
            className="user-avatar-container"
            style={{ position: "relative" }}
            ref={avatarMenuRef}
          >
            <div
              className="user-avatar"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              LA
            </div>
            {isAvatarMenuOpen && (
              <div
                className="avatar-dropdown-menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  backgroundColor: "var(--surface-color, #ffffff)",
                  border: "1px solid var(--border-color, #e5e7eb)",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  padding: "8px",
                  minWidth: "180px",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <div
                  className="dropdown-item"
                  onClick={() => { setIsAvatarMenuOpen(false); navigate("/settings"); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--text-primary, #111827)",
                    fontSize: "14px",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--hover-bg, #f3f4f6)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile Settings
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => { setIsAvatarMenuOpen(false); openLogoutModal(); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--danger-color, #ef4444)",
                    fontSize: "14px",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--danger-bg-subtle, #fee2e2)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <LogoutConfirmation isOpen={isLogoutModalOpen} onClose={closeLogoutModal} />
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* Main Support Page specific content wrap */}
      <div className={`main-content${isSidebarCollapsed ? " collapsed" : ""} support-page`}>
        <div className="page-header" style={{
          background: "#FFFFFF",
          padding: "24px",
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
          marginBottom: "24px",
          border: "1px solid #E6EAF2",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div className="head">
            <div className="title">
              <h1>Help & Support</h1>
              <p className="page-header-subtitle">We're here to help — typical response time under 24 hours</p>
            </div>
          </div>
          <div className="status-badge" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "24px",
            fontSize: "13px",
            fontWeight: "600",
            background: "#E6FFF5",
            color: "#00C187",
            boxShadow: "0 2px 4px rgba(0, 193, 135, 0.1)"
          }}>
            <span className="status-dot" style={{
              width: "8px", height: "8px", background: "#00C187", borderRadius: "50%"
            }}></span>
            All Systems Operational
          </div>
        </div>

        <div className="content-grid">
          {/* Left Column */}
          <div>
            {/* FAQ Section */}
            <div className="card support-card">
              <h3 className="card-title">Frequently Asked Questions</h3>

              <div className="search-bar">
                <span className="search-bar-icon">🔍</span>
                <input type="text" placeholder="Search help topics..." />
              </div>

              <div className="faq-category">
                <div className="category-label">GETTING STARTED</div>
                <div className={`faq-item ${activeFAQ === 1 ? "active" : ""}`} onClick={() => toggleFAQ(1)}>
                  <span>How do I create my first diagnostic report?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 1 ? "show" : ""}`}>
                  Navigate to the Reports section and click "New Report". Upload patient data and our AI will analyze it instantly.
                </div>

                <div className={`faq-item ${activeFAQ === 2 ? "active" : ""}`} onClick={() => toggleFAQ(2)}>
                  <span>How do I invite team members?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 2 ? "show" : ""}`}>
                  Go to Settings &gt; Team Management and click "Invite Member". Enter their email and assign permissions.
                </div>
              </div>

              <div className="faq-category">
                <div className="category-label">REPORTS & UPLOADS</div>
                <div className={`faq-item ${activeFAQ === 3 ? "active" : ""}`} onClick={() => toggleFAQ(3)}>
                  <span>What file formats are supported?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 3 ? "show" : ""}`}>
                  We support PDF, DICOM, PNG, JPG, and CSV formats. Maximum file size is 50MB.
                </div>

                <div className={`faq-item ${activeFAQ === 4 ? "active" : ""}`} onClick={() => toggleFAQ(4)}>
                  <span>How long does AI analysis take?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 4 ? "show" : ""}`}>
                  Most analyses complete within 2-5 seconds. Complex multi-modal data may take up to 30 seconds.
                </div>
              </div>

              <div className="faq-category">
                <div className="category-label">BILLING & PAYMENTS</div>
                <div className={`faq-item ${activeFAQ === 5 ? "active" : ""}`} onClick={() => toggleFAQ(5)}>
                  <span>How do I upgrade my plan?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 5 ? "show" : ""}`}>
                  Visit Billing Settings to view available plans and upgrade instantly.
                </div>
              </div>

              <div className="faq-category">
                <div className="category-label">AI INSIGHTS</div>
                <div className={`faq-item ${activeFAQ === 6 ? "active" : ""}`} onClick={() => toggleFAQ(6)}>
                  <span>How accurate is the AI analysis?</span>
                  <span className="chevron">▼</span>
                </div>
                <div className={`faq-answer ${activeFAQ === 6 ? "show" : ""}`}>
                  Our AI models achieve 94%+ accuracy on validated medical datasets. All results should be reviewed by qualified professionals.
                </div>
              </div>
            </div>

            {/* Resources Section */}
            <div className="card support-card" style={{ marginTop: "24px" }}>
              <h3 className="card-title">Resources & Tutorials</h3>
              <div className="resource-grid">
                <div className="resource-card">
                  <div className="resource-card-title">📚 Documentation</div>
                  <div className="resource-card-desc">Complete API and platform docs</div>
                </div>
                <div className="resource-card">
                  <div className="resource-card-title">🚀 Quick Start Guide</div>
                  <div className="resource-card-desc">Get up and running in 5 minutes</div>
                </div>
                <div className="resource-card">
                  <div className="resource-card-title">🎥 Video Tutorials</div>
                  <div className="resource-card-desc">Step-by-step walkthroughs</div>
                </div>
                <div className="resource-card">
                  <div className="resource-card-title">🔧 System Docs</div>
                  <div className="resource-card-desc">Technical specifications</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Contact Support Form */}
            <div className="card support-card">
              <h3 className="card-title">Contact Support</h3>
              <form id="supportForm" onSubmit={handleSupportSubmit}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-input" value="Dr. John Smith" readOnly />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value="john.smith@hospital.com" readOnly />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" name="category" required defaultValue="">
                    <option value="" disabled>Select a category...</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing Question</option>
                    <option value="account">Account Management</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select className="form-select" required defaultValue="medium">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-textarea" name="message" required placeholder="Describe your issue..."></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Attach File (Optional)</label>
                  <div className="file-upload-wrapper">
                    <input type="file" id="fileUpload" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} />
                    <label htmlFor="fileUpload" className="file-upload-btn">📎 Choose File</label>
                    <span id="fileName" style={{ fontSize: "12px", color: "#8A94A6" }}></span>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Send Message</button>
                  <button type="button" className="btn btn-secondary" onClick={() => document.getElementById("supportForm").reset()}>Clear</button>
                </div>
              </form>
            </div>

            {/* Ticket History */}
            <div className="card support-card" style={{ marginTop: "24px" }}>
              <h3 className="card-title">Ticket History</h3>
              <div id="ticketContainer">
                {tickets.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-title">No tickets yet</div>
                    <div className="empty-state-text">How can we help you today?</div>
                  </div>
                ) : (
                  <table className="ticket-table" style={{ width: "100%", borderCollapse: "collapse" }}>
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
                            <span className={`ticket-status-badge ${ticket.status}`}>
                              {ticket.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{ticket.date}</td>
                          <td>
                            <button className="view-ticket-btn" onClick={() => viewTicket(ticket)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="system-status">
          <h3 className="card-title">System Status</h3>
          <div className="status-metrics">
            <div className="status-metric">
              <div className="status-metric-label">Uptime</div>
              <div className="status-metric-value">99.8%</div>
            </div>
            <div className="status-metric">
              <div className="status-metric-label">Last Updated</div>
              <div className="status-metric-value" style={{ fontSize: "14px", color: "#3A4560", fontWeight: 500 }}>2 mins ago</div>
            </div>
            <div className="status-metric">
              <div className="status-metric-label">Recent Incidents</div>
              <div className="status-metric-value" style={{ fontSize: "14px", color: "#3A4560", fontWeight: 500 }}>None</div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Specific Portals */}
      {/* Chat Button */}
      <button className="chat-button" onClick={() => setChatOpen(!chatOpen)}>💬</button>

      {/* Chat Widget */}
      {chatOpen && (
        <div className="chat-widget active" id="chatWidget" style={{ display: "block" }}>
          <div className="chat-header">
            <div className="chat-header-title">Chat with Support</div>
            <button className="chat-close" onClick={() => setChatOpen(false)}>×</button>
          </div>
          <div className="chat-messages" id="chatMessages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.sender}`}>
                <div>{msg.text}</div>
                <div className="chat-time">{msg.time}</div>
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
              placeholder="Type your message..."
            />
            <button className="chat-send-btn" onClick={sendChatMessage}>Send</button>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketModalOpen && activeTicket && (
        <div className="modal active modal-overlay" style={{ display: "flex" }}>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setTicketModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: "16px", color: "#0E1A34", fontSize: "20px" }}>Ticket Details</h2>
            <div id="ticketModalBody">
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Ticket ID:</strong> #{activeTicket.id}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Status:</strong>{" "}
                <span className={`ticket-status-badge ${activeTicket.status}`}>{activeTicket.status.toUpperCase()}</span>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Category:</strong> {activeTicket.category}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Created:</strong> {activeTicket.date}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong style={{ color: "#0E1A34" }}>Message:</strong>
                <p style={{ marginTop: "8px", lineHeight: "1.6" }}>{activeTicket.message}</p>
              </div>
              <div style={{ padding: "16px", background: "#F8FAFF", borderRadius: "8px", marginTop: "24px" }}>
                <strong style={{ color: "#0E1A34" }}>Support Response:</strong>
                <p style={{ marginTop: "8px", color: "#8A94A6", fontStyle: "italic" }}>Your ticket is being reviewed. We'll respond within 24 hours.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="toast success active" id="toast" style={{ bottom: "20px" }}>
          <span id="toastIcon">✓</span>
          <span id="toastMessage">{toastMessage}</span>
        </div>
      )}
    </>
  );
}

export default Support;
