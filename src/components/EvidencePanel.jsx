import React, { useEffect, useState, useCallback, useMemo } from "react";
import "../css/EvidencePanel.css";
import { getCookie } from "./cookieUtils";

// React PDF Viewer dependencies
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { searchPlugin } from '@react-pdf-viewer/search';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

// Import pdfjsLib internally to power our exact cascade algorithm
import * as pdfjsLib from "pdfjs-dist";

const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Normalise strips spacing and punctuation
const normalise = (s) => {
  if (typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const fetchPdfAsBlob = async (url) => {
  const token = getCookie("user_token");
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const isBackendUrl = apiBase && url.startsWith(apiBase);

  if (!isBackendUrl) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {}
  }

  const res2 = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/pdf, application/octet-stream, */*",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res2.ok) {
    throw new Error(`HTTP ${res2.status} ${res2.statusText}`);
  }

  const blob2 = await res2.blob();
  return URL.createObjectURL(blob2);
};

// We will instantiate plugins safely inside the component body at the top level
// as required by React Hook rules.

function EvidencePanelInternal({
  isOpen,
  onClose,
  sourceFile,
  selectedAlert,
}) {
  // 1. React Hooks MUST be safely at the top level of the component!
  const searchPluginInstance = searchPlugin();
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { highlight } = searchPluginInstance;
  const { jumpToPage } = pageNavigationPluginInstance;

  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState(null);
  const [searchStatus, setSearchStatus] = useState("");

  const rawEvidence = selectedAlert?.evidence;
  const alertTitle = selectedAlert?.title || selectedAlert?.is_manual || "Evidence";

  // 2. Derive stable primaryEvidenceText directly from the clicked alert
  const primaryEvidenceText = useMemo(() => {
    if (!rawEvidence) return "";
    let target = "";
    if (Array.isArray(rawEvidence)) {
      const validStr = rawEvidence.find(item => typeof item === 'string' && item.trim());
      target = validStr || "";
    } else if (typeof rawEvidence === 'string') {
      target = rawEvidence;
    }
    return target.trim();
  }, [rawEvidence]);
  // Revoke Blob URL when closing
  useEffect(() => {
    if (!isOpen && blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setStatus("idle");
    }
  }, [isOpen, blobUrl]);

  // Load PDF Blob
  useEffect(() => {
    if (!isOpen || !sourceFile) return;

    let cancelled = false;
    const init = async () => {
      try {
        setStatus("loading");
        setSearchStatus("");
        const localUrl = await fetchPdfAsBlob(sourceFile);
        if (cancelled) return;
        setBlobUrl(localUrl);
        setStatus("success");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg("Could not load the PDF source.");
      }
    };
    init();

    return () => { cancelled = true; };
  }, [isOpen, sourceFile]);

  // Handle PDF loaded event: fast native search -> plugin highlight jump
  const handleDocumentLoad = useCallback(async (e) => {
    const doc = e.doc; // native pdfjs document proxy
    const numPages = doc.numPages;

    console.log("[ViewEvidence] Alert:", selectedAlert?.id, "|", selectedAlert?.title);
    console.log("[ViewEvidence] Raw evidence:", rawEvidence);
    console.log("[ViewEvidence] primaryEvidenceText:", primaryEvidenceText);

    if (!primaryEvidenceText) {
      setSearchStatus("No evidence provided.");
      return;
    }

    setSearchStatus("Scanning document...");

    // 1. Build DUAL-REPRESENTATION candidates.
    //    originalWords  → raw original-cased words from primaryEvidenceText (for highlight dispatch)
    //    normalisedWords → stripped lowercase words (for internal page detection only)
    // Three normalization helpers:
    // (a) Heavy strip for page detection
    const stripForDetection = (s) =>
      typeof s === 'string'
        ? s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
        : '';

    // (b) Light normalization for viewer highlight dispatch.
    //     Preserves word forms but removes characters the PDF text layer typically strips:
    // (b) Light normalization for viewer highlight dispatch.
    //     Mirrors how PDF.js text layers typically represent characters:
    //     - remove diacritics (ö → o)
    //     - apostrophes/quotes → space (NOT removed!) so "Sjögren's" → "sjogren s"
    //     - hyphens → space (so "B-Cell" → "b cell")
    //     - everything else normalized, lowercase, spaces collapsed
    const stripForViewer = (s) => {
      if (typeof s !== 'string') return '';
      return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')          // strip diacritics (ö→o)
        .replace(/[''`\u2018\u2019]/g, ' ')       // apostrophes → SPACE (not removed)
        .replace(/[-\u2010-\u2015\u2212]/g, ' ') // hyphens → space
        .replace(/[^a-z0-9\s]/gi, ' ')           // strip remaining punctuation
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Original word list (preserve for reference/debugging)
    const originalWords = primaryEvidenceText.trim().split(/\s+/).filter(Boolean);

    // Normalised word list (heavy strip — for internal page detection only)
    const normWords = stripForDetection(primaryEvidenceText).split(" ").filter(Boolean);

    // Viewer-safe word list (light strip — for highlight() dispatch)
    const viewerWords = primaryEvidenceText.trim().split(/\s+/).filter(Boolean)
      .map(w => stripForViewer(w));

    const genericTerms = new Set([
      "the","a","an","is","was","are","were","has","have","had","be","been",
      "with","and","or","of","in","at","to","for","on","by","as","from","that",
      "this","its","it","not","but","also","can","may","will","would","should",
      "patient","patients","disease","syndrome","condition","disorder",
      "positive","negative","normal","abnormal","high","low","count","level",
      "test","result","value","values","elevated","decreased","increased",
      "shows","seen","noted","found","reported","associated"
    ]);

    // mkCand: build a candidate with THREE representations
    const mkCand = (type, normSlice, origSlice, viewerSlice) => ({
      type,
      normalizedText: normSlice.join(" "),    // heavy strip — page detection only
      originalText:   origSlice.join(" "),    // raw original — reference/debug only
      viewerSafeText: viewerSlice             // light strip — final highlight() dispatch
        .filter(w => w.length > 0)
        .join(" "),
    });

    const tier4 = [];
    const tier3 = [];
    const tier2 = [];

    const len = Math.min(originalWords.length, normWords.length, viewerWords.length);

    for (let i = 0; i <= len - 4; i++) {
      tier4.push(mkCand("window-4w", normWords.slice(i, i + 4), originalWords.slice(i, i + 4), viewerWords.slice(i, i + 4)));
    }
    for (let i = 0; i <= len - 3; i++) {
      tier3.push(mkCand("window-3w", normWords.slice(i, i + 3), originalWords.slice(i, i + 3), viewerWords.slice(i, i + 3)));
    }
    for (let i = 0; i <= len - 2; i++) {
      const normChunk = normWords.slice(i, i + 2);
      if (normChunk.every(w => !genericTerms.has(w) && w.length >= 4)) {
        tier2.push(mkCand("window-2w", normChunk, originalWords.slice(i, i + 2), viewerWords.slice(i, i + 2)));
      }
    }

    // Anchor: first highly distinctive word (≥8 chars, not generic)
    const anchorIdx = normWords.findIndex(w => w.length >= 8 && !genericTerms.has(w));
    const tierAnchor = anchorIdx >= 0
      ? [mkCand("anchor", [normWords[anchorIdx]], [originalWords[anchorIdx]], [viewerWords[anchorIdx]])]
      : [];

    // Build normalised page-text caches.
    //   pageTexts[]       — heavy strip (alphanumeric only) used for rough page detection
    //   viewerPageTexts[] — light strip (same as viewerSafeText) used to confirm highlight is matchable
    // Both are built from the same raw text in a single pass to avoid redundant getPage() calls.
    const pageTexts       = [];
    const viewerPageTexts = [];
    for (let p = 1; p <= numPages; p++) {
      const page        = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const raw         = textContent.items.map((i) => i.str).join(" ");
      const safeRaw     = typeof raw === 'string' ? raw : "";
      pageTexts.push(stripForDetection(safeRaw));
      // Apply stripForViewer to the FULL page text (not split into words) — this
      // produces the same space-collapsed form that the viewer's text layer exposes.
      viewerPageTexts.push(
        safeRaw
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[''`\u2018\u2019]/g, ' ')
          .replace(/[-\u2010-\u2015\u2212]/g, ' ')
          .replace(/[^a-z0-9\s]/gi, ' ')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()
      );
    }

    // 2. Ordered first-match-wins selection — fully in memory, single dispatch.
    //
    // Walk the flat ordered list: all tier4 windows first (in text order),
    // then all tier3, then tier2, then anchor.
    // The FIRST candidate whose normalizedText is found on ANY page wins.
    // highlight() is called exactly once for the winner.
    //
    // This preserves strict ordered 4-word window priority:
    //   words[0..3] is tested before words[1..4], etc.
    //   Only when ALL tier4 windows fail does tier3 begin.

    const allCandidates = [...tier4, ...tier3, ...tier2, ...tierAnchor];

    console.log("[ViewEvidence] 4-word windows:", tier4.map(c => c.viewerSafeText));

    let winner     = null;
    let winnerPage = -1;

    outer:
    for (const cand of allCandidates) {
      for (let p = 0; p < pageTexts.length; p++) {
        // Dual-check:
        //   1) normalizedText in pageTexts[p]       — rough page detection (heavy-stripped)
        //   2) viewerSafeText in viewerPageTexts[p] — confirms the highlight phrase is actually
        //      matchable in the PDF text layer (light-stripped, same transform as dispatch)
        // A candidate only wins when BOTH checks pass, so we skip windows whose
        // viewerSafeText can never produce a visible highlight even though they detect the page.
        if (
          pageTexts[p].includes(cand.normalizedText) &&
          cand.viewerSafeText &&
          viewerPageTexts[p].includes(cand.viewerSafeText)
        ) {
          winner     = cand;
          winnerPage = p;
          break outer;
        }
      }
    }

    console.log("[ViewEvidence] Winner:", {
      type: winner?.type,
      viewerSafeText: winner?.viewerSafeText,
      page: winnerPage + 1,
    });

    if (winner && winnerPage >= 0) {
      // 3. Single dispatch — highlight() and jumpToPage() called exactly once.
      highlight(winner.viewerSafeText);

      setTimeout(() => {
        jumpToPage(winnerPage);
        const node =
          document.querySelector(".rpv-search__highlight--current") ||
          document.querySelector(".rpv-search__highlight");
        if (node) {
          node.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 400);

      const { type } = winner;
      setSearchStatus(
        type === "window-4w" ? "✦ Evidence Located using 4-word phrase match" :
        type === "window-3w" ? "✦ Evidence Located using 3-word phrase match" :
        type === "window-2w" ? "✦ Evidence Located using 2-word phrase match" :
        type === "anchor"    ? "✦ Evidence Located using anchor phrase" :
                               "✦ Evidence Located"
      );
    } else {
      setSearchStatus("Evidence text not found in document.");
    }

  }, [primaryEvidenceText, highlight, jumpToPage]);

  return (
    <>
      <div className={`evidence-overlay ${isOpen ? "evidence-overlay--visible" : ""}`} onClick={onClose} />

      <div className={`evidence-panel ${isOpen ? "evidence-panel--open" : ""}`}>
        {/* Header */}
        <div className="evidence-header">
          <div className="evidence-header-top">
             <div className="evidence-label">
                <i className="bi bi-file-earmark-medical" /> Clinical Evidence
             </div>
             <button className="evidence-close-btn" onClick={onClose}>
                <i className="bi bi-x-lg" />
             </button>
          </div>
          <div className="evidence-title-row">
             <div className="evidence-title">{alertTitle || "Document Review"}</div>
          </div>
          <div className="evidence-quote-box">
             <span className="evidence-quote-label">Target Text</span>
             <p className="evidence-quote">{primaryEvidenceText || "No evidence snippet provided."}</p>
          </div>

          {searchStatus && (
            <div className={`ep-search-status-bar ${searchStatus.includes("Located") ? "ep-search-status-bar--found" : ""}`}>
              {searchStatus.includes("Scanning") ? (
                <> <span className="ep-ocr-pulse" /> {searchStatus} </>
              ) : (
                <> <i className={`bi ${searchStatus.includes("Located") ? "bi-check-circle" : "bi-exclamation-circle"}`} /> {searchStatus} </>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="evidence-body">
          {status === "loading" && (
            <div className="ep-loading-state">
              <div className="ep-spinner" />
              <p className="ep-loading-label">Loading securely...</p>
            </div>
          )}

          {status === "error" && (
            <div className="ep-error-state">
              <i className="bi bi-exclamation-triangle-fill ep-error-icon" />
              <p className="ep-error-title">Document Unavailable</p>
              <p className="ep-error-msg">{errorMsg}</p>
            </div>
          )}

          {status === "success" && blobUrl && (
            <div className="ep-pdf-viewer-container">
              <Worker workerUrl={workerUrl}>
                <Viewer 
                  fileUrl={blobUrl} 
                  plugins={[searchPluginInstance, pageNavigationPluginInstance]} 
                  onDocumentLoad={handleDocumentLoad}
                />
              </Worker>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Global safety constraint to prevent any React PDF Viewer or custom hook unhandled exceptions
// from bubbling up and causing a fatal blank white screen in the Patient Profile.
class EvidenceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[EvidencePanel] Critical exception successfully trapped:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback: silently fail or show disabled state so the whole app remains useable
      return null;
    }
    return this.props.children;
  }
}

export default function EvidencePanel(props) {
  return (
    <EvidenceErrorBoundary>
      <EvidencePanelInternal {...props} />
    </EvidenceErrorBoundary>
  );
}