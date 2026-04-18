import React, { useMemo } from "react";

/**
 * UploadFileItem
 *
 * Shared file-row component used in both AddPatient (local files) and
 * EditPatient (backend files + local new uploads).
 *
 * Props:
 *  fileName   {string}        — display name
 *  viewUrl    {string|null}   — URL/blob-URL to open on "View". null = no view button.
 *  isRemoved  {boolean}       — show strikethrough + Removed badge + undo instead of remove
 *  badge      {string|null}   — optional top-right badge text ("New", etc.)
 *  badgeClass {string}        — "badge-new" | "badge-removed"
 *  onRemove   {() => void}    — called when X / Undo clicked
 *  style      {object}        — optional extra style on the root element
 */
const UploadFileItem = ({
  fileName,
  viewUrl = null,
  isRemoved = false,
  badge = null,
  badgeClass = "badge-new",
  onRemove,
  style = {},
}) => {
  // Derive file extension for the icon colour hint (future-use)
  const ext = fileName ? fileName.split(".").pop().toLowerCase() : "";
  const isImage = ["jpg", "jpeg", "png"].includes(ext);

  return (
    <div
      className={`uploaded-file-item ufi-shared${isRemoved ? " removed" : ""}`}
      style={style}
    >
      {/* File type icon */}
      <div className="file-type-icon">
        {isImage ? (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        ) : (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* File name */}
      <span
        className={`file-name${isRemoved ? " file-name-removed" : ""}`}
        title={fileName}
      >
        {fileName}
      </span>

      {/* Optional badge */}
      {badge && !isRemoved && (
        <span className={`ufi-badge ${badgeClass}`}>{badge}</span>
      )}

      {/* Removed badge */}
      {isRemoved && (
        <span className="removed-badge">Removed</span>
      )}

      {/* Actions */}
      <div className="existing-file-actions">
        {/* View / preview button */}
        {viewUrl && !isRemoved && (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-view-file"
            title="View file"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="16" height="16" fill="none" stroke="#2A66FF" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </a>
        )}
         {/* Remove / Undo button */}
        {onRemove && (
          <button
            className={`file-remove-btn${isRemoved ? " undo-btn" : ""}`}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title={isRemoved ? "Undo remove" : "Remove file"}
          >
            {isRemoved ? (
              /* Undo arrow */
              <svg width="16" height="16" fill="none" stroke="#2A66FF" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              /* X icon */
              <svg width="18" height="18" fill="none" stroke="#FF5C5C" viewBox="0 0 24 24" style={{ display: "block", flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        )}
    
      </div>
    </div>
  );
};

export default UploadFileItem;
