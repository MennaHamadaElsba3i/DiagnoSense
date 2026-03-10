import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import Sidebar from "./Sidebar";
import LogoutConfirmation from "./ConfirmationModal.jsx";
import "../css/subscription.css";
import Swal from "sweetalert2";
import { chargeWalletAPI } from "./mockAPI.js"; // adjust path if needed
import NotificationsPanel from "./NotificationsPanel";

function Subscription() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target)
      ) {
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

  const [activeTab, setActiveTab] = useState(location.state?.tab || "plans");

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);
  const [chargeAmt, setChargeAmt] = useState("");
  const [selectedAmt, setSelectedAmt] = useState(null);
  const [isCharged, setIsCharged] = useState(false);
  const [chargeHint, setChargeHint] = useState("");
  const [historyFilter, setHistoryFilter] = useState("30days"); // '30days', '6months', '1year'

  const handleTabSwitch = (tabId) => setActiveTab(tabId);

  const cancelSub = () => {
    if (window.confirm("Are you sure you want to cancel your subscription?")) {
      window.alert(
        "Subscription cancelled. You will retain access until Dec 12, 2025.",
      );
    }
  };

  const startPlan = (planName) => {
    window.alert(
      `You selected the ${planName} plan!\nRedirecting to checkout...`,
    );
  };

  const pickAmt = (amt) => {
    setSelectedAmt(amt);
    setChargeAmt(amt.toString());
    setIsCharged(false);
    setChargeHint("");
  };

  const onCustomAmt = (e) => {
    const val = e.target.value;
    setChargeAmt(val);
    setSelectedAmt(null);
    setIsCharged(false);
    setChargeHint("");
  };

  // const doCharge = () => {
  //   const val = parseFloat(chargeAmt);
  //   if (!val || val <= 0) return;

  //   setIsCharged(true);
  //   setChargeHint(`✓ E£ ${val.toLocaleString()} charged successfully.`);
  //   setTimeout(() => {
  //     setIsCharged(false);
  //     setChargeAmt("");
  //     setChargeHint("");
  //     setSelectedAmt(null);
  //   }, 3000);
  // };

