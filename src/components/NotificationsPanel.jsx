import React, { useEffect, useRef } from 'react';
import { useNotifications } from './NotificationsContext';
import '../css/NotificationsPanel.css';

export default function NotificationsPanel() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    isOpen,
    closeNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const panelRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeNotifications();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeNotifications]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('notifications-drawer-overlay')) {
      closeNotifications();
    }
  };

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      loadMore();
    }
  };

  /** Format created_at into a human-readable relative time string */
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    
    // If backend already sends a relative time string (e.g. "2 minutes ago"), use it
    if (typeof dateStr === 'string' && /[a-zA-Z]/.test(dateStr) && !dateStr.includes('T')) {
      return dateStr;
    }
    
    try {
      const timestamp = new Date(dateStr).getTime();
      if (isNaN(timestamp)) return dateStr; // Not a valid ISO date, return raw string
      
      const diff = Date.now() - timestamp;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins} min ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="notifications-drawer-overlay" onClick={handleOverlayClick}>
      <div className="notifications-drawer" ref={panelRef}>
        <div className="notification-header">
          <div className="notification-title-area">
            <h2>Notifications</h2>
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </div>
          <button className="close-btn" onClick={closeNotifications} aria-label="Close notifications">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="notification-actions-bar">
          <button onClick={markAllAsRead} className="action-link" disabled={unreadCount === 0}>
            Mark all as read
          </button>
          <button onClick={clearAll} className="action-link text-danger" disabled={notifications.length === 0}>
            Clear all
          </button>
        </div>

        <div className="notification-list" ref={listRef} onScroll={handleScroll}>
          {isLoading ? (
            <div className="empty-notifications">
              <p>Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-notifications">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <p>You're all caught up!</p>
              <span>No new notifications</span>
            </div>
          ) : (
            <>
              {notifications.map((notification) => {
                const isRead = notification.is_read ?? notification.isRead ?? false;
                const time = notification.created_at
                  ? formatTime(notification.created_at)
                  : notification.time ?? '';
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${isRead ? 'read' : 'unread'}`}
                  >
                    {!isRead && <div className="unread-indicator"></div>}

                    <div className="notification-content">
                      <div className="notification-item-header">
                        <h4>{notification.title}</h4>
                        <span className="notification-time">{time}</span>
                      </div>
                      <p className="notification-message">{notification.message ?? notification.body ?? ''}</p>

                      {!isRead && (
                        <button
                          className="mark-read-btn"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoadingMore && (
                <div className="notifications-load-more">Loading more...</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
