import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import { useSubscription } from "./SubscriptionContext";
import Sidebar from "./Sidebar";
import LogoutConfirmation from "./ConfirmationModal.jsx";
import "../css/subscription.css";
import Swal from "sweetalert2";
import { chargeWalletAPI, getTransactionsAPI, getSubscriptionPlansAPI, subscribeToPlanAPI, subscribeToPayPerUseAPI, cancelSubscriptionAPI } from "./mockAPI.js";
import { useNotifications } from "./NotificationsContext";

function Subscription() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { unreadCount, openNotifications } = useNotifications();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const { subscriptionData, isSubLoading, refreshSubscription } = useSubscription();
  const { credits, isCreditsLoading, refreshCredits } = useSubscription();
  const walletBalance = subscriptionData?.wallet_balance != null ? subscriptionData.wallet_balance.toLocaleString() : "—";
  const isPayPerUse = subscriptionData?.billing_mode === "pay_per_use";
  const isSubscription = subscriptionData?.billing_mode === "subscription";
  const [transactions, setTransactions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCancelledLocally, setIsCancelledLocally] = useState(false);

  const fetchTransactions = async () => {
    setIsLoadingHistory(true);
    const result = await getTransactionsAPI();
    console.log("--- Transactions API Full Response ---", result);
    if (result.success && result.data) {
      setTransactions(result.data.transactions);
      // credits are managed globally via context — no local state needed
    }
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get("status");
    const currentTab = searchParams.get("tab") || "billing";

    if (status === "success") {
      fetchTransactions();
      refreshSubscription();
      refreshCredits();
      Swal.fire({
        icon: "success",
        title: "Payment Successful",
        text: "Your wallet has been topped up successfully.",
        confirmButtonColor: "#10b981",
      }).then(() => {
        navigate("/subscription", { replace: true, state: { tab: currentTab } });
      });
    }
    else if (status === "canceled" || status === "cancel" || status === "failed") {
      Swal.fire({
        icon: "warning",
        title: "Payment Cancelled",
        text: "The payment process was not completed. No credits were added.",
        confirmButtonColor: "#f59e0b"
      }).then(() => {
        navigate("/subscription", { replace: true, state: { tab: currentTab } });
      });
    }
  }, [location.search, navigate]);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || location.state?.tab || "plans"
  );

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);
  const [chargeAmt, setChargeAmt] = useState("");
  const [selectedAmt, setSelectedAmt] = useState(null);
  const [isCharged, setIsCharged] = useState(false);
  const [chargeHint, setChargeHint] = useState("");
  const [historyFilter, setHistoryFilter] = useState("30days");

  const [plans, setPlans] = useState([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(
    () => {
      const saved = localStorage.getItem("currentPlanId");
      return saved ? (isNaN(saved) ? saved : Number(saved)) : null;
    }
  );
  const [subscribingPlanId, setSubscribingPlanId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      setIsPlansLoading(true);
      setPlansError(null);
      const result = await getSubscriptionPlansAPI();

      if (!isMounted) return;

      setIsPlansLoading(false);
      if (result.success && result.data) {
        setPlans(result.data);
      } else {
        setPlansError(result.message || "Failed to load plans");
      }
    };

    fetchPlans();

    return () => { isMounted = false; };
  }, []);

  const handleTabSwitch = (tabId) => setActiveTab(tabId);

  const cancelSub = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Cancel Subscription",
      text: "Are you sure you want to cancel your plan?",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel it",
      cancelButtonText: "No, keep it",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });

    if (result.isConfirmed) {
      const apiResult = await cancelSubscriptionAPI();

      if (apiResult.success) {
        Swal.fire({
          icon: "success",
          title: "Cancelled",
          text: apiResult.message || "Subscription cancelled successfully.",
        });
        setIsCancelledLocally(true);
        setSelectedPlanId(null);
        localStorage.removeItem("currentPlanId");
        refreshSubscription();
        refreshCredits();
        fetchTransactions();
      } else {
        Swal.fire({
          icon: "error",
          title: "Cancellation Failed",
          text: apiResult.message || "Something went wrong.",
        });
      }
    }
  };

  const startPlan = async (plan) => {
    if (plan === "Enterprise") {
      window.alert("You selected the Enterprise plan!\nPlease contact our enterprise sales team.");
      return;
    }

    if (plan === "Pay-per-use") {
      setSubscribingPlanId("Pay-per-use");

      const result = await subscribeToPayPerUseAPI();

      setSubscribingPlanId(null);

      if (result.success) {
        setIsCancelledLocally(false);
        setSelectedPlanId("Pay-per-use");
        localStorage.setItem("currentPlanId", "Pay-per-use");
        refreshSubscription();
        refreshCredits();
        fetchTransactions();

        Swal.fire({
          icon: "success",
          title: "Success",
          text: result.message || "Successfully switched to Pay-Per-Use mode!",
          confirmButtonColor: "#10b981",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Switch Failed",
          text: result.message || "Something went wrong. Please try again.",
        });
      }
      return;
    }

    const planId = plan?.id || plan;

    setSubscribingPlanId(planId);

    const result = await subscribeToPlanAPI(planId);

    setSubscribingPlanId(null);

    if (result.success) {
      setIsCancelledLocally(false);
      setSelectedPlanId(planId);
      localStorage.setItem("currentPlanId", planId);
      refreshSubscription();
      refreshCredits();
      fetchTransactions();

      Swal.fire({
        icon: "success",
        title: "Success",
        text: result.message || "Successfully subscribed to the plan!",
        confirmButtonColor: "#10b981",
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Subscription Failed",
        text: result.message || "Something went wrong. Please try again.",
      });
    }
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
        text: result.message,
      });
      return;
    }

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
            <span>Credits: {isCreditsLoading ? "..." : (credits?.toLocaleString() ?? "0")}</span>
          </div>
          <button
            className="icon-btn"
            onClick={() => openNotifications()}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
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
              {isSubLoading ? (
                <div style={{ padding: "8px 0", color: "var(--text-secondary)" }}>Loading current plan...</div>
              ) : isSubscription ? (
                (() => {
                  const isEffectivelyCancelled = isCancelledLocally || (subscriptionData?.status && subscriptionData.status.toLowerCase() !== "active");
                  const displayStatus = isEffectivelyCancelled ? "Cancelled" : "Active";
                  const badgeClass = isEffectivelyCancelled ? "cancelled-badge" : "active-badge";
                  const dotClass = isEffectivelyCancelled ? "cancelled-dot" : "active-dot";
                  return (
                    <>
                      <div>
                        <div className="banner-plan-row">
                          <span className="banner-plan-name">{subscriptionData.plan_name} Plan</span>
                          <span className={badgeClass}>
                            <span className={dotClass}></span> {displayStatus}
                          </span>
                        </div>
                        <div className="banner-renewal">
                          Next renewal: {subscriptionData.expires_at}{subscriptionData.features?.length ? " · " + subscriptionData.features.join(", ") : ""}
                        </div>
                      </div>
                      <div className="banner-right">
                        <div className="banner-price">
                          {isCreditsLoading ? "..." : (credits?.toLocaleString() ?? "0")} <span>credits</span>
                        </div>
                        {!isEffectivelyCancelled && (
                          <button className="btn-cancel-sub" onClick={cancelSub}>
                            Cancel Subscription
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : isPayPerUse ? (
                (() => {
                  const isEffectivelyCancelled = isCancelledLocally || (subscriptionData?.status && subscriptionData.status.toLowerCase() !== "active");
                  const displayStatus = isEffectivelyCancelled ? "Cancelled" : "Active";
                  const badgeClass = isEffectivelyCancelled ? "cancelled-badge" : "active-badge";
                  const dotClass = isEffectivelyCancelled ? "cancelled-dot" : "active-dot";
                  return (
                    <>
                      <div>
                        <div className="banner-plan-row">
                          <span className="banner-plan-name">Pay-Per-Use</span>
                          <span className={badgeClass}>
                            <span className={dotClass}></span> {displayStatus}
                          </span>
                        </div>
                        <div className="banner-renewal">
                          {subscriptionData.display_text || "You are currently using the Pay-Per-Use plan."}
                        </div>
                      </div>
                      <div className="banner-right">
                        <div className="banner-price">
                          {isCreditsLoading ? "..." : (credits?.toLocaleString() ?? "0")} <span>credits</span>
                        </div>
                        {!isEffectivelyCancelled && (
                          <button className="btn-cancel-sub" onClick={cancelSub}>
                            Cancel Subscription
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div style={{ padding: "8px 0", color: "var(--text-secondary)" }}>No active plan</div>
              )}
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
                {isPlansLoading ? (
                  <div style={{ padding: "3rem", textAlign: "center", gridColumn: "1 / -1", color: "var(--text-secondary)" }}>
                    Loading available plans...
                  </div>
                ) : plansError ? (
                  <div style={{ padding: "3rem", textAlign: "center", gridColumn: "1 / -1", color: "var(--danger-color)" }}>
                    {plansError}
                  </div>
                ) : plans.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", gridColumn: "1 / -1", color: "var(--text-secondary)" }}>
                    No plans available at the moment.
                  </div>
                ) : (
                  plans.map((plan) => {
                    const isCurrent = selectedPlanId === plan.id;
                    return (
                      <div className={`plan-card ${isCurrent ? "popular" : ""}`} key={plan.id}>
                        {isCurrent && <div className="badge-current">Current Plan</div>}
                        <div className="plan-name">{plan.name}</div>
                        <span className="plan-price">E£ {plan.price.toLocaleString()}</span>
                        <div className="plan-period">per {plan.duration_days === 30 ? "month" : `${plan.duration_days} days`}*</div>
                        <div className="plan-tagline"></div>
                        <div className="plan-feats">
                          {plan.summaries_limit > 0 && (
                            <div className="feat">
                              <span className="feat-ck">✓</span>
                              <span className="feat-t">Up to {plan.summaries_limit} summaries</span>
                            </div>
                          )}
                          {plan.features?.map((feature, idx) => (
                            <div className="feat" key={idx}>
                              <span className="feat-ck">✓</span>
                              <span className="feat-t">{feature}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          className={`btn-plan ${isCurrent ? "cur" : ""}`}
                          onClick={() => startPlan(plan)}
                          disabled={subscribingPlanId === plan.id || isCurrent}
                          style={{ cursor: (subscribingPlanId === plan.id || isCurrent) ? 'not-allowed' : 'pointer' }}
                        >
                          {subscribingPlanId === plan.id ? "Subscribing..." : isCurrent ? "Current Plan" : "Get Started"}
                        </button>
                      </div>
                    )
                  }
                  )
                )}
              </div>

              <div className="bottom-grid">
                <div className={`ppu-card ${selectedPlanId === "Pay-per-use" ? "popular" : ""}`}>
                  {selectedPlanId === "Pay-per-use" && <div className="badge-current">Current Mode</div>}
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
                      className={`btn-solid ${selectedPlanId === "Pay-per-use" ? "cur" : ""}`}
                      onClick={() => startPlan("Pay-per-use")}
                      disabled={subscribingPlanId === "Pay-per-use" || selectedPlanId === "Pay-per-use"}
                      style={{
                        cursor: (subscribingPlanId === "Pay-per-use" || selectedPlanId === "Pay-per-use") ? 'not-allowed' : 'pointer',
                        whiteSpace: "nowrap"
                      }}
                    >
                      {subscribingPlanId === "Pay-per-use" ? "Switching..." : selectedPlanId === "Pay-per-use" ? "Current Mode" : "Get Started"}
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
              {isSubLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading usage data...</div>
              ) : isSubscription ? (
                (() => {
                  const isEffectivelyCancelled = isCancelledLocally || (subscriptionData?.status && subscriptionData.status.toLowerCase() !== "active");
                  const displayStatus = isEffectivelyCancelled ? "Cancelled" : "Active";
                  const badgeClass = isEffectivelyCancelled ? "cancelled-badge" : "green-badge";
                  const dotClass = isEffectivelyCancelled ? "cancelled-dot" : "g-dot";
                  return (
                    <>
                      <div className="usage-plan-bar">
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "10px" }}
                        >
                          <span className="u-plan-name">{subscriptionData.plan_name} Plan</span>
                          <span className="u-cycle">
                            Current cycle: {subscriptionData.starts_at} – {subscriptionData.expires_at}
                          </span>
                        </div>
                        <span className={badgeClass}>
                          <span className={dotClass}></span> {displayStatus}
                        </span>
                      </div>
                      <div className="usage-box">
                        <div className="u-big">
                          {subscriptionData.usage?.used ?? 0} <span>/ {subscriptionData.usage?.total ?? 0} files</span>
                        </div>
                        <div className="u-lbl">Total files used this cycle</div>
                        <div className="u-track">
                          <div className="u-fill" style={{ width: `${subscriptionData.usage?.percentage ?? 0}%` }}></div>
                        </div>
                        <div className="u-foot">
                          <div className="u-left">
                            <span>0</span>
                            <span className="u-remain">{subscriptionData.usage?.remaining ?? 0} files remaining</span>
                          </div>
                          <span>{subscriptionData.usage?.total ?? 0}</span>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : isPayPerUse ? (
                <div className="usage-box" style={{ textAlign: "center", padding: "2rem" }}>
                  <div className="u-lbl" style={{ fontSize: "15px", marginBottom: "8px" }}>
                    {subscriptionData.display_text || "You are currently using the Pay-Per-Use plan."}
                  </div>
                  <div className="u-lbl">
                    Each file costs E£ {subscriptionData.price_per_file ?? 25}. Usage tracking is per-file.
                  </div>
                </div>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No plan data available.</div>
              )}
              <div className="credits-banner">
                <div>
                  <div className="cr-lbl">Available Credits</div>
                  <div className="cr-val">
                    {isCreditsLoading ? "..." : (credits?.toLocaleString() ?? "0")} <em>credits</em>
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
                    {transactions.length > 0 ? (
                      transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="td-d">{tx.date}</td>
                          <td className="td-desc">{tx.description}</td>
                          <td className="td-amt">E£ {tx.amount}</td>
                          <td>
                            <span className={tx.status === "completed" ? "paid" : "pending"}>
                              {tx.status}
                            </span>
                          </td>
                          <td>
                            <button className="btn-dl" onClick={() => dlInv(tx.date)}>
                              ↓ Download
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                          {isLoadingHistory ? "Loading history..." : "No transactions found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default Subscription;
