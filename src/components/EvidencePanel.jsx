import React from "react";
import "../css/EvidencePanel.css";

// ─────────────────────────────────────────────
// Sub-component: PDF Document Viewer (external / replaceable)
// ─────────────────────────────────────────────
export function PDFDocumentViewer() {
  return (
    <div className="pdf-viewer">
      {/* PDF toolbar */}
      <div className="pdf-toolbar">
        <div className="pdf-nav">
          <button className="pdf-nav-btn" aria-label="Previous page">‹</button>
          <span className="pdf-page-info">1 / 2</span>
          <button className="pdf-nav-btn" aria-label="Next page">›</button>
        </div>
        <div className="pdf-zoom">
          <button className="pdf-zoom-btn" aria-label="Zoom out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <span className="pdf-zoom-level">130%</span>
          <button className="pdf-zoom-btn" aria-label="Zoom in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
        </div>
        <button className="pdf-highlight-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 14.5L3 21v-4l6.5-6.5L9.5 14.5zM14.5 3L21 9.5l-7 7-6.5-6.5 7-7z"/></svg>
          Highlights ON
        </button>
        <button className="pdf-jump-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Jump to Evidence · p.1
        </button>
      </div>

      {/* PDF content */}
      <div className="pdf-content">
        <h2 className="pdf-section-title">1. Patient Demographics</h2>

        <table className="pdf-table">
          <tbody>
            {[
              ["Full Name", "Ramadan Said Mohamed"],
              ["Date of Birth", "23/1/1975"],
              ["Gender", "Male"],
              ["Occupation", "Farmer"],
              ["Place of Birth", "Beni Suef"],
              ["Current Residence", "Giza"],
              ["Marital Status", "Married (Has children, youngest is 11)"],
              ["Smoking / Habits", "Non-smoker, No special habits"],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="pdf-table-label">{label}</td>
                <td className="pdf-table-value">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="pdf-section-title">2. Clinical Case Presentation</h2>

        <div className="pdf-paragraph">
          <span className="pdf-tag chief">Chief Complaint</span>
          <p className="pdf-text">
            <span className="pdf-highlight">
              his main complaint was a sudden feeling of severe headache and being
              very dizzy. the story of his illness started back in 2023 when he suddenly
            </span>{" "}
            began to feel this severe headache along with the dizziness. it was
            persistent and didn't resolve or get better with any medications, and it all
            started with a very sudden onset
          </p>
        </div>

        <p className="pdf-text">
          there is absolutely nothing that increase or decrease the pain. he went to
          see many doctors including two neurologists, a cardiologist and also an ent
          doctor but they found nothing. later on he was admitted to el demerdash
          hospital and they performed a stress ecg for him.
        </p>

        <p className="pdf-text pdf-text-fade">
          the findings showed that his heart rate was very low, it was 21, so the…
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component: EvidencePanel
// ─────────────────────────────────────────────
export default function EvidencePanel({ isOpen, onClose }) {
  return (
    <>
      {/* Background blur overlay */}
      <div
        className={`evidence-overlay ${isOpen ? "evidence-overlay--visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        className={`evidence-panel ${isOpen ? "evidence-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Evidence panel"
      >
        {/* Panel header */}
        <header className="evidence-header">
          <div className="evidence-header-top">
            <span className="evidence-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Explainable AI · Visual Source Tracing
            </span>
            <button className="evidence-close-btn" onClick={onClose} aria-label="Close panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="evidence-title-row">
            <div className="evidence-brain-icon" aria-hidden="true">🧠</div>
            <div>
              <h1 className="evidence-title">Severe Headache &amp; Dizziness</h1>
              <div className="evidence-meta">
                <span className="evidence-badge evidence-badge--critical">Critical</span>
                <span className="evidence-meta-item">Chief Complaint</span>
                <span className="evidence-meta-sep">·</span>
                <span className="evidence-meta-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Page 1 · Clinical Case Presentation
                </span>
              </div>
            </div>
          </div>

          {/* Extracted quote */}
          <div className="evidence-quote-box">
            <span className="evidence-quote-label">Extracted from PDF</span>
            <blockquote className="evidence-quote">
              "his main complaint was a sudden feeling of severe headache and being very dizzy.
              the story of his illness started back in 2023 when he suddenly began to feel
              this severe headache along with the dizziness."
            </blockquote>
          </div>
        </header>

        {/* PDF viewer (external component placeholder) */}
        <div className="evidence-body">
          <PDFDocumentViewer />
        </div>

        {/* Footer interpretation */}
        <footer className="evidence-footer">
          <span className="evidence-footer-icon" aria-hidden="true">💡</span>
          <div>
            <span className="evidence-footer-label">Clinical Interpretation</span>
            <p className="evidence-footer-text">
              Sudden-onset, persistent headache &amp; dizziness — later attributed to profound bradycardia (HR 21 bpm).
            </p>
          </div>
        </footer>
      </aside>
    </>
  );
}