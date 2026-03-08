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
        <div className="cm-footer">
          <button className="cm-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`cm-btn-confirm cm-btn-${variant}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
