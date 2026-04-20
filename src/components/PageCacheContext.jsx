/**
 * PageCacheContext — cross-navigation in-memory cache
 *
 * The cache store is a module-level Map, so it lives OUTSIDE React's
 * component tree and survives route unmounts. The context only exposes
 * read/write/invalidate helpers — it never stores data in React state,
 * so writing to the cache never triggers a re-render.
 *
 * Usage:
 *   const { getCache, setCache, invalidateCache, invalidatePrefix } = usePageCache();
 *
 * Invalidation events (window custom events):
 *   "patientListInvalidated"    → clears all  patients_*  keys
 *   "subscriptionChanged"       → clears subscription_plans + subscription_transactions
 *   "profileUpdated"            → clears settings_profile
 *   "dashboardInvalidated"      → clears all  dashboard_*  keys
 *   "patientNextVisitUpdated"   → clears all  dashboard_*  keys (Today's Appointments / Queue may change)
 *   "patientStatusUpdated"      → clears all  dashboard_*  keys (Status Distribution may change)
 *   "authChanged"               → clears ENTIRE cache (user switched — must never reuse another user's data)
 *   "cacheInvalidateAll"        → clears ENTIRE cache (emergency / manual full reset)
 */

import React, { createContext, useContext, useRef, useEffect } from "react";

// ─── Module-level store — survives route unmounts ────────────────────────────
const _cache = new Map();

// ─── Context ─────────────────────────────────────────────────────────────────
const PageCacheContext = createContext(null);

export function PageCacheProvider({ children }) {
  // Helpers are stable references; they never change, so no useState needed.
  const helpers = useRef({
    /** Return cached value or undefined */
    getCache(key) {
      return _cache.get(key);
    },

    /** Store a value under key */
    setCache(key, value) {
      _cache.set(key, value);
    },

    /** Delete a single key */
    invalidateCache(key) {
      _cache.delete(key);
    },

    /** Delete all keys whose name starts with prefix */
    invalidatePrefix(prefix) {
      for (const key of _cache.keys()) {
        if (key.startsWith(prefix)) {
          _cache.delete(key);
        }
      }
    },

    /** Clear the entire cache — use on logout / user switch */
    clearAll() {
      _cache.clear();
    },

    /** Optional helper for future use */
    getCurrentUserId() {
      return undefined;
    },
  });

  // ── Global invalidation event listeners ──────────────────────────────────
  useEffect(() => {
    const h = helpers.current;

    // patients_* cache cleared when list changes
    const onPatientListInvalidated = () => {
      h.invalidatePrefix("patients_");
    };

    // subscription cache cleared on plan change
    const onSubscriptionChanged = () => {
      h.invalidateCache("subscription_plans");
      h.invalidateCache("subscription_transactions");
    };

    // settings cache cleared on profile save
    const onProfileUpdated = () => {
      h.invalidateCache("settings_profile");
    };

    // dashboard_* cleared on direct dashboard invalidation (add/edit/delete patient)
    const onDashboardInvalidated = () => {
      h.invalidatePrefix("dashboard_");
    };

    // Next visit change → Today's Appointments / Critical Queue may change
    const onPatientNextVisitUpdated = () => {
      h.invalidatePrefix("dashboard_");
    };

    // Status change → Patient Status Distribution on Dashboard may change
    const onPatientStatusUpdated = () => {
      h.invalidatePrefix("dashboard_");
    };

    // ── Auth events: wipe entire cache to prevent cross-user data leakage ──
    const onAuthChanged = () => {
      h.clearAll();
    };

    window.addEventListener("patientListInvalidated", onPatientListInvalidated);
    window.addEventListener("subscriptionChanged", onSubscriptionChanged);
    window.addEventListener("profileUpdated", onProfileUpdated);
    window.addEventListener("dashboardInvalidated", onDashboardInvalidated);
    window.addEventListener("patientNextVisitUpdated", onPatientNextVisitUpdated);
    window.addEventListener("patientStatusUpdated", onPatientStatusUpdated);
    window.addEventListener("authChanged", onAuthChanged);
    window.addEventListener("cacheInvalidateAll", onAuthChanged);

    return () => {
      window.removeEventListener("patientListInvalidated", onPatientListInvalidated);
      window.removeEventListener("subscriptionChanged", onSubscriptionChanged);
      window.removeEventListener("profileUpdated", onProfileUpdated);
      window.removeEventListener("dashboardInvalidated", onDashboardInvalidated);
      window.removeEventListener("patientNextVisitUpdated", onPatientNextVisitUpdated);
      window.removeEventListener("patientStatusUpdated", onPatientStatusUpdated);
      window.removeEventListener("authChanged", onAuthChanged);
      window.removeEventListener("cacheInvalidateAll", onAuthChanged);
    };
  }, []);

  return (
    <PageCacheContext.Provider value={helpers.current}>
      {children}
    </PageCacheContext.Provider>
  );
}

export function usePageCache() {
  const ctx = useContext(PageCacheContext);
  if (!ctx) {
    // Fallback no-op helpers so components never crash if provider is missing
    return {
      getCache: () => undefined,
      setCache: () => {},
      invalidateCache: () => {},
      invalidatePrefix: () => {},
      clearAll: () => {},
      getCurrentUserId: () => undefined,
    };
  }
  return ctx;
}
