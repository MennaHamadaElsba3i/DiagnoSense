import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentSubscriptionAPI } from "./mockAPI";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isSubLoading, setIsSubLoading] = useState(true);
  const [subError, setSubError] = useState(null);

  // Credits are derived from subscriptionData — no separate API call needed
  const [credits, setCredits] = useState(null);
  const [isCreditsLoading, setIsCreditsLoading] = useState(true);

  // ── Single fetch for both subscription data AND credits ───────────────────
  // /api/subscription/current returns all the data we need for both.
  // We call it once and split the result instead of making two separate requests.
  const fetchSubscription = useCallback(async () => {
    setIsSubLoading(true);
    setIsCreditsLoading(true);
    setSubError(null);
    try {
      const result = await getCurrentSubscriptionAPI();
      if (result.success && result.data) {
        setSubscriptionData(result.data);
        // Derive credits from the same response — no second request needed
        const balance = result.data.balance ?? result.data.credits ?? 0;
        setCredits(balance);
      } else {
        setSubscriptionData(null);
        setCredits(null);
        setSubError(result.message || "Failed to load subscription data");
      }
    } catch (err) {
      console.error("[SubscriptionContext] fetch error:", err);
      setSubscriptionData(null);
      setCredits(null);
      setSubError("Network error loading subscription data");
    }
    setIsSubLoading(false);
    setIsCreditsLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // refreshCredits re-uses the same combined fetch — avoids a separate call
  const refreshCredits = useCallback(async () => {
    try {
      const result = await getCurrentSubscriptionAPI();
      if (result.success && result.data) {
        const balance = result.data.balance ?? result.data.credits ?? 0;
        setCredits(balance);
        // Also keep subscriptionData fresh (same response, no extra cost)
        setSubscriptionData(result.data);
      }
    } catch (err) {
      console.error("[SubscriptionContext] refreshCredits error:", err);
    }
  }, []);

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
        refreshCredits,
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
