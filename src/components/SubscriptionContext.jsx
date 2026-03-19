import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentSubscriptionAPI, getTransactionsAPI } from "./mockAPI";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isSubLoading, setIsSubLoading] = useState(true);
  const [subError, setSubError] = useState(null);

  // ── Global Credits (from /api/transactions) ──────────────────────────────
  const [credits, setCredits] = useState(null);
  const [isCreditsLoading, setIsCreditsLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    setIsCreditsLoading(true);
    try {
      const result = await getTransactionsAPI();
      if (result.success && result.data != null) {
        setCredits(result.data.credits ?? null);
      }
    } catch {
      // fail silently — badge will show "—"
    }
    setIsCreditsLoading(false);
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);
  // ─────────────────────────────────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    setIsSubLoading(true);
    setSubError(null);
    try {
      const result = await getCurrentSubscriptionAPI();
      if (result.success && result.data) {
        setSubscriptionData(result.data);
      } else {
        setSubscriptionData(null);
        setSubError(result.message || "Failed to load subscription data");
      }
    } catch (err) {
      setSubscriptionData(null);
      setSubError("Network error loading subscription data");
    }
    setIsSubLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionData,
        isSubLoading,
        subError,
        refreshSubscription: fetchSubscription,
        // Credits
        credits,
        isCreditsLoading,
        refreshCredits: fetchCredits,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    return {
      subscriptionData: null,
      isSubLoading: false,
      subError: null,
      refreshSubscription: () => {},
      credits: null,
      isCreditsLoading: false,
      refreshCredits: () => {},
    };
  }
  return ctx;
}
