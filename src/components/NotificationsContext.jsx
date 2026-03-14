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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // Prevent parallel loadMore calls
  const isLoadingMoreRef = useRef(false);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      try {
        const [notifResult, countResult] = await Promise.all([
          getNotificationsAPI(),
          getUnreadNotificationsCountAPI(),
        ]);

        if (cancelled) return;

        if (notifResult && notifResult.success !== false && (notifResult.data || Array.isArray(notifResult))) {
          const list = Array.isArray(notifResult)
            ? notifResult
            : (Array.isArray(notifResult.data) ? notifResult.data : notifResult.data?.data ?? []);
          setNotifications(list);
          setNextCursor(notifResult.data?.next_cursor ?? notifResult.meta?.next_cursor ?? null);
        }

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
      if (!cancelled) setIsLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, []);

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

    const channelName = `App.Models.User.${resolvedUserId}`;
    console.log(`[Echo Debug] EXACT CHANNEL NAME: ${channelName}`);
    console.log(`[Echo Debug] CONFIRMATION: Calling echo.private('${channelName}') right now...`);
    
    // Check if Pusher/Echo correctly initializes
    const channel = echo.private(channelName);

    channel.notification((notification) => {
      console.log(`[Echo Debug] Realtime notification received on ${channelName}:`, notification);
      
      setNotifications((prev) => {
        // Safe fallback logic - make payload robust if missing id/created_at
        const safeId = notification.id || `realtime-${Date.now()}-${Math.random()}`;
        const safeTitle = notification.title || "New Notification";
        const safeMessage = notification.message || notification.body || "";
        
        // Deduplicate based on safe id
        if (prev.some((n) => n.id === safeId)) return prev;
        
        // Show lightweight toast for the new incoming notification
        setLiveToast({
          id: safeId,
          title: safeTitle,
          message: safeMessage
        });
        
        // Auto-dismiss toast
        setTimeout(() => setLiveToast(null), 4000);
        
        return [{
          ...notification,
          id: safeId,
          title: safeTitle,
          message: safeMessage,
          created_at: notification.created_at || 'Just now',
          is_read: notification.is_read || false
        }, ...prev];
      });
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
        markAsRead,
        markAllAsRead,
        clearAll,
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
      <style dangerouslySetInnerHTML={{__html: `
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
      openNotifications: () => {},
      closeNotifications: () => {},
      loadMore: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearAll: () => {},
    };
  }
  return ctx;
}