const doCharge = async () => {
    const val = parseFloat(chargeAmt);
    if (!val || val < 50) {
      Swal.fire({
        icon: "warning",
        title: "Minimum Amount",
        text: "The minimum charge amount is 50.",
      });
      return;
    }

    setIsCharged(true);
    setChargeHint("");

    const result = await chargeWalletAPI(val);

    console.log("Charge result:", result);
    setIsCharged(false);

    if (!result.success) {
      Swal.fire({
        icon: "error",
        title: "Charge Failed",
        text: result.message || "Something went wrong while charging credits",
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: result.message || `E£ ${val.toLocaleString()} charged successfully.`,
    }).then(() => {
      // Handle checkout/payment URL if the backend returns one
      const paymentUrl =
        result.payment_url ||
        result.checkout_url ||
        result.url ||
        (result.data &&
          (result.data.payment_url ||
            result.data.checkout_url ||
            result.data.url));
      
      if (paymentUrl) {
        window.location.href = paymentUrl;
      }
    });

    setChargeAmt("");
    setSelectedAmt(null);
    setChargeHint("");
  };
  const dlInv = (date) => window.alert(`Downloading invoice for ${date}...`);

  return (
    <>
      <div className="background-pattern"></div>

      <Sidebar activePage="subscription" />

      <nav className={`top-navbar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="navbar-right">
          <div
            className="credits-badge"
            onClick={() =>
              navigate("/subscription", { state: { tab: "billing" } })
            }
            style={{ cursor: "pointer" }}
          >
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
          <button
            className="icon-btn"
            onClick={() => setIsNotificationsOpen(true)}
          >
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
                  boxShadow:
                    "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  padding: "8px",
                  minWidth: "180px",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    navigate("/settings");
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--text-primary, #111827)",
                    fontSize: "14px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--hover-bg, #f3f4f6)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile Settings
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    openLogoutModal();
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--danger-color, #ef4444)",
                    fontSize: "14px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--danger-bg-subtle, #fee2e2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
      />

      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="subscription-page-header">
          <h2 className="subscription-title">Manage Subscription</h2>
        </div>
        <div className="subscription-page">
          <div className="subscription-container">
            <div className="current-banner">
              <div>
                <div className="banner-plan-row">
                  <span className="banner-plan-name">Pro Plan</span>
                  <span className="active-badge">
                    <span className="active-dot"></span> Active
                  </span>
                </div>
                <div className="banner-renewal">
                  Next renewal: Dec 12, 2025 · Chatbot + Comparative Analysis
                </div>
              </div>
              <div className="banner-right">
                <div className="banner-price">
                  E£ 6,000<span>/month</span>
                </div>
                <button className="btn-cancel-sub" onClick={cancelSub}>
                  Cancel Subscription
                </button>
              </div>
            </div>

            <div className="tabs">
              <button
                className={`tab-btn ${activeTab === "plans" ? "active" : ""}`}
                onClick={() => handleTabSwitch("plans")}
              >
                ⊞ Available Plans
              </button>
              <button
                className={`tab-btn ${activeTab === "usage" ? "active" : ""}`}
                onClick={() => handleTabSwitch("usage")}
              >
                ◎ Usage
              </button>
              <button
                className={`tab-btn ${activeTab === "billing" ? "active" : ""}`}
                onClick={() => handleTabSwitch("billing")}
              >
                ◈ Billing &amp; History
              </button>
            </div>

            <div
              className={`tab-panel ${activeTab === "plans" ? "active" : ""}`}
            >
              <div className="plans-grid">
                <div className="plan-card">
                  <div className="plan-name">Basic</div>
                  <span className="plan-price">E£ 2,400</span>
                  <div className="plan-period">per month*</div>
                  <div className="plan-tagline">Best for solo doctors</div>
                  <div className="plan-feats">
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Up to 270 summaries</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Key Important Information</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Comparative Analysis</span>
                    </div>
                  </div>
                  <button
                    className="btn-plan"
                    onClick={() => startPlan("Basic")}
                  >
                    Get Started
                  </button>
                </div>

                <div className="plan-card popular">
                  <div className="badge-popular">⭐ Most Popular</div>
                  <div className="badge-current">Current Plan</div>
                  <div className="plan-name">Pro</div>
                  <span className="plan-price">E£ 6,000</span>
                  <div className="plan-period">per month*</div>
                  <div className="plan-tagline">Most popular plan</div>
                  <div className="plan-feats">
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Up to 450 summaries</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Key Important Information</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Comparative Analysis</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Decision Support</span>
                    </div>
                  </div>
                  <button className="btn-plan cur">Current Plan</button>
                </div>

                <div className="plan-card">
                  <div className="plan-name">Premium</div>
                  <span className="plan-price">E£ 12,000</span>
                  <div className="plan-period">per month*</div>
                  <div className="plan-tagline">Exclusively for teams</div>
                  <div className="plan-feats">
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Up to 660 summaries</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Key Important Information</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Comparative Analysis</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">Decision Support</span>
                    </div>
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span className="feat-t">DiagnoBot</span>
                    </div>
                  </div>
                  <button
                    className="btn-plan"
                    onClick={() => startPlan("Premium")}
                  >
                    Get Started
                  </button>
                </div>
              </div>

              <div className="bottom-grid">
                <div className="ppu-card">
                  <div>
                    <div className="ppu-lbl">Pay-per-use</div>
                    <div className="ppu-sub">Most popular plan</div>
                    <div className="ppu-price">
                      E£ 25 <em>/ file</em>
                    </div>
                  </div>
                  <div className="ppu-right">
                    <div className="feat">
                      <span className="feat-ck">✓</span>
                      <span style={{ fontSize: "12px" }}>All features</span>
                    </div>
                    <button
                      className="btn-solid"
                      onClick={() => startPlan("Pay-per-use")}
                    >
                      Get Started
                    </button>
                  </div>
                </div>
                <div className="ent-card">
                  <div className="ent-name">Enterprise</div>
                  <div className="ent-inner">
                    <div className="ent-feats">
                      <div className="feat">
                        <span className="feat-ck">✓</span>
                        <span className="feat-t">
                          Annual per-doctor license with yearly calculation and
                          volume discount
                        </span>
                      </div>
                      <div className="feat">
                        <span className="feat-ck">✓</span>
                        <span className="feat-t">
                          One-time setup and implementation fee
                        </span>
                      </div>
                      <div className="feat">
                        <span className="feat-ck">✓</span>
                        <span className="feat-t">
                          Payment includes discounted annual fee plus setup at
                          contract start.
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-solid"
                      onClick={() => startPlan("Enterprise")}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`tab-panel ${activeTab === "usage" ? "active" : ""}`}
            >
              <div className="usage-plan-bar">
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span className="u-plan-name">Pro Plan</span>
                  <span className="u-cycle">
                    Current cycle: Nov 12 – Dec 12, 2024
                  </span>
                </div>
                <span className="green-badge">
                  <span className="g-dot"></span> Active
                </span>
              </div>
              <div className="usage-box">
                <div className="u-big">
                  150 <span>/ 220 files</span>
                </div>
                <div className="u-lbl">Total files used this cycle</div>
                <div className="u-track">
                  <div className="u-fill" style={{ width: "68.2%" }}></div>
                </div>
                <div className="u-foot">
                  <div className="u-left">
                    <span>0</span>
                    <span className="u-remain">70 files remaining</span>
                  </div>
                  <span>220</span>
                </div>
              </div>
              <div className="credits-banner">
                <div>
                  <div className="cr-lbl">Available Credits</div>
                  <div className="cr-val">
                    1,247 <em>credits</em>
                  </div>
                </div>
                <button
                  className="btn-topup"
                  onClick={() => handleTabSwitch("billing")}
                >
                  Top Up Credits →
                </button>
              </div>
            </div>

            <div
              className={`tab-panel ${activeTab === "billing" ? "active" : ""}`}
            >
              <div className="b-card">
                <div className="b-title">Top Up Credits</div>
                <div className="b-sub">Choose or enter an amount.</div>
                <div className="b-section">Select Amount</div>
                <div className="amts-top">
                  {[500, 1000, 1500, 2500].map((amt) => (
                    <button
                      key={amt}
                      className={`amt ${selectedAmt === amt ? "sel" : ""}`}
                      onClick={() => pickAmt(amt)}
                    >
                      E£ {amt}
                    </button>
                  ))}
                </div>
                <div className="amts-bot">
                  {[4000, 5000].map((amt) => (
                    <button
                      key={amt}
                      className={`amt ${selectedAmt === amt ? "sel" : ""}`}
                      onClick={() => pickAmt(amt)}
                    >
                      E£ {amt}
                    </button>
                  ))}
                  <div className="inp-wrap">
                    <span className="inp-pfx">E£</span>
                    <input
                      type="number"
                      className="inp"
                      placeholder="0.00"
                      min="1"
                      value={chargeAmt}
                      onChange={onCustomAmt}
                    />
                  </div>
                  <button
                    className={`btn-charge ${isCharged ? "done" : ""}`}
                    onClick={doCharge}
                    disabled={
                      !parseFloat(chargeAmt) ||
                      parseFloat(chargeAmt) <= 0 ||
                      isCharged
                    }
                  >
                    {isCharged ? "✓ Charged!" : "Charge"}
                  </button>
                </div>
                <div className="charge-hint">{chargeHint}</div>
              </div>

              <div className="b-card">
                <div className="h-header">
                  <div className="h-title">Payment History</div>
                  <div className="f-btns">
                    <button
                      className={`f-btn ${historyFilter === "30days" ? "act" : ""}`}
                      onClick={() => setHistoryFilter("30days")}
                    >
                      Last 30 days
                    </button>
                    <button
                      className={`f-btn ${historyFilter === "6months" ? "act" : ""}`}
                      onClick={() => setHistoryFilter("6months")}
                    >
                      6 months
                    </button>
                    <button
                      className={`f-btn ${historyFilter === "1year" ? "act" : ""}`}
                      onClick={() => setHistoryFilter("1year")}
                    >
                      1 year
                    </button>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="td-d">Nov 12, 2024</td>
                      <td className="td-desc">Pro Plan — Monthly</td>
                      <td className="td-amt">E£ 6,000</td>
                      <td>
                        <span className="paid">✓ Paid</span>
                      </td>
                      <td>
                        <button
                          className="btn-dl"
                          onClick={() => dlInv("Nov 12")}
                        >
                          ↓ Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="td-d">Oct 12, 2024</td>
                      <td className="td-desc">Pro Plan — Monthly</td>
                      <td className="td-amt">E£ 6,000</td>
                      <td>
                        <span className="paid">✓ Paid</span>
                      </td>
                      <td>
                        <button
                          className="btn-dl"
                          onClick={() => dlInv("Oct 12")}
                        >
                          ↓ Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="td-d">Sep 12, 2024</td>
                      <td className="td-desc">Pro Plan — Monthly</td>
                      <td className="td-amt">E£ 6,000</td>
                      <td>
                        <span className="paid">✓ Paid</span>
                      </td>
                      <td>
                        <button
                          className="btn-dl"
                          onClick={() => dlInv("Sep 12")}
                        >
                          ↓ Download
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="td-d">Aug 20, 2024</td>
                      <td className="td-desc">Credits Top-up</td>
                      <td className="td-amt">E£ 500</td>
                      <td>
                        <span className="paid">✓ Paid</span>
                      </td>
                      <td>
                        <button
                          className="btn-dl"
                          onClick={() => dlInv("Aug 20")}
                        >
                          ↓ Download
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}

export default Subscription;
