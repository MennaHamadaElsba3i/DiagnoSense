import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentSubscriptionAPI } from "./mockAPI";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isSubLoading, setIsSubLoading] = useState(true);
  const [subError, setSubError] = useState(null);

  const fetchSubscription = useCallback(async () => {
    setIsSubLoading(true);
    setSubError(null);
    try {
      const result = await getCurrentSubscriptionAPI();
      if (result.success && result.data) {
        setSubscriptionData(result.data);
      } else {
        setSubError(result.message || "Failed to load subscription data");
      }
    } catch (err) {
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
    };
  }
  return ctx;
}
