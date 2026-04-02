import React, { useEffect, useRef, useState, useCallback } from "react";
import "../css/EvidencePanel.css";
import { getCookie } from "./cookieUtils";
import { createWorker } from "tesseract.js";

// ─── pdfjs-dist setup ─────────────────────────────────────────────────────────
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ─── Normalise text for matching ──────────────────────────────────────────────
const normalise = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation (medical terms have hyphens etc.)
    .replace(/\s+/g, " ")
    .trim();

// ─── Tokenise a string into meaningful words (length > 2) ─────────────────────
const tokenise = (s) =>
  normalise(s)
    .split(" ")
    .filter((w) => w.length > 2);

// ─── Fuzzy match: returns true when ≥80% of needle words appear in haystack ──
const fuzzyMatch = (needleStr, haystackStr) => {
  const needleWords = tokenise(needleStr);
  if (!needleWords.length) return false;
  const haystack = normalise(haystackStr);
  const matched = needleWords.filter((w) => haystack.includes(w));
  return matched.length / needleWords.length >= 0.8;
};

// ─── Authenticated blob fetch (two-strategy CORS-safe) ───────────────────────
const fetchPdfAsBlob = async (url) => {
  const token   = getCookie("user_token");
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const isBackendUrl = apiBase && url.startsWith(apiBase);

  // Strategy 1 — simple GET, no auth header (correct for pre-signed S3/GCS/Azure)
  if (!isBackendUrl) {
    try {
      console.log("[EvidencePanel] Strategy 1: direct fetch", url);
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        const blob = await res.blob();
        console.log(`[EvidencePanel] S1 OK — ${(blob.size / 1024).toFixed(1)} KB, ${blob.type}`);
        return URL.createObjectURL(blob);
      }
      console.warn(`[EvidencePanel] S1 failed: HTTP ${res.status}`);
    } catch (e) {
      console.warn("[EvidencePanel] S1 network error:", e.message);
    }
  }

  // Strategy 2 — Bearer token (correct for backend-proxied URLs)
  console.log("[EvidencePanel] Strategy 2: authenticated fetch", url);
  const res2 = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/pdf, application/octet-stream, */*",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res2.ok) {
    throw new Error(
      `HTTP ${res2.status} ${res2.statusText}` +
      (res2.status === 403
        ? " — Server refused the request. The backend must set Access-Control-Allow-Origin and Access-Control-Allow-Headers: Authorization."
        : "")
    );
  }

  const blob2 = await res2.blob();
  console.log(`[EvidencePanel] S2 OK — ${(blob2.size / 1024).toFixed(1)} KB, ${blob2.type}`);
  return URL.createObjectURL(blob2);
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EvidencePanel({
  isOpen,
  onClose,
  sourceFile,
  evidence = [],
  alertTitle = "",
}) {
  const containerRef   = useRef(null);
  const pdfDocRef      = useRef(null);
  const blobUrlRef     = useRef(null);
  const renderTasksRef = useRef([]);
  const ocrWorkerRef   = useRef(null); // reusable Tesseract worker

  const [status, setStatus]           = useState("idle"); // idle|loading|ocr|success|error
  const [errorMsg, setErrorMsg]       = useState("");
  const [totalPages, setTotalPages]   = useState(0);
  const [matchPage, setMatchPage]     = useState(null);
  const [highlightsOn, setHighlightsOn] = useState(true);
  const [ocrStatus, setOcrStatus]     = useState(""); // per-page OCR feedback string
  const [matchMethod, setMatchMethod] = useState(""); // "text-layer" | "ocr-exact" | "ocr-fuzzy"

  // ── Dynamic Resize Sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      document.querySelectorAll(".ep-ocr-highlight").forEach((box) => {
        const wrapper = box.closest(".ep-page-wrapper");
        const canvas = wrapper?.querySelector(".ep-pdf-canvas");
        if (!canvas) return;

        const scaleX = canvas.clientWidth / canvas.width;
        const scaleY = canvas.clientHeight / canvas.height;

        const x0 = parseFloat(box.dataset.x0);
        const y0 = parseFloat(box.dataset.y0);
        const x1 = parseFloat(box.dataset.x1);
        const y1 = parseFloat(box.dataset.y1);

        box.style.left   = `${x0 * scaleX}px`;
        box.style.top    = `${y0 * scaleY}px`;
        box.style.width  = `${(x1 - x0) * scaleX}px`;
        box.style.height = `${(y1 - y0) * scaleY}px`;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────────
  const clearPages = useCallback(() => {
    document.querySelectorAll(".ep-ocr-highlight").forEach((el) => el.remove());
    renderTasksRef.current.forEach((t) => { try { t.cancel(); } catch (_) {} });
    renderTasksRef.current = [];
    if (containerRef.current) containerRef.current.innerHTML = "";
  }, []);

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const terminateOcrWorker = useCallback(async () => {
    if (ocrWorkerRef.current) {
      try { await ocrWorkerRef.current.terminate(); } catch (_) {}
      ocrWorkerRef.current = null;
    }
  }, []);

  // ── Render one PDF page → canvas → OCR → highlight ───────────────────────────
  const renderPage = useCallback(async (
    pdf, pageNum, searchPhrase, containerWidth, ocrWorker
  ) => {
    const page     = await pdf.getPage(pageNum);
    const unscaled = page.getViewport({ scale: 1 });

    // Scale to fill the container width
    const scale    = containerWidth > 0 ? (containerWidth - 2) / unscaled.width : 1.5;
    const viewport = page.getViewport({ scale });

    // ─ DOM wrapper (Fluid sizing for dynamic sync) ──────────────────────────────
    const wrapper = document.createElement("div");
    wrapper.className    = "ep-page-wrapper";
    wrapper.id           = `page-${pageNum}`;
    wrapper.dataset.page = pageNum;
    wrapper.style.position = "relative";
    wrapper.style.width  = `100%`;
    wrapper.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

    const badge = document.createElement("div");
    badge.className   = "ep-page-badge";
    badge.textContent = `Page ${pageNum}`;
    wrapper.appendChild(badge);

    const canvas = document.createElement("canvas");
    canvas.width     = viewport.width;  /* Internal render resolution */
    canvas.height    = viewport.height;
    canvas.className = "ep-pdf-canvas";
    canvas.style.width  = "100%";       /* Display size */
    canvas.style.height = "100%";
    wrapper.appendChild(canvas);

    // Text/highlight layer — dynamically tracks resize
    const overlayDiv = document.createElement("div");
    overlayDiv.className    = "highlight-overlay ep-text-layer";
    overlayDiv.style.position = "absolute";
    overlayDiv.style.top      = "0";
    overlayDiv.style.left     = "0";
    overlayDiv.style.width    = "100%";
    overlayDiv.style.height   = "100%";
    overlayDiv.style.zIndex   = "100";
    overlayDiv.style.pointerEvents = "none";
    wrapper.appendChild(overlayDiv);

    if (containerRef.current) containerRef.current.appendChild(wrapper);

    // ─ Render canvas ────────────────────────────────────────────────────────────
    const renderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport });
    renderTasksRef.current.push(renderTask);
    await renderTask.promise;

    if (!searchPhrase) return { matched: false, method: null };

    // ─ Pass 1: Try PDF text layer (fast, works for text PDFs) ───────────────────
    const textContent = await page.getTextContent();
    const layerText   = textContent.items.map((i) => i.str).join(" ");
    const needle      = normalise(searchPhrase);

    if (needle && normalise(layerText).includes(needle)) {
      // Highlight via text spans (existing sliding-window logic)
      const spans = [];
      textContent.items.forEach((item) => {
        const span = document.createElement("span");
        span.textContent = item.str + (item.hasEOL ? "\n" : " ");
        span.className   = "ep-text-span";
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        span.style.position        = "absolute";
        // Convert to dynamic percentage matching
        span.style.left            = `${(tx[4] / viewport.width) * 100}%`;
        span.style.top             = `${((tx[5] - item.height * scale) / viewport.height) * 100}%`;
        span.style.fontSize        = `${((item.height * scale) / viewport.width) * 100}vw`; // pseudo-scaling font
        span.style.whiteSpace      = "pre";
        overlayDiv.appendChild(span);
        spans.push({ span, text: normalise(span.textContent) });
      });

      // Sliding-window highlight
      let windowStart = 0, windowText = "";
      for (let i = 0; i < spans.length; i++) {
        windowText += spans[i].text;
        while (
          windowText.length - spans[windowStart].text.length >= needle.length &&
          !windowText.includes(needle)
        ) {
          windowText = windowText.slice(spans[windowStart].text.length);
          windowStart++;
        }
        if (windowText.includes(needle)) {
          for (let j = windowStart; j <= i; j++) spans[j].span.classList.add("ep-highlight-span");
          break;
        }
      }

      console.log(`[EvidencePanel] Page ${pageNum}: text-layer match found`);
      return { matched: true, method: "text-layer" };
    }

    // ─ Pass 2: OCR on canvas image (handles scanned / image-based PDFs) ─────────
    if (!ocrWorker) return { matched: false, method: null };

    setOcrStatus(`Scanning page ${pageNum} with Visual OCR…`);
    console.log(`[EvidencePanel] Page ${pageNum}: running OCR`);

    const imageData = canvas.toDataURL("image/png");
    const { data }  = await ocrWorker.recognize(imageData);

    const ocrText = data.text || "";
    console.log(`[EvidencePanel] Page ${pageNum} OCR text (${ocrText.length} chars):`, ocrText.substring(0, 120));

    // Exact OCR match
    const isExactMatch = !!needle && normalise(ocrText).includes(needle);
    // Fuzzy match (≥80% of evidence words found via OCR)
    const isFuzzyMatch = !isExactMatch && fuzzyMatch(searchPhrase, ocrText);

    if (!isExactMatch && !isFuzzyMatch) {
      return { matched: false, method: null };
    }

    const method = isExactMatch ? "ocr-exact" : "ocr-fuzzy";
    const evidenceWords = tokenise(searchPhrase);

    // Build OCR highlight boxes using Tesseract word bounding boxes
    // bbox coordinates are in canvas-pixel space — directly usable as CSS px values
    const matchedHighlights = [];

    data?.words?.forEach((word) => {
      const wordText = normalise(word.text);
      if (!wordText) return;

      const isWordMatch = isExactMatch
        ? normalise(ocrText).includes(needle) && evidenceWords.some((ew) => wordText.includes(ew) || ew.includes(wordText))
        : evidenceWords.some((ew) => wordText.includes(ew) || ew.includes(wordText));

      if (isWordMatch && word.confidence > 40) {
        const { x0, y0, x1, y1 } = word.bbox;
        matchedHighlights.push({ x0, y0, x1, y1 });

        const box = document.createElement("div");
        box.className = "ep-ocr-highlight";
        
        // ACCURATE COORDINATE MAPPING
        const scaleX = canvas.clientWidth / canvas.width;
        const scaleY = canvas.clientHeight / canvas.height;
        console.log("Drawing highlight at:", { x0, y0, x1, y1 });
        
        box.dataset.x0 = x0;
        box.dataset.y0 = y0;
        box.dataset.x1 = x1;
        box.dataset.y1 = y1;

        box.style.left   = `${x0 * scaleX}px`;
        box.style.top    = `${y0 * scaleY}px`;
        box.style.width  = `${(x1 - x0) * scaleX}px`;
        box.style.height = `${(y1 - y0) * scaleY}px`;
        box.style.background = 'rgba(255, 255, 0, 0.45)';
        box.style.border = '2px solid #f59e0b';
        box.style.zIndex     = '9999';
        
        overlayDiv.appendChild(box);
      }
    });

    // If fuzzy matched but no boxes drawn (words not individually recognised),
    // highlight the paragraph block that contains the most evidence words
    if (matchedHighlights.length === 0 && isFuzzyMatch) {
      data?.paragraphs?.forEach((para) => {
        if (fuzzyMatch(searchPhrase, para.text)) {
          const { x0, y0, x1, y1 } = para.bbox;
          const box = document.createElement("div");
          box.className = "ep-ocr-highlight ep-ocr-highlight--para";
          
          const scaleX = canvas.clientWidth / canvas.width;
          const scaleY = canvas.clientHeight / canvas.height;
          console.log("Drawing highlight at:", { x0, y0, x1, y1 });
          
          box.dataset.x0 = x0;
          box.dataset.y0 = y0;
          box.dataset.x1 = x1;
          box.dataset.y1 = y1;

          box.style.left   = `${x0 * scaleX}px`;
          box.style.top    = `${y0 * scaleY}px`;
          box.style.width  = `${(x1 - x0) * scaleX}px`;
          box.style.height = `${(y1 - y0) * scaleY}px`;
          box.style.background = 'rgba(255, 255, 0, 0.45)';
          box.style.border = '2px solid #f59e0b';
          box.style.zIndex     = '9999';
          
          overlayDiv.appendChild(box);
        }
      });
    }

    console.log(`[EvidencePanel] Page ${pageNum}: OCR ${method}, ${matchedHighlights.length} word boxes drawn`);
    return { matched: true, method };
  }, []);

  // ── Master load effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (!sourceFile) {
      setStatus("error");
      setErrorMsg("No source file is associated with this alert.");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setErrorMsg("");
      setMatchPage(null);
      setTotalPages(0);
      setOcrStatus("");
      setMatchMethod("");
      clearPages();
      revokeBlobUrl();
      await terminateOcrWorker();

      try {
        // ── Fetch PDF blob ──────────────────────────────────────────────────────
        const localUrl = await fetchPdfAsBlob(sourceFile);
        if (cancelled) { URL.revokeObjectURL(localUrl); return; }
        blobUrlRef.current = localUrl;

        // ── Load with pdfjs ─────────────────────────────────────────────────────
        const pdf = await pdfjsLib.getDocument({ url: localUrl }).promise;
        if (cancelled) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);

        const containerWidth = containerRef.current?.clientWidth ?? 0;
        // DYNAMIC KEYWORD SEARCH
        const searchPhrase   = evidence?.[0] ?? "";

        // ── Initialise Tesseract worker (loaded once for all pages) ─────────────
        let ocrWorker = null;
        if (searchPhrase) {
          try {
            setOcrStatus("Initialising Visual OCR engine…");
            ocrWorker = await createWorker("eng", 1, {
              // Silent — no Tesseract console spam
              logger: () => {},
            });
            ocrWorkerRef.current = ocrWorker;
            console.log("[EvidencePanel] Tesseract worker ready");
          } catch (e) {
            console.warn("[EvidencePanel] Tesseract worker init failed:", e.message);
          }
        }

        if (cancelled) { await terminateOcrWorker(); return; }

        // ── Render each page (text-layer check → OCR fallback) ──────────────────
        let foundPage   = null;
        let foundMethod = null;

        for (let p = 1; p <= pdf.numPages; p++) {
          if (cancelled) break;
          
          // Stop passing OCR worker if we already found the match, 
          // saving CPU/memory on subsequent pages
          const activeOcrWorker = foundPage === null ? ocrWorker : null;
          
          const { matched, method } = await renderPage(
            pdf, p, searchPhrase, containerWidth, activeOcrWorker
          );
          
          if (matched && foundPage === null) {
            foundPage   = p;
            foundMethod = method;
            
            console.log(`Auto-scrolling to page ${p}`);
            
            // Snap the offset coordinates securely in case canvas dimensions drifted during initial mount frame
            setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 50);

            setTimeout(() => {
              const targetPage = document.getElementById(`page-${p}`);
              if (targetPage) {
                targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300); // Wait for the highlight to render before scrolling.
          }
        }

        // Terminate OCR worker — no longer needed after all pages rendered
        await terminateOcrWorker();

        if (!cancelled) {
          setMatchPage(foundPage);
          setMatchMethod(foundMethod || "");
          setOcrStatus(
            foundPage !== null
              ? foundMethod?.startsWith("ocr")
                ? "✦ Evidence Located via Visual OCR"
                : "✦ Evidence Located"
              : searchPhrase
              ? "Evidence text not found in visual scan."
              : ""
          );
          setStatus("success");
        }
      } catch (err) {
        if (cancelled) return;

        console.error("[EvidencePanel] ── PDF load failed ──");
        console.error("  URL       :", sourceFile);
        console.error("  Error     :", err?.message || err);
        console.error("  Full error:", err);

        await terminateOcrWorker();

        const msg = err?.message || "";
        let friendlyMsg;
        if (msg.includes("401") || msg.includes("403")) {
          friendlyMsg = "Access denied — your session may have expired. Try refreshing.";
        } else if (msg.includes("404")) {
          friendlyMsg = "Source file not found on the server (404). The file may have been deleted.";
        } else if (msg.includes("NetworkError") || msg.includes("Failed to fetch")) {
          friendlyMsg = "Network error — could not reach the server. Check your connection and try again.";
        } else {
          friendlyMsg = `Could not load the PDF. ${msg || "Check the browser console for details."}`;
        }

        setErrorMsg(friendlyMsg);
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
      clearPages();
      revokeBlobUrl();
      terminateOcrWorker();
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }
    };
  }, [isOpen, sourceFile, evidence, renderPage, clearPages, revokeBlobUrl, terminateOcrWorker]);

  // ── Toggle highlights ─────────────────────────────────────────────────────────
  const toggleHighlights = () => {
    setHighlightsOn((prev) => {
      const next = !prev;
      containerRef.current?.querySelectorAll(".ep-highlight-span, .ep-ocr-highlight")
        .forEach((el) => { el.style.opacity = next ? "1" : "0"; });
      return next;
    });
  };

  const jumpToEvidence = () => {
    if (matchPage === null) return;
    containerRef.current
      ?.querySelector(`[data-page="${matchPage}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const isOcrRunning = status === "loading" && ocrStatus.toLowerCase().includes("ocr");

  return (
    <>
      {/* Backdrop */}
      <div
        className={`evidence-overlay ${isOpen ? "evidence-overlay--visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`evidence-panel ${isOpen ? "evidence-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Evidence panel"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="evidence-header">
          <div className="evidence-header-top">
            <span className="evidence-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Explainable AI · Visual Source Tracing
            </span>
            <button className="evidence-close-btn" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Title */}
          <div className="evidence-title-row">
            <div className="evidence-brain-icon" aria-hidden="true">🧠</div>
            <div>
              <h1 className="evidence-title">{alertTitle || "Alert Evidence"}</h1>
              <div className="evidence-meta">
                <span className="evidence-badge evidence-badge--critical">Source Trace</span>
                <span className="evidence-meta-sep">·</span>
                <span className="evidence-meta-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {totalPages > 0 ? `${totalPages} page${totalPages !== 1 ? "s" : ""}` : "PDF Document"}
                </span>
                {matchPage && (
                  <>
                    <span className="evidence-meta-sep">·</span>
                    <span className="evidence-meta-item ep-match-badge">✦ Match on page {matchPage}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Evidence quote */}
          {evidence?.[0] && (
            <div className="evidence-quote-box">
              <span className="evidence-quote-label">
                {matchMethod?.startsWith("ocr") ? "OCR Search Target" : "Extracted from PDF"}
              </span>
              <blockquote className="evidence-quote">"{evidence[0]}"</blockquote>
            </div>
          )}

          {/* OCR / match status label */}
          {ocrStatus && (
            <div className={`ep-ocr-status-bar ${ocrStatus.startsWith("✦") ? "ep-ocr-status-bar--found" : isOcrRunning ? "ep-ocr-status-bar--scanning" : ""}`}>
              {isOcrRunning && <span className="ep-ocr-pulse" aria-hidden="true" />}
              <span>{ocrStatus}</span>
              {matchMethod === "ocr-fuzzy" && (
                <span className="ep-ocr-fuzzy-badge">Fuzzy (≥80%)</span>
              )}
            </div>
          )}

          {/* Toolbar */}
          {status === "success" && (
            <div className="ep-toolbar">
              <button
                className={`pdf-highlight-btn ${!highlightsOn ? "pdf-highlight-btn--off" : ""}`}
                onClick={toggleHighlights}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.5 14.5L3 21v-4l6.5-6.5L9.5 14.5zM14.5 3L21 9.5l-7 7-6.5-6.5 7-7z"/>
                </svg>
                {highlightsOn ? "Highlights ON" : "Highlights OFF"}
              </button>
              {matchPage && (
                <button className="pdf-jump-btn" onClick={jumpToEvidence}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Jump to Evidence · p.{matchPage}
                </button>
              )}
            </div>
          )}
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="evidence-body">
          {/* Loading — general or OCR-specific */}
          {status === "loading" && (
            <div className="ep-loading-state">
              <div className={`ep-spinner ${isOcrRunning ? "ep-spinner--ocr" : ""}`} aria-hidden="true" />
              <p className="ep-loading-label">
                {ocrStatus || "Loading PDF…"}
              </p>
              {isOcrRunning && (
                <p className="ep-loading-sub">This may take a moment for scanned documents</p>
              )}
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="ep-error-state">
              <div className="ep-error-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.5" fill="#ef4444"/>
                </svg>
              </div>
              <p className="ep-error-title">Could Not Load PDF</p>
              <p className="ep-error-msg">{errorMsg}</p>
              <p className="ep-error-hint">Check the browser console for detailed error information.</p>
            </div>
          )}

          {/* Idle */}
          {status === "idle" && isOpen && (
            <div className="ep-error-state">
              <div className="ep-error-icon" style={{ fontSize: "32px" }}>📄</div>
              <p className="ep-error-title">No Source File</p>
              <p className="ep-error-msg">No PDF source is associated with this alert.</p>
            </div>
          )}

          {/* PDF pages */}
          <div
            ref={containerRef}
            className={`ep-pages-container${status !== "success" ? " ep-pages-hidden" : ""}`}
          />
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer className="evidence-footer">
          <span className="evidence-footer-icon" aria-hidden="true">💡</span>
          <div>
            <span className="evidence-footer-label">Clinical Interpretation</span>
            <p className="evidence-footer-text">
              {evidence?.[0]
                ? `Evidence searched: "${evidence[0].substring(0, 80)}${evidence[0].length > 80 ? "…" : ""}"`
                : "Open the PDF source to review the full clinical record for this alert."}
            </p>
          </div>
        </footer>
      </aside>
    </>
  );
}