import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import "../css/EvidencePanel.css";
import { getCookie } from "./cookieUtils";

// React PDF Viewer dependencies
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import '@react-pdf-viewer/core/lib/styles/index.css';

// Import pdfjsLib internally to power our exact cascade algorithm
import * as pdfjsLib from "pdfjs-dist";

const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    } catch (e) { }
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

// ══════════════════════════════════════════════════════════════════════════════
// Normaliser — symmetric for both page-text extraction and DOM matching
// ══════════════════════════════════════════════════════════════════════════════
function normForMatch(s) {
  if (typeof s !== "string") return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")            // strip diacritics
    .replace(/[''`\u2018\u2019]/g, " ")          // smart quotes → space
    .replace(/[-\u2010-\u2015\u2212]/g, " ")     // hyphens/dashes → space
    .replace(/[^a-z0-9\s]/gi, " ")               // strip remaining punctuation
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Generic words that add no search specificity
const GENERIC_TERMS = new Set([
  "the", "a", "an", "is", "was", "are", "were", "has", "have", "had", "be", "been",
  "with", "and", "or", "of", "in", "at", "to", "for", "on", "by", "as", "from", "that",
  "this", "its", "it", "not", "but", "also", "can", "may", "will", "would", "should",
  "patient", "patients", "disease", "syndrome", "condition", "disorder",
  "positive", "negative", "normal", "abnormal", "high", "low", "count", "level",
  "test", "result", "value", "values", "elevated", "decreased", "increased",
  "shows", "seen", "noted", "found", "reported", "associated", "history",
  "family", "personal", "medical", "clinical", "laboratory", "diagnosis",
  "assessment", "management", "treatment", "therapy", "medication", "follow",
  "consistent", "significant", "indicate", "indicates", "including", "include",
  "presents", "presentation", "symptoms", "signs", "examination", "review",
]);

// Medical keyword boost — phrases containing these words get extra scoring weight
const MEDICAL_BOOST_TERMS = new Set([
  "hla", "genotype", "autoimmune", "lymphoma", "sjogren", "sjögren", "rheumatoid",
  "arthritis", "polyangiitis", "vasculitis", "lupus", "fibromyalgia", "celiac",
  "crohns", "colitis", "psoriasis", "scleroderma", "polymyalgia", "ankylosing",
  "leukemia", "myeloma", "lymphocyte", "antibody", "antinuclear", "complement",
  "biopsy", "histology", "anca", "ana", "anti", "ige", "igg", "iga", "igm",
  "hispanic", "caucasian", "african", "female", "male", "month", "year",
  "b cell", "bcell", "monoclonal", "paraprotein", "cryoglobulin",
]);

/** Count of words that are truly distinctive (≥4 chars, not generic) */
function distinctCount(words) {
  return words.filter((w) => w.length >= 4 && !GENERIC_TERMS.has(w)).length;
}

/** Return true if a word carries a medical-domain boost */
function hasMedicalBoost(words) {
  return words.some((w) => MEDICAL_BOOST_TERMS.has(w));
}

// ══════════════════════════════════════════════════════════════════════════════
// DOM text-node map builder (used by highlighter)
// ══════════════════════════════════════════════════════════════════════════════
function buildTextNodeMap(pageContainer) {
  const textLayer = pageContainer.querySelector(".rpv-core__text-layer");
  if (!textLayer) return null;

  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT, null);
  const segments = [];
  let globalPos = 0;
  let node;

  while ((node = walker.nextNode())) {
    const raw = node.nodeValue || "";
    if (!raw.trim()) continue;

    const norm = normForMatch(raw);
    if (!norm) continue;

    const startPos = globalPos > 0 ? globalPos + 1 : 0;

    segments.push({
      node,
      rawText: raw,
      normText: norm,
      globalStart: startPos,
      globalEnd: startPos + norm.length,
    });

    globalPos = startPos + norm.length;
  }

  const concat = segments.map((s) => s.normText).join(" ");
  return { concat, segments };
}

// ══════════════════════════════════════════════════════════════════════════════
// DOM highlight wrappers
// ══════════════════════════════════════════════════════════════════════════════
const HIGHLIGHT_CLASS = "ev-hl";

function wrapMatchRange(segments, matchStart, matchEnd) {
  const wrappers = [];

  for (const seg of segments) {
    const { node, rawText, normText, globalStart, globalEnd } = seg;

    if (globalEnd <= matchStart || globalStart >= matchEnd) continue;

    const overlapNormStart = Math.max(matchStart, globalStart) - globalStart;
    const overlapNormEnd = Math.min(matchEnd, globalEnd) - globalStart;

    const normLen = normText.length;
    const rawLen = rawText.length;

    const rawStart = normLen > 0 ? Math.round((overlapNormStart / normLen) * rawLen) : 0;
    const rawEnd = normLen > 0 ? Math.round((overlapNormEnd / normLen) * rawLen) : rawLen;

    const clampedStart = Math.max(0, Math.min(rawStart, rawLen));
    const clampedEnd = Math.max(clampedStart, Math.min(rawEnd, rawLen));

    if (clampedStart >= clampedEnd) continue;

    try {
      let targetNode = node;

      if (clampedEnd < targetNode.nodeValue.length) {
        targetNode.splitText(clampedEnd);
      }
      if (clampedStart > 0) {
        const afterHead = targetNode.splitText(clampedStart);
        targetNode = afterHead;
      }

      const mark = document.createElement("mark");
      mark.className = HIGHLIGHT_CLASS;
      mark.style.cssText = [
        "background:rgba(255,200,0,0.85)",
        "color:inherit",
        "border-radius:3px",
        "outline:2px solid rgba(200,155,0,0.7)",
        "box-shadow:0 0 0 1px rgba(190,148,0,0.22)",
        "padding:0",
        "display:inline",
      ].join(";");

      targetNode.parentNode.insertBefore(mark, targetNode);
      mark.appendChild(targetNode);
      wrappers.push(mark);
    } catch (err) {
      console.warn("[ViewEvidence] wrapMatchRange DOM error:", err);
    }
  }

  return wrappers;
}

function applyPreciseHighlight(pageContainer, targetPhrase) {
  const mapResult = buildTextNodeMap(pageContainer);
  if (!mapResult) return null;

  const { concat, segments } = mapResult;
  const normPhrase = normForMatch(targetPhrase);
  if (!normPhrase) return null;

  const idx = concat.indexOf(normPhrase);
  if (idx === -1) return null;

  const wrappers = wrapMatchRange(segments, idx, idx + normPhrase.length);
  if (!wrappers.length) return null;

  return { wrappers, firstNode: wrappers[0] };
}

function clearManualHighlights(container) {
  if (!container) return;

  container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    try { parent.normalize(); } catch (e) { }
  });

  container.querySelectorAll(".rpv-core__text-layer span").forEach((span) => {
    if (span.style.backgroundColor) span.style.backgroundColor = "";
    if (span.style.borderRadius) span.style.borderRadius = "";
    if (span.style.outline) span.style.outline = "";
    if (span.style.boxShadow) span.style.boxShadow = "";
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — PAGE SCORING
//
// Given the extracted text of each page (from pdfjs), score each page for how
// well it matches the target evidence sentence. Returns { winnerPageIndex, winnerPageText }.
//
// Scoring criteria (applied to the normalized page text):
//   +100  full normalized sentence found verbatim on the page
//   +60   long phrase (≥10 words from the sentence) found on the page
//   +50   phrase (8–9 words) found
//   +35   phrase (6–7 words) found
//   +20   phrase (5 words) found
//   +10   phrase (4 words) found
//   +15   any medical boost term present in the matching phrase
//   −30   only a phrase of 4 words or fewer matched and it is entirely generic
//
// Phase 1 does NOT produce any success/fail status — it only picks one winner page.
// ══════════════════════════════════════════════════════════════════════════════
function scorePageForEvidence(pageNormText, viewerWords) {
  if (!pageNormText || !viewerWords.length) return 0;

  const fullSentence = viewerWords.join(" ");

  // Full sentence exact match → maximum score
  if (pageNormText.includes(fullSentence)) return 100;

  // Try decreasing-length contiguous windows to find the best match
  let bestScore = 0;

  for (let wlen = Math.min(viewerWords.length, 12); wlen >= 4; wlen--) {
    for (let off = 0; off <= viewerWords.length - wlen; off++) {
      const window = viewerWords.slice(off, off + wlen);
      const phrase = window.join(" ");
      if (!pageNormText.includes(phrase)) continue;

      let score = 0;
      if (wlen >= 10) score = 60;
      else if (wlen >= 8) score = 50;
      else if (wlen >= 6) score = 35;
      else if (wlen >= 5) score = 20;
      else score = 10; // 4 words

      // Medical boost
      if (hasMedicalBoost(window)) score += 15;

      // Penalize 4-word windows that are entirely generic
      if (wlen <= 4 && distinctCount(window) === 0) score -= 30;

      if (score > bestScore) bestScore = score;

      // Once we find a strong match at this length, no need to scan further offsets
      if (wlen >= 8 && score >= 50) break;
    }
    // Early exit if we already have a very good score
    if (bestScore >= 60) break;
  }

  return bestScore;
}

function resolveWinnerPage(pageNormTexts, viewerWords) {
  let bestPageIndex = -1;
  let bestScore = -1;

  for (let p = 0; p < pageNormTexts.length; p++) {
    const score = scorePageForEvidence(pageNormTexts[p], viewerWords);
    console.log(`[ViewEvidence] Page ${p + 1} score: ${score}`);
    if (score > bestScore) {
      bestScore = score;
      bestPageIndex = p;
    }
  }

  return { winnerPageIndex: bestPageIndex, winnerScore: bestScore };
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — PAGE-LOCAL PHRASE SEARCH
//
// Given the normalized text of the winner page (from pdfjs), generate all
// page-local candidate phrases ranked from strongest to weakest.
//
// Search order:
//   1. Full normalized sentence
//   2. Contiguous windows from 12→6 words (ranked by length + distinctiveness)
//   3. 5-word windows as weaker fallback
//   4. 4-word windows as absolute last resort (only if nothing else found)
//
// Returns an ordered array of { phrase, label } — the BEST candidates first.
// These are filtered to only include phrases actually present in pageNormText.
// ══════════════════════════════════════════════════════════════════════════════
function buildPageLocalCandidates(pageNormText, viewerWords) {
  const candidates = [];
  const seen = new Set();

  const add = (phrase, label) => {
    if (!phrase || seen.has(phrase)) return;
    if (!pageNormText.includes(phrase)) return;
    seen.add(phrase);
    candidates.push({ phrase, label });
  };

  const fullSentence = viewerWords.join(" ");

  // 1. Full sentence
  add(fullSentence, "✦ Full evidence sentence highlighted");

  // 2. Long windows (12 → 6 words), ordered by length then distinctiveness
  // We generate ALL windows at each length, score each, sort within the length tier,
  // then emit them in best-within-tier order.
  for (let wlen = Math.min(viewerWords.length, 12); wlen >= 6; wlen--) {
    const tier = [];
    for (let off = 0; off <= viewerWords.length - wlen; off++) {
      const window = viewerWords.slice(off, off + wlen);
      const phrase = window.join(" ");
      if (!pageNormText.includes(phrase)) continue;
      const dc = distinctCount(window);
      const med = hasMedicalBoost(window) ? 1 : 0;
      // Higher is better within this length tier
      tier.push({ phrase, score: dc * 2 + med });
    }
    // Sort this tier by score descending
    tier.sort((a, b) => b.score - a.score);
    for (const { phrase } of tier) {
      add(phrase, "✦ Evidence highlighted (best page match)");
    }
  }

  // 3. 5-word windows — weaker fallback; only allowed if nothing above found
  // (we still add them here; the loop caller will stop at the first successful commit)
  for (let off = 0; off <= viewerWords.length - 5; off++) {
    const window = viewerWords.slice(off, off + 5);
    const phrase = window.join(" ");
    // Require at least 1 distinctive word to avoid pure-generic 5-word windows
    if (distinctCount(window) < 1) continue;
    add(phrase, "✦ Evidence highlighted (page-local fallback)");
  }

  // 4. 4-word windows — absolute last resort; only if at least 2 distinctive words
  for (let off = 0; off <= viewerWords.length - 4; off++) {
    const window = viewerWords.slice(off, off + 4);
    if (distinctCount(window) < 2) continue; // must have 2 distinctive words for 4-word
    const phrase = window.join(" ");
    add(phrase, "✦ Evidence highlighted (page-local fallback)");
  }

  return candidates;
}

// ══════════════════════════════════════════════════════════════════════════════
// EvidencePanelInternal
// ══════════════════════════════════════════════════════════════════════════════
function EvidencePanelInternal({
  isOpen,
  onClose,
  sourceFile,
  selectedAlert,
}) {
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { jumpToPage } = pageNavigationPluginInstance;

  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState(null);
  const [searchStatus, setSearchStatus] = useState("");

  const viewerContainerRef = useRef(null);
  const jumpTargetRef = useRef(null);

  // ── Run-guard refs ────────────────────────────────────────────────────────
  // Each new View Evidence open gets a unique run id; every timeout/retry
  // checks the active run id before touching the DOM or React state.
  const activeRunIdRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const jumpRunIdRef = useRef(0);

  // After Phase 1 resolves, we LOCK in one page layer element here.
  // Phase 2 and Phase 3 use ONLY this reference — they never re-search all layers.
  const resolvedPageLayerRef = useRef(null);
  const winnerPageIndexRef = useRef(-1);

  const rawEvidence = selectedAlert?.evidence;
  const alertTitle = selectedAlert?.title || selectedAlert?.is_manual || "Evidence";

  const primaryEvidenceText = useMemo(() => {
    if (!rawEvidence) return "";
    let target = "";
    if (Array.isArray(rawEvidence)) {
      const validStr = rawEvidence.find(
        (item) => typeof item === "string" && item.trim()
      );
      target = validStr || "";
    } else if (typeof rawEvidence === "string") {
      target = rawEvidence;
    }
    return target.trim();
  }, [rawEvidence]);

  // Cleanup on panel close
  useEffect(() => {
    if (!isOpen) {
      activeRunIdRef.current += 1;
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      clearManualHighlights(viewerContainerRef.current);
      resolvedPageLayerRef.current = null;
      winnerPageIndexRef.current = -1;
      jumpTargetRef.current = null;
      setHasJumpTarget(false);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
        setStatus("idle");
        setSearchStatus("");
      }
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
        jumpTargetRef.current = null;
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

  // Jump to Evidence handler
  const handleJumpToEvidence = useCallback(() => {
    const target = jumpTargetRef.current;
    if (!target) return;

    jumpRunIdRef.current += 1;
    const runId = jumpRunIdRef.current;

    // LEVEL 1: LIVE MARK JUMP
    // Fast path: if the viewer is already on the page and the node is alive, jump immediately.
    const viewerEl = viewerContainerRef.current;
    if (viewerEl) {
      const liveMarks = viewerEl.querySelectorAll("mark.ev-hl");
      if (liveMarks.length > 0) {
        liveMarks[0].scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    // LEVEL 2 & 3: PAGE JUMP + RE-HIGHLIGHT
    if (typeof target.pageIndex === "number") {
      jumpToPage(target.pageIndex);

      if (!target.phrase) return; // Page-only fallback, nothing to highlight

      let attempts = 0;
      const MAX_ATTEMPTS = 12;

      const tryFindAndScroll = () => {
        if (runId !== jumpRunIdRef.current) return;

        const vEl = viewerContainerRef.current;
        if (!vEl) {
          if (++attempts < MAX_ATTEMPTS) setTimeout(tryFindAndScroll, 200);
          return;
        }

        // Find the newly rendered layer for the target page via content match
        const allLayers = vEl.querySelectorAll(".rpv-core__page-layer");
        let targetLayer = null;

        for (const layer of allLayers) {
          const tl = layer.querySelector(".rpv-core__text-layer");
          if (!tl) continue;

          const walker = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT, null);
          const parts = [];
          let nd;
          while ((nd = walker.nextNode())) {
            const v = (nd.nodeValue || "").trim();
            if (v) parts.push(v);
          }
          if (parts.length < 3) continue;

          const layerNorm = normForMatch(parts.join(" "));
          if (layerNorm.includes(target.phrase)) {
            targetLayer = layer;
            break;
          }
        }

        if (!targetLayer) {
          if (++attempts < MAX_ATTEMPTS) setTimeout(tryFindAndScroll, 200);
          return;
        }

        // Check if virtualization left marks intact (unlikely, but possible)
        const liveMarks = targetLayer.querySelectorAll("mark.ev-hl");
        if (liveMarks.length > 0) {
          liveMarks[0].scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        // LEVEL 3: RE-FIND INSIDE PAGE
        // The page rendered but the highlight is gone (virtualized).
        // Re-apply it using the stored phrase.
        clearManualHighlights(targetLayer);
        const localMap = buildTextNodeMap(targetLayer);
        if (!localMap || localMap.concat.length < 10) {
          if (++attempts < MAX_ATTEMPTS) setTimeout(tryFindAndScroll, 200);
          return;
        }

        const normPhrase = normForMatch(target.phrase);
        if (!localMap.concat.includes(normPhrase)) {
          if (++attempts < MAX_ATTEMPTS) setTimeout(tryFindAndScroll, 200);
          return;
        }

        const result = applyPreciseHighlight(targetLayer, target.phrase);
        if (result && result.wrappers.length > 0) {
          const postMarks = targetLayer.querySelectorAll("mark.ev-hl");
          if (postMarks.length > 0) {
            postMarks[0].scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
        }

        if (++attempts < MAX_ATTEMPTS) setTimeout(tryFindAndScroll, 200);
      };

      setTimeout(tryFindAndScroll, 250); // wait for initial render
    }
  }, [jumpToPage]);

  const [hasJumpTarget, setHasJumpTarget] = useState(false);

  // ── Main pipeline: handleDocumentLoad ────────────────────────────────────
  const handleDocumentLoad = useCallback(async (e) => {
    const doc = e.doc;
    const numPages = doc.numPages;

    // ── Run-id guard ─────────────────────────────────────────────────────────
    activeRunIdRef.current += 1;
    const runId = activeRunIdRef.current;
    if (retryTimeoutRef.current !== null) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    resolvedPageLayerRef.current = null;
    winnerPageIndexRef.current = -1;

    console.log("[ViewEvidence] ═══ NEW RUN id:", runId, "═══");
    console.log("[ViewEvidence] Alert:", selectedAlert?.id, "|", selectedAlert?.title);
    console.log("[ViewEvidence] primaryEvidenceText:", primaryEvidenceText);

    if (!primaryEvidenceText) {
      if (runId !== activeRunIdRef.current) return;
      setSearchStatus("No evidence provided.");
      return;
    }

    setSearchStatus("Scanning document...");
    setHasJumpTarget(false);
    jumpTargetRef.current = null;

    // ── Normalize target sentence ─────────────────────────────────────────
    const viewerWords = normForMatch(primaryEvidenceText)
      .split(" ")
      .filter((w) => w.length > 0);

    if (!viewerWords.length) {
      if (runId !== activeRunIdRef.current) return;
      setSearchStatus("Evidence text could not be normalized.");
      return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1 — BEST PAGE RESOLUTION
    //
    // Extract text from every page using pdfjs and score each page.
    // Output: winnerPageIndex (0-based), winnerPageNormText
    // After this phase, the whole-document search STOPS.
    // ════════════════════════════════════════════════════════════════════════
    const pageNormTexts = [];
    for (let p = 1; p <= numPages; p++) {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const raw = textContent.items.map((i) => i.str).join(" ");
      pageNormTexts.push(normForMatch(typeof raw === "string" ? raw : ""));
    }

    if (runId !== activeRunIdRef.current) {
      console.log("[ViewEvidence] run cancelled after page text extraction | id:", runId);
      return;
    }

    const { winnerPageIndex, winnerScore } = resolveWinnerPage(pageNormTexts, viewerWords);

    console.log("[ViewEvidence] PHASE 1 winner:", winnerPageIndex + 1, "| score:", winnerScore);

    if (winnerPageIndex < 0 || winnerScore <= 0) {
      if (runId !== activeRunIdRef.current) return;
      setSearchStatus("Evidence text not found in document.");
      return;
    }

    winnerPageIndexRef.current = winnerPageIndex;

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 2 — PAGE-LOCAL PHRASE SEARCH
    //
    // Now that winnerPageIndex is known, build all page-local candidates
    // from the pdfjs-extracted text of ONLY that page.
    // These are the ONLY phrases that will ever be attempted for highlight.
    // ════════════════════════════════════════════════════════════════════════
    const winnerPageNormText = pageNormTexts[winnerPageIndex];
    const pageCandidates = buildPageLocalCandidates(winnerPageNormText, viewerWords);

    console.log("[ViewEvidence] PHASE 2 page-local candidates:", pageCandidates.length,
      "| top:", pageCandidates.slice(0, 3).map(c => ({
        words: c.phrase.split(" ").length,
        phrase: c.phrase.slice(0, 60),
      }))
    );

    // Jump to the winner page so the viewer starts rendering it
    jumpToPage(winnerPageIndex);

    // Store page-level jump target (upgraded to node-level on success)
    jumpTargetRef.current = { pageIndex: winnerPageIndex };
    setHasJumpTarget(true);

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3 — HIGHLIGHT COMMIT
    //
    // Wait for the resolved page's DOM layer to become ready, then commit
    // highlights using ONLY the page-local candidates from Phase 2.
    //
    // Rules:
    //  - detect the resolved page's DOM layer by looking for ANY of the top
    //    N page-local candidates in currently rendered layers
    //  - once a layer is resolved, LOCK it in resolvedPageLayerRef
    //  - subsequent retries always use resolvedPageLayerRef — never re-search
    //  - success = real mark.ev-hl nodes exist in the DOM
    //  - if no candidate produces marks, emit neutral status
    //
    // Parameters:
    //  MAX_LAYER_ATTEMPTS  — retries allowed before giving up on DOM layer detection
    //  MAX_COMMIT_RETRIES  — commit retries per candidate phrase
    //  RETRY_MS            — delay between retries
    // ════════════════════════════════════════════════════════════════════════
    const MAX_LAYER_ATTEMPTS = 10;
    const RETRY_MS = 200;

    let layerAttempt = 0;
    let highlightCommitted = false;

    // ── Helper: find the winner page layer from currently rendered page layers ──
    // Uses ONLY the pageCandidates built from the winner page's pdfjs text.
    // This prevents picking the wrong DOM layer.
    const findWinnerLayer = (viewerEl) => {
      if (!viewerEl) return null;
      const allLayers = viewerEl.querySelectorAll(".rpv-core__page-layer");
      if (!allLayers.length) return null;

      for (const layer of allLayers) {
        const tl = layer.querySelector(".rpv-core__text-layer");
        if (!tl) continue;

        // Quick text content check using a TreeWalker
        const walker = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT, null);
        const parts = [];
        let nd;
        while ((nd = walker.nextNode())) {
          const v = (nd.nodeValue || "").trim();
          if (v) parts.push(v);
        }
        if (parts.length < 3) continue;

        const layerNorm = normForMatch(parts.join(" "));

        // Check if this layer contains any of the top candidates from Phase 2
        // Only use strong candidates (≥6 words, or shorter with ≥2 distinctive words)
        // for layer identification — never use weak generics
        for (const { phrase } of pageCandidates) {
          const words = phrase.split(" ");
          const wlen = words.length;
          if (wlen < 5 && distinctCount(words) < 2) continue; // too weak for layer ID
          if (layerNorm.includes(phrase)) {
            console.log("[ViewEvidence] Layer identified via phrase:", phrase.slice(0, 60));
            return layer;
          }
        }
      }
      return null;
    };

    // ── Helper: attempt to commit highlight for one candidate phrase ───────
    // Returns true if real mark.ev-hl nodes were created.
    const commitHighlight = (targetLayer, phrase, label, runId) => {
      if (runId !== activeRunIdRef.current) return false;

      const result = applyPreciseHighlight(targetLayer, phrase);
      if (!result || result.wrappers.length === 0) return false;

      // Post-commit DOM verification
      const liveMarks = targetLayer.querySelectorAll("mark.ev-hl").length;
      if (liveMarks === 0) {
        console.log("[ViewEvidence] commit rejected — 0 live marks | id:", runId);
        return false;
      }

      // Final stale check before writing React state
      if (runId !== activeRunIdRef.current) return false;

      highlightCommitted = true;
      jumpTargetRef.current = { pageIndex: winnerPageIndex, phrase, label };
      result.firstNode.scrollIntoView({ behavior: "smooth", block: "center" });
      setSearchStatus(label);
      setHasJumpTarget(true);
      console.log("[ViewEvidence] ✓ success committed | id:", runId, "| marks:", liveMarks, "| phrase:", phrase.slice(0, 60));
      return true;
    };

    // ── Phase 3 retry loop ────────────────────────────────────────────────
    const tryPhase3 = () => {
      // Stale-run guard
      if (runId !== activeRunIdRef.current) {
        console.log("[ViewEvidence] stale run in Phase 3 | id:", runId);
        return;
      }
      if (highlightCommitted) return;

      const viewerEl = viewerContainerRef.current;
      if (!viewerEl) {
        if (++layerAttempt < MAX_LAYER_ATTEMPTS) {
          retryTimeoutRef.current = setTimeout(tryPhase3, RETRY_MS);
          return;
        }
        if (runId !== activeRunIdRef.current) return;
        setSearchStatus("Evidence located — viewer not ready.");
        return;
      }

      // ── Resolve the page DOM layer (ONCE) ────────────────────────────────
      // After it is found, lock it; subsequent retries skip this detection.
      if (!resolvedPageLayerRef.current) {
        const layer = findWinnerLayer(viewerEl);
        if (!layer) {
          if (++layerAttempt < MAX_LAYER_ATTEMPTS) {
            retryTimeoutRef.current = setTimeout(tryPhase3, RETRY_MS);
            console.log("[ViewEvidence] Layer not ready — retry", layerAttempt, "| id:", runId);
            return;
          }
          if (runId !== activeRunIdRef.current) return;
          setSearchStatus("Evidence located — target page is not currently rendered.");
          setHasJumpTarget(true);
          return;
        }
        resolvedPageLayerRef.current = layer;
        console.log("[ViewEvidence] ✓ Page layer LOCKED | id:", runId);
      }

      const targetLayer = resolvedPageLayerRef.current;

      // ── Ensure text layer has content ─────────────────────────────────────
      // Clear old marks FIRST (normalize merged text nodes), THEN build map.
      clearManualHighlights(viewerEl);
      const localMap = buildTextNodeMap(targetLayer);
      if (!localMap || localMap.concat.length < 10) {
        if (++layerAttempt < MAX_LAYER_ATTEMPTS) {
          retryTimeoutRef.current = setTimeout(tryPhase3, RETRY_MS);
          console.log("[ViewEvidence] Text layer not yet populated — retry", layerAttempt, "| id:", runId);
          return;
        }
        if (runId !== activeRunIdRef.current) return;
        setSearchStatus("Evidence located — exact highlighting could not be applied in viewer.");
        setHasJumpTarget(true);
        return;
      }

      console.log("[ViewEvidence] PHASE 3 commit start | domConcat length:", localMap.concat.length,
        "| candidates:", pageCandidates.length);

      // ── Iterate page-local candidates in order, attempt commit ────────────
      // IMPORTANT: only candidates that exist in the LIVE DOM text can produce marks.
      // We revalidate each phrase against the live localMap.concat (not the pdfjs text)
      // because the DOM may differ slightly from extracted text.
      for (const { phrase, label } of pageCandidates) {
        if (runId !== activeRunIdRef.current) return;

        const normPhrase = normForMatch(phrase);
        if (!normPhrase) continue;

        // Must be present in live DOM text
        if (!localMap.concat.includes(normPhrase)) continue;

        if (commitHighlight(targetLayer, phrase, label, runId)) return;

        // If commitHighlight created wrappers but DOM verification failed,
        // the DOM may be in a bad state; re-clear and rebuild before the next attempt
        clearManualHighlights(viewerEl);
      }

      // ── All page-local candidates exhausted → neutral failure ────────────
      if (runId !== activeRunIdRef.current) return;
      setSearchStatus("Evidence located — exact highlighting could not be applied in viewer.");
      setHasJumpTarget(true);
      console.log("[ViewEvidence] neutral committed — all candidates exhausted | id:", runId);
    };

    // Initial delay — gives the viewer time to begin rendering
    retryTimeoutRef.current = setTimeout(tryPhase3, 500);
    console.log("[ViewEvidence] Phase 3 scheduled | id:", runId);

  }, [primaryEvidenceText, jumpToPage]);

  // Status bar appearance
  const isFound = searchStatus.includes("✦");
  const isScanning = searchStatus.includes("Scanning");

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

          {/* Status bar */}
          {searchStatus && (
            <div className={`ep-search-status-bar ${isFound ? "ep-search-status-bar--found" : ""} ${isScanning ? "ep-search-status-bar--scanning" : ""}`}>
              <span className="ep-status-message">
                {isScanning ? (
                  <><span className="ep-ocr-pulse" /> {searchStatus}</>
                ) : (
                  <><i className={`bi ${isFound ? "bi-check-circle-fill" : "bi-info-circle"}`} /> {searchStatus}</>
                )}
              </span>

              {/* Jump to Evidence button */}
              {hasJumpTarget && !isScanning && (
                <button
                  className="ep-jump-btn"
                  onClick={handleJumpToEvidence}
                  title="Scroll back to the highlighted evidence"
                >
                  <i className="bi bi-crosshair2" />
                  Jump to Evidence
                </button>
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
            <div className="ep-pdf-viewer-container" ref={viewerContainerRef}>
              <Worker workerUrl={workerUrl}>
                <Viewer
                  fileUrl={blobUrl}
                  plugins={[pageNavigationPluginInstance]}
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

// ══════════════════════════════════════════════════════════════════════════════
// Error boundary — prevents any unhandled exception from blanking the profile
// ══════════════════════════════════════════════════════════════════════════════
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