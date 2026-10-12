import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "../css/ConfirmModal.css";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon,
  isLoading = false,
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-box" onClick={(e) => e.stopPropagation()}>
        <div className="cm-header">
          {icon && <div className={`cm-icon cm-icon-${variant}`}>{icon}</div>}
          <h2 className="cm-title">{title}</h2>
        </div>
        <p className="cm-desc">{description}</p>
        <div className="cm-footer" style={!cancelText ? { justifyContent: "center" } : (!confirmText ? { justifyContent: "flex-start" } : undefined)}>
          {cancelText && (
            <button className="cm-btn-cancel" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </button>
          )}
          {confirmText && (
            <button className={`cm-btn-confirm cm-btn-${variant}`} onClick={onConfirm} disabled={isLoading} style={!cancelText ? { width: "100%" } : undefined}>
              {isLoading ? "Processing..." : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
