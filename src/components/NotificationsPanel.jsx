import React, { useEffect, useRef, useState } from 'react';
import '../css/NotificationsPanel.css';

const DUMMY_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Your credits are running low',
    message: 'You have less than 100 credits remaining. Top up soon to avoid interruption.',
    time: '2 hours ago',
    isRead: false,
    type: 'warning'
  },
  {
    id: 2,
    title: 'You successfully added credits',
    message: '1000 credits have been added to your account.',
    time: '1 day ago',
    isRead: true,
    type: 'success'
  },
  {
    id: 3,
    title: 'Your subscription was upgraded',
    message: 'Welcome to the Pro plan! Enjoy your new features.',
    time: '3 days ago',
    isRead: true,
    type: 'success'
  },
  {
    id: 4,
    title: 'Your billing payment was successful',
    message: 'Invoice #INV-2026-03 for $49.00 has been paid.',
    time: '1 week ago',
    isRead: true,
    type: 'info'
  },
  {
    id: 5,
    title: 'New feature available',
    message: 'Check out the new Decision Support module in the sidebar.',
    time: '2 weeks ago',
    isRead: true,
    type: 'info'
  }
];

export default function NotificationsPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('notifications-drawer-overlay')) {
      onClose();
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notifications-drawer-overlay" onClick={handleOverlayClick}>
      <div className="notifications-drawer" ref={panelRef}>
        <div className="notification-header">
          <div className="notification-title-area">
            <h2>Notifications</h2>
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close notifications">
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

        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="empty-notifications">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <p>You're all caught up!</p>
              <span>No new notifications</span>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
              >
                {!notification.isRead && <div className="unread-indicator"></div>}

                <div className="notification-content">
                  <div className="notification-item-header">
                    <h4>{notification.title}</h4>
                    <span className="notification-time">{notification.time}</span>
                  </div>
                  <p className="notification-message">{notification.message}</p>

                  {!notification.isRead && (
                    <button
                      className="mark-read-btn"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
