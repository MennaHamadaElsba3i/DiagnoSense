import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getCurrentSubscriptionAPI } from "./mockAPI";

const extractCredits = (response) => {
  if (!response) return null;
  const possibleValues = [
    response?.data?.credits,
    response?.data?.wallet_balance,
    response?.data?.balance,
    response?.data?.data?.credits,
    response?.data?.data?.wallet_balance,
    response?.data?.data?.balance,
    response?.credits,
    response?.wallet_balance,
    response?.balance,
  ];
  for (const val of possibleValues) {
    if (val != null) {
      const parsed = typeof val === "string" ? parseFloat(val) : val;
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isSubLoading, setIsSubLoading] = useState(true);
  const [subError, setSubError] = useState(null);

  const [credits, setCredits] = useState(null);
  const [isCreditsLoading, setIsCreditsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    setIsSubLoading(true);
    setIsCreditsLoading(true);
    setSubError(null);
    try {
      const result = await getCurrentSubscriptionAPI();
      console.log(
        "[SubscriptionContext] raw API result:",
        JSON.stringify(result),
      );

      const extractedCredits = extractCredits(result);
      console.log("[SubscriptionContext] extractedCredits:", extractedCredits);
      if (extractedCredits !== null) {
        setCredits(extractedCredits);
      }

      if (result && result.success && result.data) {
        setSubscriptionData(result.data);
        setSubError(null);
      } else {
        setSubscriptionData(null);
        setSubError(result?.message || null);
      }
    } catch (err) {
      console.error("[SubscriptionContext] fetch error:", err);
      setSubscriptionData(null);
      setSubError("Network error loading subscription data");
    }
    setIsSubLoading(false);
    setIsCreditsLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const refreshCredits = useCallback(async () => {
    try {
      const result = await getCurrentSubscriptionAPI();

      const extractedCredits = extractCredits(result);
      if (extractedCredits !== null) {
        setCredits(extractedCredits);
      }

      if (result && result.success && result.data) {
        setSubscriptionData(result.data);
      } else {
        setSubscriptionData(null);
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
        backendMessage: subError,
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
