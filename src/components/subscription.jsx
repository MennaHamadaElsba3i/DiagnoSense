import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import { useSubscription } from "./SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import LogoutConfirmation from "./ConfirmationModal.jsx";
import ConfirmModal from "./ConfirmModal";
import "../css/subscription.css";
import Swal from "sweetalert2";
import {
  chargeWalletAPI,
  getTransactionsAPI,
  getSubscriptionPlansAPI,
  subscribeToPlanAPI,
  subscribeToPayPerUseAPI,
  cancelSubscriptionAPI,
} from "./mockAPI.js";
import { useNotifications } from "./NotificationsContext";
import { getDoctorInitials } from "./Dashboard";
import { usePageCache } from "./PageCacheContext";

function Subscription() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const {
    unreadCount,
    openNotifications,
    refreshNotifications,
    fetchAndToastLatest,
  } = useNotifications();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const {
    subscriptionData,
    isSubLoading,
    refreshSubscription,
    credits,
    isCreditsLoading,
    refreshCredits,
  } = useSubscription();
  const { getCache, setCache } = usePageCache();
  const prevUnreadCount = useRef(unreadCount);
  const walletBalance =
    subscriptionData?.wallet_balance != null
      ? subscriptionData.wallet_balance.toLocaleString()
      : "—";
  const isPayPerUse = subscriptionData?.billing_mode === "pay_per_use";
  const isSubscription = subscriptionData?.billing_mode === "subscription";
  const [transactions, setTransactions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCancelledLocally, setIsCancelledLocally] = useState(false);
  // Tracks if transactions have been loaded at least once for the billing tab
  const transactionsFetchedRef = useRef(false);

  const fetchTransactions = async () => {
    // ── Cache check ──
    const cached = getCache("subscription_transactions");
    if (cached) {
      setTransactions(cached);
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    const result = await getTransactionsAPI();
    console.log("--- Transactions API Full Response ---", result);
    if (result.success && result.data) {
      setTransactions(result.data.transactions);
      // ── Store to cache ──
      setCache("subscription_transactions", result.data.transactions);
      // credits are managed globally via context — no local state needed
    }
    setIsLoadingHistory(false);
  };

  // (Transaction load moved below activeTab declaration to avoid ReferenceError)

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

  // ── Robust Closure Fallback ────────────────────────────────────────────────
  // Stripe redirects back to this page inside the popup after payment.
  // We post STRIPE_SUCCESS to the opener so the parent window can refresh
  // credits, unread count, and toast — then close the popup.
  useEffect(() => {
    if (window.name === "stripe_checkout" && window.opener) {
      console.log(
        "[Subscription] Stripe checkout popup detected — notifying opener then closing.",
      );
      window.opener.postMessage(
        { type: "STRIPE_SUCCESS" },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  // ── Message Listener from Popup ────────────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "STRIPE_SUCCESS") {
        console.log(
          "[Subscription] Stripe success message received from popup.",
        );
        refreshSubscription();
        // fetchAndToastLatest: fetches real backend notification, shows it as
        // the toast popup, and refreshes the unread count in one go.
        fetchAndToastLatest();
        // Invalidate transactions cache so billing tab re-fetches on next open
        window.dispatchEvent(new CustomEvent("subscriptionChanged"));
        transactionsFetchedRef.current = false;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refreshSubscription, fetchAndToastLatest]);

  // ── Real-time Refresh when notification arrives ────────────────────────────
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      console.log(
        "[Subscription] New notification detected, refreshing data...",
      );
      refreshSubscription();
      refreshCredits();
      // Invalidate transactions cache so billing tab re-fetches on next open
      window.dispatchEvent(new CustomEvent("subscriptionChanged"));
      transactionsFetchedRef.current = false;
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, refreshSubscription, refreshCredits]);

  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || location.state?.tab || "plans",
  );

  // ── Lazy: fetch transactions only when user opens Billing & History tab ──
  useEffect(() => {
    if (activeTab !== "billing") return;
    // Invalidate stale ref so re-entering the tab after a mutation re-fetches
    if (!getCache("subscription_transactions")) {
      transactionsFetchedRef.current = false;
    }
    if (transactionsFetchedRef.current) return;
    transactionsFetchedRef.current = true;
    fetchTransactions();
  }, [activeTab, getCache]);

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
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    if (isSubLoading) return;

    console.log("--- Debugging DiagnoSense ---");
    console.log("Plan Name from Backend:", subscriptionData?.plan_name);

    const isEffectivelyCancelled =
      isCancelledLocally ||
      (subscriptionData?.status &&
        subscriptionData.status.toLowerCase() !== "active");

    const hasActivePlan =
      (isSubscription || isPayPerUse) && !isEffectivelyCancelled;

    if (!hasActivePlan) {
      setSelectedPlanId(null);
      return;
    }

    let backendPlanId = null;

    if (isPayPerUse) {
      backendPlanId = "Pay-per-use";
    } else if (isSubscription) {
      if (subscriptionData?.plan_id) {
        backendPlanId = subscriptionData.plan_id;
      } else if (subscriptionData?.plan_name && plans.length > 0) {
        const found = plans.find(
          (p) =>
            p.name.toLowerCase() === subscriptionData.plan_name.toLowerCase(),
        );
        backendPlanId = found ? found.id : subscriptionData.plan_name;
      } else {
        backendPlanId = subscriptionData.plan_name;
      }
    }

    if (backendPlanId != null) {
      setSelectedPlanId(backendPlanId);
    }
  }, [
    isSubLoading,
    isSubscription,
    isPayPerUse,
    subscriptionData,
    isCancelledLocally,
    plans,
  ]);

  const [isPlanConfirmModalOpen, setIsPlanConfirmModalOpen] = useState(false);
  const [isCancelConfirmModalOpen, setIsCancelConfirmModalOpen] =
    useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [subscribingPlanId, setSubscribingPlanId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      // ── Cache check ──
      const cachedPlans = getCache("subscription_plans");
      if (cachedPlans) {
        setPlans(cachedPlans);
        setIsPlansLoading(false);
        return;
      }

      setIsPlansLoading(true);
      setPlansError(null);
      const result = await getSubscriptionPlansAPI();

      if (!isMounted) return;

      setIsPlansLoading(false);
      if (result.success && result.data) {
        setPlans(result.data);
        // ── Cache the plans ──
        setCache("subscription_plans", result.data);
      } else {
        setPlansError(result.message || "Failed to load plans");
      }
    };

    fetchPlans();

    return () => {
      isMounted = false;
    };
  }, [getCache, setCache]);

  const handleTabSwitch = (tabId) => setActiveTab(tabId);

  const cancelSub = () => {
    setIsCancelConfirmModalOpen(true);
  };

  const handleConfirmCancelSub = async () => {
    setIsCancelConfirmModalOpen(false);

    const apiResult = await cancelSubscriptionAPI();

    if (apiResult.success) {
      setIsCancelledLocally(true);
      setSelectedPlanId(null);
      refreshSubscription();
      refreshCredits();
      // Invalidate transactions cache so billing tab re-fetches on next open
      window.dispatchEvent(new CustomEvent("subscriptionChanged"));
      transactionsFetchedRef.current = false;
      fetchAndToastLatest();
    }
  };

  const startPlan = (plan) => {
    if (plan === "Enterprise") {
      window.alert(
        "You selected the Enterprise plan!\nPlease contact our enterprise sales team.",
      );
      return;
    }
    setPendingPlan(plan);
    setIsPlanConfirmModalOpen(true);
  };
  const handleConfirmPlan = async () => {
    const plan = pendingPlan;
    if (!plan) return;

    setIsPlanConfirmModalOpen(false);

    if (plan === "Pay-per-use") {
      setSubscribingPlanId("Pay-per-use");

      const result = await subscribeToPayPerUseAPI();

      setSubscribingPlanId(null);
      setPendingPlan(null);

      if (result.success) {
        setIsCancelledLocally(false);
        setSelectedPlanId("Pay-per-use");
        refreshSubscription();
        refreshCredits();
        // Invalidate transactions cache so billing tab re-fetches on next open
        window.dispatchEvent(new CustomEvent("subscriptionChanged"));
        transactionsFetchedRef.current = false;
        fetchAndToastLatest();
      }
      return;
    }

    const planId = plan?.id || plan;

    setSubscribingPlanId(planId);

    const result = await subscribeToPlanAPI(planId);

    setSubscribingPlanId(null);
    setPendingPlan(null);

    if (result.success) {
      setIsCancelledLocally(false);
      setSelectedPlanId(planId);
      refreshSubscription();
      refreshCredits();
      // Invalidate transactions cache so billing tab re-fetches on next open
      window.dispatchEvent(new CustomEvent("subscriptionChanged"));
      transactionsFetchedRef.current = false;
      fetchAndToastLatest();
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
      window.open(paymentUrl, "stripe_checkout", "width=600,height=700");
      // Invalidate transaction cache so it re-fetches after wallet top-up
      window.dispatchEvent(new CustomEvent("subscriptionChanged"));
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
        onClose={closeLogoutModal}
      />

      <ConfirmModal
        isOpen={isPlanConfirmModalOpen}
        onClose={() => setIsPlanConfirmModalOpen(false)}
        onConfirm={handleConfirmPlan}
        title="Confirm Subscription"
        description={`Are you sure you want to subscribe to the ${pendingPlan?.name || (pendingPlan === "Pay-per-use" ? "Pay-Per-Use" : "selected")} plan?`}
        confirmText="Confirm Subscription"
        cancelText="Maybe Later"
        variant="primary"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
        }
      />

      <ConfirmModal
        isOpen={isCancelConfirmModalOpen}
        onClose={() => setIsCancelConfirmModalOpen(false)}
        onConfirm={handleConfirmCancelSub}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your plan? This action cannot be undone."
        confirmText="Yes, cancel it"
        cancelText="No, keep it"
        variant="danger"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        }
      />

      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="subscription-page-header">
          <h2 className="subscription-title">Manage Subscription</h2>
        </div>
        <div className="subscription-page">
          <div className="subscription-container">
            <div className="current-banner">
              {isSubLoading ? (
                <div
                  style={{ padding: "8px 0", color: "var(--text-secondary)" }}
                >
                  Loading current plan...
                </div>
              ) : isSubscription ? (
                (() => {
                  const isEffectivelyCancelled =
                    isCancelledLocally ||
                    (subscriptionData?.status &&
                      subscriptionData.status.toLowerCase() !== "active");
                  const displayStatus = isEffectivelyCancelled
                    ? "Cancelled"
                    : "Active";
                  const badgeClass = isEffectivelyCancelled
                    ? "cancelled-badge"
                    : "active-badge";
                  const dotClass = isEffectivelyCancelled
                    ? "cancelled-dot"
                    : "active-dot";
                  return (
                    <>
                      <div>
                        <div className="banner-plan-row">
                          <span className="banner-plan-name">
                            {subscriptionData?.plan_name || "Unknown"} Plan
                          </span>
                          <span className={badgeClass}>
                            <span className={dotClass}></span> {displayStatus}
                          </span>
                        </div>
                        <div className="banner-renewal">
                          Next renewal: {subscriptionData?.expires_at || "N/A"}
                          {subscriptionData?.features?.length
                            ? " · " + subscriptionData.features.join(", ")
                            : ""}
                        </div>
                      </div>
                      <div className="banner-right">
                        <div className="banner-price">
                          {isCreditsLoading
                            ? "..."
                            : (credits?.toLocaleString() ?? "0")}{" "}
                          <span>credits</span>
                        </div>
                        {!isEffectivelyCancelled && (
                          <button
                            className="btn-cancel-sub"
                            onClick={cancelSub}
                          >
                            Cancel Subscription
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : isPayPerUse ? (
                (() => {
                  const isEffectivelyCancelled =
                    isCancelledLocally ||
                    (subscriptionData?.status &&
                      subscriptionData.status.toLowerCase() !== "active");
                  const displayStatus = isEffectivelyCancelled
                    ? "Cancelled"
                    : "Active";
                  const badgeClass = isEffectivelyCancelled
                    ? "cancelled-badge"
                    : "active-badge";
                  const dotClass = isEffectivelyCancelled
                    ? "cancelled-dot"
                    : "active-dot";
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
                          {subscriptionData.display_text ||
                            "You are currently using the Pay-Per-Use plan."}
                        </div>
                      </div>
                      <div className="banner-right">
                        <div className="banner-price">
                          {isCreditsLoading
                            ? "..."
                            : (credits?.toLocaleString() ?? "0")}{" "}
                          <span>credits</span>
                        </div>
                        {!isEffectivelyCancelled && (
                          <button
                            className="btn-cancel-sub"
                            onClick={cancelSub}
                          >
                            Cancel Subscription
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div
                  style={{ padding: "8px 0", color: "var(--text-secondary)" }}
                >
                  No active plan
                </div>
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
                  Array.from({ length: 3 }).map((_, i) => {
                    const dummyPlans = [
                      {
                        name: "Basic",
                        price: "4,000",
                        period: "per month*",
                        features: [
                          "Up to 100 summaries",
                          "Basic Analytics",
                          "Standard Support",
                        ],
                      },
                      {
                        name: "Pro",
                        price: "9,000",
                        period: "per month*",
                        features: [
                          "Up to 500 summaries",
                          "Advanced ML Models",
                          "Priority Queue",
                        ],
                      },
                      {
                        name: "Premium",
                        price: "18,000",
                        period: "per month*",
                        features: [
                          "Unlimited summaries",
                          "Enterprise Tools",
                          "24/7 Priority Support",
                        ],
                      },
                    ];
                    const p = dummyPlans[i];
                    return (
                      <div
                        key={i}
                        className="preview-shimmer"
                        style={{
                          pointerEvents: "none",
                          borderRadius: "13px",
                          width: "100%",
                          display: "block",
                          height: "100%",
                        }}
                      >
                        <div className="plan-card" style={{ height: "100%" }}>
                          <div className="plan-name">{p.name}</div>
                          <span className="plan-price">E£ {p.price}</span>
                          <div className="plan-period">{p.period}</div>
                          <div className="plan-tagline"></div>
                          <div className="plan-feats">
                            {p.features.map((f, idx) => (
                              <div className="feat" key={idx}>
                                <span className="feat-ck">✓</span>
                                <span className="feat-t">{f}</span>
                              </div>
                            ))}
                          </div>
                          <button
                            className="btn-plan"
                            style={{ cursor: "not-allowed" }}
                          >
                            Get Started
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : plansError ? (
                  <div
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      gridColumn: "1 / -1",
                      color: "var(--danger-color)",
                    }}
                  >
                    {plansError}
                  </div>
                ) : plans.length === 0 ? (
                  <div
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      gridColumn: "1 / -1",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No plans available at the moment.
                  </div>
                ) : (
                  plans.map((plan) => {
                    const isCurrent =
                      (selectedPlanId &&
                        plan.id &&
                        String(selectedPlanId) === String(plan.id)) ||
                      (selectedPlanId &&
                        plan.name &&
                        String(selectedPlanId).toLowerCase() ===
                          String(plan.name).toLowerCase());
                    return (
                      <div
                        className={`plan-card ${isCurrent ? "popular border-2 border-blue-500" : ""}`}
                        key={plan.id}
                      >
                        {isCurrent && (
                          <div className="badge-current">Current Plan</div>
                        )}
                        <div className="plan-name">{plan.name}</div>
                        <span className="plan-price">
                          E£ {plan.price.toLocaleString()}
                        </span>
                        <div className="plan-period">
                          per{" "}
                          {plan.duration_days === 30
                            ? "month"
                            : `${plan.duration_days} days`}
                          *
                        </div>
                        <div className="plan-tagline"></div>
                        <div className="plan-feats">
                          {plan.summaries_limit > 0 && (
                            <div className="feat">
                              <span className="feat-ck">✓</span>
                              <span className="feat-t">
                                Up to {plan.summaries_limit} summaries
                              </span>
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
                          style={{
                            cursor:
                              subscribingPlanId === plan.id || isCurrent
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {subscribingPlanId === plan.id
                            ? "Subscribing..."
                            : isCurrent
                              ? "Current Plan"
                              : "Get Started"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bottom-grid">
                {isPlansLoading ? (
                  <>
                    <div
                      className="preview-shimmer"
                      style={{
                        pointerEvents: "none",
                        borderRadius: "13px",
                        width: "100%",
                        display: "block",
                      }}
                    >
                      <div
                        className="ppu-card"
                        style={{ pointerEvents: "none" }}
                      >
                        <div>
                          <div className="ppu-lbl">Pay-per-use</div>
                          <div className="ppu-sub">Most popular plan</div>
                          <div className="ppu-price">
                            E£ 20 <em>/ file</em>
                          </div>
                        </div>
                        <div className="ppu-right">
                          <div className="feat">
                            <span className="feat-ck">✓</span>
                            <span style={{ fontSize: "12px" }}>
                              All features
                            </span>
                          </div>
                          <button
                            className="btn-solid"
                            style={{ cursor: "not-allowed" }}
                          >
                            Get Started
                          </button>
                        </div>
                      </div>
                    </div>
                    <div
                      className="preview-shimmer"
                      style={{
                        pointerEvents: "none",
                        borderRadius: "13px",
                        width: "100%",
                        display: "block",
                      }}
                    >
                      <div
                        className="ent-card"
                        style={{ pointerEvents: "none" }}
                      >
                        <div className="ent-name">Enterprise</div>
                        <div className="ent-inner">
                          <div className="ent-feats">
                            <div className="feat">
                              <span className="feat-ck">✓</span>
                              <span className="feat-t">
                                Annual per-doctor license with yearly
                                calculation and volume discount
                              </span>
                            </div>
                            <div className="feat">
                              <span className="feat-ck">✓</span>
                              <span className="feat-t">
                                One-time setup and implementation fee
                              </span>
                            </div>
                          </div>
                          <button
                            className="btn-solid"
                            style={{ cursor: "not-allowed" }}
                          >
                            Get Started
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`ppu-card ${selectedPlanId === "Pay-per-use" ? "popular border-2 border-blue-500" : ""}`}
                    >
                      {selectedPlanId === "Pay-per-use" && (
                        <div className="badge-current">Current Mode</div>
                      )}
                      <div>
                        <div className="ppu-lbl">Pay-per-use</div>
                        <div className="ppu-sub">Most popular plan</div>
                        <div className="ppu-price">
                          E£ 20 <em>/ file</em>
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
                          disabled={
                            subscribingPlanId === "Pay-per-use" ||
                            selectedPlanId === "Pay-per-use"
                          }
                          style={{
                            cursor:
                              subscribingPlanId === "Pay-per-use" ||
                              selectedPlanId === "Pay-per-use"
                                ? "not-allowed"
                                : "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {subscribingPlanId === "Pay-per-use"
                            ? "Switching..."
                            : selectedPlanId === "Pay-per-use"
                              ? "Current Mode"
                              : "Get Started"}
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
                              Annual per-doctor license with yearly calculation
                              and volume discount
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
                              Payment includes discounted annual fee plus setup
                              at contract start.
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
                  </>
                )}
              </div>
            </div>

            <div
              className={`tab-panel ${activeTab === "usage" ? "active" : ""}`}
            >
              {isSubLoading ? (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  Loading usage data...
                </div>
              ) : isSubscription ? (
                (() => {
                  const isEffectivelyCancelled =
                    isCancelledLocally ||
                    (subscriptionData?.status &&
                      subscriptionData.status.toLowerCase() !== "active");
                  const displayStatus = isEffectivelyCancelled
                    ? "Cancelled"
                    : "Active";
                  const badgeClass = isEffectivelyCancelled
                    ? "cancelled-badge"
                    : "green-badge";
                  const dotClass = isEffectivelyCancelled
                    ? "cancelled-dot"
                    : "g-dot";
                  return (
                    <>
                      <div className="usage-box">
                        <div className="u-big">
                          {subscriptionData?.usage?.used ?? 0}{" "}
                          <span>
                            / {subscriptionData?.usage?.total ?? 0} files
                          </span>
                        </div>
                        <div className="u-lbl">Total files used this cycle</div>
                        <div className="u-track">
                          <div
                            className="u-fill"
                            style={{
                              width: `${subscriptionData?.usage?.percentage ?? 0}%`,
                            }}
                          ></div>
                        </div>
                        <div className="u-foot">
                          <div className="u-left">
                            <span>0</span>
                            <span className="u-remain">
                              {subscriptionData?.usage?.remaining ?? 0} files
                              remaining
                            </span>
                          </div>
                          <span>{subscriptionData?.usage?.total ?? 0}</span>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : isPayPerUse ? (
                <div
                  className="usage-box"
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  <div
                    className="u-lbl"
                    style={{ fontSize: "15px", marginBottom: "8px" }}
                  >
                    {subscriptionData?.display_text ||
                      "You are currently using the Pay-Per-Use plan."}
                  </div>
                  <div className="u-lbl">
                    Each file costs E£ {subscriptionData?.price_per_file ?? 20}.
                    Usage tracking is per-file.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  No plan data available.
                </div>
              )}
              <div className="credits-banner">
                <div>
                  <div className="cr-lbl">Available Credits</div>
                  <div className="cr-val">
                    {isCreditsLoading
                      ? "..."
                      : (credits?.toLocaleString() ?? "0")}{" "}
                    <em>credits</em>
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
                    {isCharged ? "Charging..." : "Charge"}
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
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
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
                              <span
                                className={
                                  tx.status === "completed" ? "paid" : "pending"
                                }
                              >
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            style={{ textAlign: "center", padding: "20px" }}
                          >
                            {isLoadingHistory
                              ? "Loading history..."
                              : "No transactions found."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default Subscription;
