import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getNotificationsAPI,
  getUnreadNotificationsCountAPI,
  markNotificationAsReadAPI,
  markAllNotificationsAsReadAPI,
  clearAllNotificationsAPI,
} from "./mockAPI";
import echo from "./echo";
import { getJsonCookie } from "./cookieUtils";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // Prevent parallel loadMore calls
  const isLoadingMoreRef = useRef(false);
  // Keep track of which notification IDs we've already shown as live toasts in this session
  const displayedToastIds = useRef(new Set());
  // Tracks whether the full notifications list has been fetched at least once
  const notificationsLoadedRef = useRef(false);
  // Tracks whether a panel-open fetch is already in progress (prevents double-fetching)
  const isFetchingListRef = useRef(false);

  // ── Initial fetch: ONLY unread count — do NOT fetch full list ─────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const countResult = await getUnreadNotificationsCountAPI();
        if (cancelled) return;
        if (countResult.success && countResult.data != null) {
          const count =
            typeof countResult.data === "number"
              ? countResult.data
              : countResult.data.count ?? countResult.data.unread_count ?? 0;
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("[NotificationsProvider] init error", err);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Lazy fetch: full notifications list only when panel is opened ──────────
  useEffect(() => {
    if (!isOpen) return;                         // panel closed — skip
    if (notificationsLoadedRef.current) return;  // already loaded — reuse
    if (isFetchingListRef.current) return;       // fetch in progress — skip

    isFetchingListRef.current = true;
    setIsLoading(true);

    const fetchList = async () => {
      try {
        const result = await getNotificationsAPI();
        if (result && result.success !== false && (result.data || Array.isArray(result))) {
          const list = Array.isArray(result)
            ? result
            : (Array.isArray(result.data) ? result.data : result.data?.data ?? []);

          setNotifications((prev) => {
            // Merge: preserve any real-time items that arrived before the list loaded
            const ids = new Set(list.map((n) => n.id));
            const realtimeOnly = prev.filter((n) => !ids.has(n.id));
            return [...realtimeOnly, ...list];
          });
          setNextCursor(result.data?.next_cursor ?? result.meta?.next_cursor ?? null);
        }
        notificationsLoadedRef.current = true;
      } catch (err) {
        console.error("[NotificationsProvider] lazy-load error", err);
      }
      setIsLoading(false);
      isFetchingListRef.current = false;
    };

    fetchList();
  }, [isOpen]);

  // ── refreshNotifications: always refresh count; list only if already loaded ─
  const refreshNotifications = useCallback(async () => {
    try {
      // Always refresh the unread count (used by the bell badge on every page)
      const countResult = await getUnreadNotificationsCountAPI();
      if (countResult.success && countResult.data != null) {
        const count =
          typeof countResult.data === "number"
            ? countResult.data
            : countResult.data.count ?? countResult.data.unread_count ?? 0;
        setUnreadCount(count);
      }

      // Only refresh the full list if the panel was already opened at least once
      if (!notificationsLoadedRef.current) return;

      const notifResult = await getNotificationsAPI();
      if (notifResult && notifResult.success !== false && (notifResult.data || Array.isArray(notifResult))) {
        const list = Array.isArray(notifResult)
          ? notifResult
          : (Array.isArray(notifResult.data) ? notifResult.data : notifResult.data?.data ?? []);

        setNotifications((prev) => {
          const prevIds = new Set(prev.map(n => n.id));
          const onlyNew = list.filter(n => !prevIds.has(n.id));
          return [...onlyNew, ...prev];
        });
        setNextCursor(notifResult.data?.next_cursor ?? notifResult.meta?.next_cursor ?? null);
      }
    } catch (err) {
      console.error("[NotificationsProvider] refresh error", err);
    }
  }, []);

  // ── fetchAndToastLatest: on-demand fetch used after subscription actions ────
  // Fetches the notifications list, merges it into state, refreshes the unread
  // count, and shows the most recently unread notification as a toast popup.
  // This is intentionally NOT called on every page load — only explicitly after
  // successful mutations (cancel sub, subscribe, Stripe top-up, etc.).
  const fetchAndToastLatest = useCallback(async () => {
    try {
      // 1. Fetch fresh list — always, regardless of whether panel was opened
      const notifResult = await getNotificationsAPI();
      if (!notifResult || notifResult.success === false) return;

      const list = Array.isArray(notifResult)
        ? notifResult
        : (Array.isArray(notifResult.data) ? notifResult.data : notifResult.data?.data ?? []);

      // 2. Merge into state (keep real-time items, replace any overlapping IDs)
      if (list.length > 0) {
        setNotifications((prev) => {
          const ids = new Set(list.map((n) => n.id));
          const realtimeOnly = prev.filter((n) => !ids.has(n.id));
          return [...realtimeOnly, ...list];
        });
        setNextCursor(notifResult.data?.next_cursor ?? notifResult.meta?.next_cursor ?? null);
        notificationsLoadedRef.current = true;
      }

      // 3. Refresh unread count from server
      const countResult = await getUnreadNotificationsCountAPI();
      if (countResult.success && countResult.data != null) {
        const count =
          typeof countResult.data === "number"
            ? countResult.data
            : countResult.data.count ?? countResult.data.unread_count ?? 0;
        setUnreadCount(count);
      }

      // 4. Show toast for most recent unread notification from the fresh list
      const latestUnread = list.find((n) => !n.is_read);
      if (latestUnread) {
        const toastId = latestUnread.id || `fetch-${Date.now()}`;
        if (!displayedToastIds.current.has(toastId)) {
          displayedToastIds.current.add(toastId);
          setLiveToast({
            id: toastId,
            title: latestUnread.title || "New Notification",
            message: latestUnread.message || latestUnread.body || "",
          });
          setTimeout(() => setLiveToast(null), 5000);
        }
      }
    } catch (err) {
      console.error("[NotificationsProvider] fetchAndToastLatest error:", err);
    }
  }, []);

  // ── Auto-toast recent unread notifications ──────────────────────────────────
  useEffect(() => {
    if (isLoading || notifications.length === 0) return;

    // Filter for unread notifications created in the last 2 minutes
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const freshUnread = notifications.filter(n => {
      if (n.is_read || displayedToastIds.current.has(n.id)) return false;

      // Try to parse created_at. Handled formats: ISO, "2024-03-..." etc.
      const createdAt = new Date(n.created_at);
      return !isNaN(createdAt.getTime()) && createdAt > twoMinutesAgo;
    });

    if (freshUnread.length > 0) {
      // Pick the most recent one to toast
      const target = freshUnread[0];
      displayedToastIds.current.add(target.id);

      setLiveToast({
        id: target.id,
        title: target.title || "New Notification",
        message: target.message || target.body || ""
      });
      setTimeout(() => setLiveToast(null), 5000);
    }
  }, [notifications, isLoading]);

  // ── Real-time via Echo ─────────────────────────────────────────────────────

  // Debug log on every render
  console.log("Notifications current user cookie inside render:", getJsonCookie("user"));

  const [resolvedUserId, setResolvedUserId] = useState(null);

  // 1. Poll/Wait for User to resolve
  useEffect(() => {
    if (resolvedUserId) return; // Stop checking if we already have it

    const checkUser = () => {
      const rawUser = getJsonCookie("user");
      const extId = rawUser?.id || rawUser?.user?.id || rawUser?.data?.id || null;

      console.log("[NotificationsContext Debug] Checking for user in cookie...");
      console.log("[NotificationsContext Debug] Raw user object:", rawUser);
      console.log("[NotificationsContext Debug] Extracted user id:", extId);

      if (extId && extId !== resolvedUserId) {
        console.log("[NotificationsContext Debug] Setting resolvedUserId:", extId);
        setResolvedUserId(extId);
      }
    };

    checkUser(); // Check immediately
    const interval = setInterval(checkUser, 2000); // Retry every 2s if unavailable

    return () => clearInterval(interval);
  }, [resolvedUserId]);

  // 2. Setup Real-time Echo Subscription
  useEffect(() => {
    if (!resolvedUserId) {
      console.log("[NotificationsContext Debug] Realtime subscription waiting for resolvedUserId...");
      return;
    }

    const channelName = `App.Models.Doctor.${resolvedUserId}`;
    console.log(`[Echo Debug] EXACT CHANNEL NAME: ${channelName}`);
    console.log(`[Echo Debug] CONFIRMATION: Calling echo.private('${channelName}') right now...`);

    // Check if Pusher/Echo correctly initializes
    const channel = echo.private(channelName);

    channel.notification((notification) => {
      console.log(`[Echo Debug] Realtime notification received on ${channelName}:`, notification);

      // Resolve safe fields OUTSIDE the updater so they are stable closures
      const safeId = notification.id || `realtime-${Date.now()}-${Math.random()}`;
      const safeTitle = notification.title || "New Notification";
      const safeMessage = notification.message || notification.body || "";

      setNotifications((prev) => {
        // Deduplicate based on safe id
        if (prev.some((n) => n.id === safeId)) return prev;

        return [{
          ...notification,
          id: safeId,
          title: safeTitle,
          message: safeMessage,
          created_at: notification.created_at || 'Just now',
          is_read: notification.is_read || false
        }, ...prev];
      });

      // ── IMPORTANT: setLiveToast must be called OUTSIDE the setNotifications
      // updater. In React 18 concurrent mode, calling setState for other state
      // variables from inside a functional updater is unreliable — calls can be
      // silently dropped during batching. Calling here (in the event handler
      // closure) guarantees the toast always fires.
      displayedToastIds.current.add(safeId);
      setLiveToast({ id: safeId, title: safeTitle, message: safeMessage });
      setTimeout(() => setLiveToast(null), 4000);

      setUnreadCount((c) => c + 1);
    });

    return () => {
      console.log(`[Echo Debug] Leaving channel: ${channelName}`);
      echo.leave(channelName);
    };
  }, [resolvedUserId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openNotifications = useCallback(() => setIsOpen(true), []);
  const closeNotifications = useCallback(() => setIsOpen(false), []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getNotificationsAPI(nextCursor);
      if (result && result.success !== false && (result.data || Array.isArray(result))) {
        const newItems = Array.isArray(result)
          ? result
          : (Array.isArray(result.data) ? result.data : result.data?.data ?? []);

        setNotifications((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          const unique = newItems.filter((n) => !ids.has(n.id));
          return [...prev, ...unique];
        });
        setNextCursor(result.data.next_cursor ?? result.meta?.next_cursor ?? null);
      }
    } catch (err) {
      console.error("[NotificationsProvider] loadMore error", err);
    }

    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, [nextCursor]);

  const markAsRead = useCallback(async (id) => {
    try {
      const result = await markNotificationAsReadAPI(id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("[NotificationsProvider] markAsRead error", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const result = await markAllNotificationsAsReadAPI();
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("[NotificationsProvider] markAllAsRead error", err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      const result = await clearAllNotificationsAPI();
      if (result.success) {
        setNotifications([]);
        setUnreadCount(0);
        setNextCursor(null);
        // Allow re-fetch next time panel is opened
        notificationsLoadedRef.current = false;
      }
    } catch (err) {
      console.error("[NotificationsProvider] clearAll error", err);
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        isOpen,
        openNotifications,
        closeNotifications,
        loadMore,
        refreshNotifications,
        refreshUnreadCount: refreshNotifications,
        fetchAndToastLatest,
        markAsRead,
        markAllAsRead,
        clearAll,
        triggerToast: (notification) => {
          if (!notification) return;
          const safeId = notification.id || `manual-${Date.now()}`;
          displayedToastIds.current.add(safeId);
          setLiveToast({
            id: safeId,
            title: notification.title || "Message",
            message: notification.message || notification.body || ""
          });
          setTimeout(() => setLiveToast(null), 5000);
        }
      }}
    >
      {children}

      {/* Lightweight Real-time Indicator Toast */}
      {liveToast && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "24px",
          backgroundColor: "var(--surface-color, #ffffff)",
          border: "1px solid var(--border-color, #e5e7eb)",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          padding: "16px",
          minWidth: "300px",
          maxWidth: "350px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          animation: "slideInRight 0.3s ease-out forwards",
          cursor: "pointer"
        }}
          onClick={() => {
            setLiveToast(null);
            openNotifications();
          }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--text-primary, #111827)" }}>
              {liveToast.title}
            </h4>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6", marginTop: "4px" }} />
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary, #6b7280)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {liveToast.message}
          </p>
        </div>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isLoadingMore: false,
      isOpen: false,
      openNotifications: () => { },
      closeNotifications: () => { },
      loadMore: () => { },
      refreshNotifications: () => { },
      refreshUnreadCount: () => { },
      fetchAndToastLatest: () => { },
      markAsRead: () => { },
      markAllAsRead: () => { },
      clearAll: () => { },
    };
  }
  return ctx;
}
