import React from "react";

const LockIcon = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2A66FF"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function LockedFeatureOverlay({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  compact = false,
}) {
  return (
    <div className={`lf-overlay ${compact ? "lf-compact" : ""}`}>
      <div className="lf-overlay-card">
        <div className="lf-icon-wrap">
          <LockIcon size={compact ? 22 : 28} />
        </div>
        <h3 className="lf-title">{title}</h3>
        <p className="lf-desc">{description}</p>
        <div className="lf-actions">
          <button className="lf-btn-primary" onClick={onPrimary}>
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button className="lf-btn-secondary" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
        <p className="lf-micro">Access all features instantly</p>
      </div>
    </div>
  );
}
