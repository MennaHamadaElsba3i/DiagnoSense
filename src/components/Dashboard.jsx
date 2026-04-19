import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import logo from "../assets/Logo_Diagnoo.png";
import stethoscope from "../assets/Stethoscope.png";
import closeIcon from "../assets/close.png";
import openIcon from "../assets/open.png";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar.jsx";
import "../css/Dashboard.css";
import { useNotifications } from "./NotificationsContext";
import { usePageCache } from "./PageCacheContext";
import {
  getDashboardWidgets,
  getDashboardStatusDistribution,
  getTopfiveDiseases,
  getTodayVisitsAPI,
  getPatientOverviewAPI,
  markPatientAttendedAPI,
} from "./mockAPI.js";

const AVATAR_COLORS = [
  "#FF4D6D",
  "#4C6EF5",
  "#E67700",
  "#2F9E44",
  "#9B5DE5",
  "#06D6A0",
  "#F77F00",
  "#3A86FF",
];

export function getDoctorInitials() {
  const name = localStorage.getItem("doctor_name") || "";
  // Strip "Dr." / "Dr " prefix, then take first letter of each remaining word
  const cleaned = name.replace(/^Dr\.?\s*/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const DashboardQueueInsight = ({ text }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const moreRef = useRef(null);
  const [displayLength, setDisplayLength] = useState(text.length);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      setDisplayLength(text.length);
      setIsTruncated(false);
      if (moreRef.current) moreRef.current.style.display = "inline";
      if (textRef.current) textRef.current.textContent = text + " ";
      return;
    }

    const container = containerRef.current;
    const textNode = textRef.current;
    if (!container || !textNode) return;

    let rafId;
    const measure = () => {
      textNode.textContent = text;
      if (moreRef.current) moreRef.current.style.display = "none";

      if (container.scrollHeight <= container.clientHeight) {
        setDisplayLength((prev) => {
          if (prev !== text.length) {
            setIsTruncated(false);
            return text.length;
          }
          return prev;
        });
        return;
      }

      if (moreRef.current) moreRef.current.style.display = "inline";

      let low = 0;
      let high = text.length;
      let best = 0;

      while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        textNode.textContent = text.slice(0, mid).trimEnd() + "… ";
        if (container.scrollHeight <= container.clientHeight) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setDisplayLength((prev) => {
        if (prev !== best) {
          setIsTruncated(true);
          return best;
        }
        return prev;
      });

      textNode.textContent = text.slice(0, best).trimEnd() + "… ";
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [text, isExpanded]);

  const previewText = isTruncated && !isExpanded
    ? text.slice(0, displayLength).trimEnd() + "… "
    : text;

  const maxHeight = isExpanded ? "none" : "42px";

  return (
    <div className="dsn-insight-box">
      <div className="dsn-insight-label" style={{ display: "flex", alignItems: "center" }}>
        <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" style={{ width: 14, height: 14, marginRight: 6 }}>
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
        AI Insight
      </div>
      <div ref={containerRef} className="dsn-insight-text" style={{ maxHeight, overflow: "hidden", display: "inline-block", width: "100%" }}>
        <span ref={textRef}>
          {previewText}
        </span>
        <button
          ref={moreRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            display: (isTruncated || isExpanded) ? "inline" : "none",
            background: 'none', border: 'none', padding: 0, margin: 0,
            color: '#2A66FF', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            marginLeft: '4px'
          }}
        >
          {isExpanded ? "View less" : "View more"}
        </button>
      </div>
    </div>
  );
};

function QueueSection() {
  const [queueData, setQueueData] = useState(null);
  const [queueList, setQueueList] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingLabel, setRemainingLabel] = useState("");
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [modalPatient, setModalPatient] = useState(null);
  const navigate = useNavigate();
  const { getCache, setCache } = usePageCache();

  const fetchQueue = useCallback(async () => {
    // ── Cache check ──
    const cached = getCache("dashboard_queue");
    if (cached) {
      setQueueList(cached.queueList);
      setCurrentIdx(cached.currentIdx);
      setRemainingLabel(cached.remainingLabel);
      setLoadingQueue(false);
      return;
    }

    setLoadingQueue(true);

    const result = await getTodayVisitsAPI();

    if (result?.success && result?.data) {
      const data = result.data;

      const mapped = (data.full_queue_list || []).map((p) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        apptTime: p.appointment_time,
        status_tag: p.status_tag,
        aiInsight: p.ai_insight?.summary || null,
        initials: p.name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join(""),
        color: AVATAR_COLORS[p.id % AVATAR_COLORS.length],
      }));

      const nowIdx = mapped.findIndex((p) => p.status_tag === "Now");
      const resolvedIdx = nowIdx >= 0 ? nowIdx : 0;
      const label = data.remaining_count_label || "";

      setQueueList(mapped);
      setCurrentIdx(resolvedIdx);
      setRemainingLabel(label);

      // ── Store to cache ──
      setCache("dashboard_queue", {
        queueList: mapped,
        currentIdx: resolvedIdx,
        remainingLabel: label,
      });
    } else {
      setQueueList([]);
    }

    setLoadingQueue(false);
  }, [getCache, setCache]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    if (modalPatient) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [modalPatient]);

  const goToNextPatient = () => {
    setCurrentIdx((prev) => {
      const total = queueList.length;
      if (total === 0) return prev;

      for (let offset = 1; offset <= total; offset++) {
        const candidateIdx = (prev + offset) % total;
        const candidate = queueList[candidateIdx];
        if (
          candidate.status_tag === "Waiting" ||
          candidate.status_tag === "Now"
        ) {
          return candidateIdx;
        }
      }

      return prev;
    });
  };

  const goToPreviousPatient = () => {
    setCurrentIdx((prev) => {
      const total = queueList.length;
      if (total === 0) return prev;

      for (let offset = 1; offset <= total; offset++) {
        const candidateIdx = (prev - offset + total) % total;
        const candidate = queueList[candidateIdx];
        if (
          candidate.status_tag === "Waiting" ||
          candidate.status_tag === "Now"
        ) {
          return candidateIdx;
        }
      }

      return prev;
    });
  };

  const handleViewDetails = async (patientId) => {
    if (!patientId) return;

    try {
      const result = await getPatientOverviewAPI(patientId);

      if (result?.success) {
        navigate(`/patient-profile/${patientId}`, { state: { patientId } });
      } else {
        console.warn(
          "[ViewDetails] overview fetch failed, navigating anyway:",
          result?.message,
        );
        navigate(`/patient-profile/${patientId}`, { state: { patientId } });
      }
    } catch (err) {
      console.error("[ViewDetails] unexpected error:", err);
      navigate(`/patient-profile/${patientId}`, { state: { patientId } });
    }
  };

  const handleMarkAttended = async () => {
    if (!activePatient?.id) return;

    const patientId = activePatient.id;

    const prevQueueList = queueList;
    const prevCurrentIdx = currentIdx;
    const prevRemainingLabel = remainingLabel;

    const queueWithoutAttended = queueList.filter((p) => p.id !== patientId);

    const queueAfterShift = queueWithoutAttended.map((p, i) => ({
      ...p,
      status_tag: i === 0 ? "Now" : "Waiting",
    }));

    setQueueList(queueAfterShift);
    setCurrentIdx(0);
    setRemainingLabel(
      `${queueAfterShift.filter((p) => p.status_tag === "Waiting").length} remaining`,
    );

    try {
      const result = await markPatientAttendedAPI(patientId);

      if (result?.success) {
        const refreshed = await getTodayVisitsAPI();

        if (
          refreshed?.success &&
          refreshed?.data?.full_queue_list?.length > 0
        ) {
          const data = refreshed.data;

          const remapped = (data.full_queue_list || []).map((p) => ({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            apptTime: p.appointment_time,
            status_tag: p.status_tag,
            aiInsight: p.ai_insight?.summary || null,
            initials: p.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join(""),
            color: AVATAR_COLORS[p.id % AVATAR_COLORS.length],
          }));

          const nowIdx = remapped.findIndex((p) => p.status_tag === "Now");

          if (remapped.length >= queueAfterShift.length) {
            setQueueList(remapped);
            setCurrentIdx(nowIdx >= 0 ? nowIdx : 0);
            setRemainingLabel(
              data.remaining_count_label ||
              `${remapped.filter((p) => p.status_tag === "Waiting").length} remaining`,
            );
          }
        }
      } else {
        console.error("[MarkAttended] backend rejected:", result?.message);
        setQueueList(prevQueueList);
        setCurrentIdx(prevCurrentIdx);
        setRemainingLabel(prevRemainingLabel);
      }
    } catch (err) {
      console.error("[MarkAttended] network error:", err);
      setQueueList(prevQueueList);
      setCurrentIdx(prevCurrentIdx);
      setRemainingLabel(prevRemainingLabel);
    }
  };
  const markAttended = (id) => {
    setQueueList((list) =>
      list.map((p) => (p.id === id ? { ...p, status_tag: "Attended" } : p)),
    );
    goToNextPatient();
  };

  const skipPatient = (id) => {
    setQueueList((list) =>
      list.map((p) => (p.id === id ? { ...p, status_tag: "Skipped" } : p)),
    );
    goToNextPatient();
  };

  const activePatient = queueList[currentIdx] ?? null;
  const pendingCount = queueList.filter(
    (p) => p.status_tag === "Now" || p.status_tag === "Waiting",
  ).length;

  const badgeClass = (p, i) => {
    if (p.status_tag === "Attended") return "dsn-badge-success";
    if (p.status_tag === "Skipped") return "dsn-badge-warning";
    if (i === currentIdx) return "dsn-badge-danger";
    return "dsn-badge-muted";
  };
  const badgeText = (p, i) => {
    if (p.status_tag === "Attended") return "✓ Attended";
    if (p.status_tag === "Skipped") return "→ Skipped";
    if (i === currentIdx) return "● Now";
    return `#${i + 1} Waiting`;
  };

  if (loadingQueue) {
    return (
      <div className="preview-shimmer" style={{ width: '100%', borderRadius: '13px', pointerEvents: 'none' }}>
        <div className="dsn-queue-section">
          <div className="dsn-section-header">
            <div className="dsn-section-title">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
              </svg>
              Critical Patient Queue
            </div>
            <span className="dsn-queue-count">4 remaining</span>
          </div>
          <div className="dsn-active-card">
            <div className="dsn-active-header">
              <div className="dsn-active-avatar" style={{ background: "#FF4D6D", color: "transparent" }}>X</div>
              <div className="dsn-active-info">
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Mahmoud Hassan</h3>
                <div className="dsn-active-meta" style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  45 Years • Male
                </div>
              </div>
            </div>
            <div style={{ marginTop: "16px", background: "rgba(0,0,0,0.02)", padding: "12px", borderRadius: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#3B5BDB", marginBottom: "8px" }}>AI INSIGHT</div>
              <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.4" }}>
                Patient shows irregular heartbeat patterns combined with elevated troponin levels from recent lab work. High risk of myocardial infarction. Immediate cardiovascular evaluation strongly recommended.
              </p>
            </div>
          </div>
          <div className="dsn-queue-list">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="dsn-queue-item">
                <div className="dsn-queue-item-left">
                  <div className="dsn-queue-item-avatar" style={{ background: "#e2e8f0", color: "transparent" }}>X</div>
                  <div className="dsn-queue-item-info">
                    <div className="dsn-queue-item-name">Nada Ali Ahmed</div>
                    <div className="dsn-queue-item-time">10:30 AM</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (queueList.length === 0) {
    return (
      <div className="dsn-queue-section">
        <div className="dsn-section-header">
          <div className="dsn-section-title">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
            </svg>
            Critical Patient Queue
          </div>
          <span className="dsn-queue-count">0 remaining</span>
        </div>
        <div className="dsn-done-card">
          <div className="dsn-done-title">No patients scheduled for today</div>
          <div className="dsn-done-sub">
            Today's queue is empty. Check back later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dsn-queue-section">
      <div className="dsn-section-header">
        <div className="dsn-section-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
          </svg>
          Critical Patient Queue
        </div>
        <span className="dsn-queue-count">
          {remainingLabel || `${pendingCount} remaining`}
        </span>
      </div>

      {activePatient &&
        activePatient.status_tag !== "Attended" &&
        activePatient.status_tag !== "Skipped" ? (
        <div className="dsn-active-card" key={activePatient.id}>
          <div
            className="dsn-active-avatar"
            style={{ background: activePatient.color }}
          >
            {activePatient.initials}
          </div>
          <div className="dsn-active-info">
            <div className="dsn-active-top">
              <span className="dsn-active-name">{activePatient.name}</span>
              <span className="dsn-now-badge">
                <span className="dsn-now-dot" /> Now Attending
              </span>
            </div>
            <div className="dsn-active-meta">
              <span className="dsn-active-meta-age">
                {activePatient.age} · {activePatient.gender}
              </span>
              <span className="dsn-active-appt">
                Appointment: {activePatient.apptTime}
              </span>
            </div>
            <DashboardQueueInsight text={activePatient.aiInsight || "No AI insights available for this patient"} />
          </div>
          <div className="dsn-active-actions">
            <button className="dsn-btn-attended" onClick={handleMarkAttended}>
              <svg viewBox="0 0 24 24" fill="white" className="dsn-btn-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Mark Attended
            </button>
            <button
              className="dsn-btn-view"
              onClick={() => handleViewDetails(activePatient.id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="dsn-btn-icon"
              >
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
              View Details
            </button>
            <div className="dsn-segmented-nav">
              <button
                onClick={goToPreviousPatient}
                className="dsn-btn-nav-segment"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNextPatient}
                className="dsn-btn-nav-segment"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="dsn-done-card">
          <div className="dsn-done-emoji">🎉</div>
          <div className="dsn-done-title">All patients attended!</div>
          <div className="dsn-done-sub">
            Today's queue is complete. Great work!
          </div>
        </div>
      )}

      <div className="dsn-queue-list">
        <div className="dsn-queue-list-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
          All Patients in Queue
        </div>
        {queueList.map((p, i) => (
          <div
            key={p.id}
            className={`dsn-mini-card${p.status_tag === "Attended"
              ? " dsn-attended"
              : p.status_tag === "Skipped"
                ? " dsn-skipped"
                : ""
              }`}
          >
            <div
              className={`dsn-queue-num${i === currentIdx &&
                (p.status_tag === "Now" || p.status_tag === "Waiting")
                ? " dsn-active-num"
                : ""
                }`}
            >
              {i + 1}
            </div>
            <div className="dsn-mini-avatar" style={{ background: p.color }}>
              {p.initials}
            </div>
            <div className="dsn-mini-info">
              <div className="dsn-mini-name">{p.name}</div>
              <div className="dsn-mini-sub">
                {p.age} · {p.gender} · {p.apptTime}
              </div>
            </div>
            <span className={`dsn-mini-badge ${badgeClass(p, i)}`}>
              {badgeText(p, i)}
            </span>
            <button
              className="dsn-mini-view-btn"
              onClick={() => setModalPatient(p)}
            >
              View
            </button>
          </div>
        ))}
      </div>

      {modalPatient && typeof document !== "undefined" ? createPortal(
        <div
          id="dsn-modal-overlay"
          className="dsn-open"
          onClick={(e) => {
            if (e.target.id === "dsn-modal-overlay") setModalPatient(null);
          }}
        >
          <div id="dsn-main" style={{ display: "contents" }}>
            <div id="dsn-modal-box">
            <div className="dsn-modal-header">
              <div
                className="dsn-modal-avatar"
                style={{ background: modalPatient.color }}
              >
                {modalPatient.initials}
              </div>
              <div>
                <div className="dsn-modal-title">{modalPatient.name}</div>
                <div className="dsn-modal-sub">
                  {modalPatient.age} · {modalPatient.gender} · Appointment:{" "}
                  {modalPatient.apptTime}
                </div>
              </div>
            </div>
            <div className="dsn-modal-divider" />
            <div className="dsn-modal-chips">
              {[
                {
                  label: "Age",
                  val: modalPatient.age,
                  className: "dsn-chip-default",
                },
                {
                  label: "Gender",
                  val: modalPatient.gender,
                  className: "dsn-chip-default",
                },
                {
                  label: "Appointment",
                  val: modalPatient.apptTime,
                  className: "dsn-chip-primary",
                },
                {
                  label: "Status",
                  val: modalPatient.status_tag,
                  className: "dsn-chip-status",
                },
              ].map((c) => (
                <div className={`dsn-modal-chip ${c.className}`} key={c.label}>
                  <div className="dsn-modal-chip-label">{c.label}</div>
                  <div className="dsn-modal-chip-val">{c.val}</div>
                </div>
              ))}
            </div>
            <div className="dsn-modal-notes">
              <strong style={{ display: "inline-flex", alignItems: "center" }}>
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" style={{ width: 14, height: 14, marginRight: 6 }}>
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                </svg>
                AI Insight:
              </strong>
              <br />
              {modalPatient.aiInsight ||
                "No AI insights available for this patient"}
            </div>
            <div className="dsn-modal-btns">
              <button
                className="dsn-modal-cancel"
                onClick={() => setModalPatient(null)}
              >
                Close
              </button>
              <button
                className="dsn-modal-confirm"
                onClick={() => {
                  setModalPatient(null);
                  handleViewDetails(modalPatient.id);
                }}
              >
                Open Full Report
              </button>
            </div>
          </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { unreadCount, openNotifications } = useNotifications();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const { credits, isCreditsLoading } = useSubscription();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const [data, setData] = useState(null);
  const [statusDistribution, setStatusDistribution] = useState(null);
  const [TopDiseases, setTopDiseases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const { getCache, setCache } = usePageCache();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target)
      ) {
        setIsAvatarMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      // ── Cache check ──
      const cached = getCache("dashboard_widgets");
      if (cached) {
        setData(cached.data);
        setStatusDistribution(cached.statusDistribution);
        setTopDiseases(cached.topDiseases);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getDashboardWidgets();
      const resultStatus = await getDashboardStatusDistribution();
      const resultTopDiseases = await getTopfiveDiseases();

      console.log(result);
      if (result.success) {
        setData(result.data);
        console.log("Dashboard Widgets:", result.data);
        if (result.data?.doctor_name) {
          localStorage.setItem("doctor_name", result.data.doctor_name);
        }
      }

      if (resultStatus.success) {
        setStatusDistribution(resultStatus.data);
        console.log("Dashboard Status Distribution:", resultStatus.data);
      }

      if (resultTopDiseases.success) {
        setTopDiseases(resultTopDiseases.data);
        console.log("Top 5 Diseases:", resultTopDiseases.data);
      }

      setLoading(false);

      // ── Populate cache after successful fetch ──
      if (result.success) {
        setCache("dashboard_widgets", {
          data: result.data,
          statusDistribution: resultStatus.success ? resultStatus.data : null,
          topDiseases: resultTopDiseases.success ? resultTopDiseases.data : null,
        });
      }
    };
    fetchData();
  }, [getCache, setCache]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const growthDetails = data?.widgets.monthly_growth.details;
  return (
    <>
      <Sidebar activePage="dashboard" />

      <Navbar
        isSidebarCollapsed={isSidebarCollapsed}
        credits={credits}
        isCreditsLoading={isCreditsLoading}
        unreadCount={unreadCount}
        getDoctorInitials={getDoctorInitials}
        openNotifications={openNotifications}
        setIsLogoutModalOpen={setIsLogoutModalOpen}
      />

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      {/* ── MAIN CONTENT (scoped under #dsn-main) ── */}
      <main className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div id="dsn-main">
          {/* ── TOP WHITE WRAPPER ── */}
          {loading ? (
            <div className="preview-shimmer" style={{ width: '100%', borderRadius: '24px', pointerEvents: 'none', display: 'block' }}>
              <div className="dsn-top-wrapper" style={{ pointerEvents: 'none' }}>
                <div className="dsn-greeting">
                  <h1>Welcome, Dr. Tareq Ahmed</h1>
                  <p>Here's a summary of today's key AI insights and patient status.</p>
                </div>
                <div className="dsn-stats-grid">
                  {[
                    { label: "Total Registered Patients", val: 450, color: "#3B5BDB", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
                    { label: "Today's Appointments", val: 12, color: "#3B5BDB", icon: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" },
                    { label: "Reports Analyzed", val: 38, color: "#2F9E44", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" },
                  ].map((item, idx) => (
                    <div className="dsn-stat-card" key={idx}>
                      <div className="dsn-stat-label">
                        <svg viewBox="0 0 24 24" fill={item.color} style={{ width: "20px" }}><path d={item.icon} /></svg>
                        <strong>{item.label}</strong>
                      </div>
                      <div><span className="dsn-stat-value dsn-dashboard-mask" style={{ display: 'inline-block' }}>{item.val}</span></div>
                    </div>
                  ))}
                  <div className="dsn-stat-card dsn-stat-card--growth">
                    <div className="dsn-stat-label dsn-stat-label--primary">
                      <svg viewBox="0 0 24 24" fill="var(--dsn-primary)" style={{ width: "20px" }}><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                      <strong>Monthly Patient Growth</strong>
                    </div>
                    <div className="dsn-growth-grid">
                      {[
                        { sub: "Last Mo.", valPath: 410 },
                        { sub: "This Mo.", valPath: 450, className: "dsn-growth-val--primary" },
                        { sub: "Diff.", valPath: "+40", className: "dsn-growth-val--success" },
                        { sub: "Growth", valPath: "↑9.7%", className: "dsn-growth-val--success" },
                      ].map((g, i) => (
                        <div className="dsn-growth-col" key={i}>
                          <div className="dsn-growth-sub">{g.sub}</div>
                          <div className={`dsn-growth-val ${g.className || ""} dsn-dashboard-mask`} style={{ display: 'inline-block' }}>{g.valPath}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dsn-charts-row preview-shimmer" style={{ marginTop: '24px', pointerEvents: 'none' }}>
                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Patient Status Distribution</div>
                  <div className="dsn-donut-wrap" style={{ position: "relative" }}>
                    <svg width="140" height="140" viewBox="0 0 130 130" className="dsn-donut-svg">
                      {(() => {
                        const radius = 50; const circumference = 2 * Math.PI * radius; let cumulativePercentage = 0;
                        const statusColors = { critical: "#FF4D6D", stable: "#06D6A0", "under review": "#FF8C42" };
                        const dummyData = [
                          { status: "critical", percentage: 33 },
                          { status: "stable", percentage: 33 },
                          { status: "under review", percentage: 34 },
                        ];
                        return dummyData.map((item, index) => {
                          const strokeLength = (item.percentage / 100) * circumference;
                          const offset = (cumulativePercentage / 100) * circumference;
                          cumulativePercentage += item.percentage;
                          return (
                            <circle key={index} cx="65" cy="65" r={radius} fill="none" stroke={statusColors[item.status]} strokeWidth="22" strokeDasharray={`${strokeLength + 0.5} ${circumference}`} strokeLinecap="round" strokeDashoffset={-offset} transform="rotate(-90 65 65)" className="dsn-donut-segment" />
                          );
                        });
                      })()}
                      <circle cx="65" cy="65" r="39" fill="white" />
                      <text x="65" y="61" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A1D2E" fontFamily="'Inter', sans-serif">450</text>
                      <text x="65" y="76" textAnchor="middle" fontSize="10" fill="#8C91A7" fontFamily="'Inter', sans-serif">patients</text>
                    </svg>
                    <div className="dsn-legend-list">
                      {[
                        { status: "critical", percentage: 33, color: "#FF4D6D", bg: "#FFF0F3" },
                        { status: "stable", percentage: 33, color: "#06D6A0", bg: "#E6FAF5" },
                        { status: "under review", percentage: 34, color: "#FF8C42", bg: "#FFF5ED" },
                      ].map((item, index) => (
                        <div key={index} className="dsn-legend-row" style={{ background: item.bg }}>
                          <div className="dsn-legend-dot" style={{ background: item.color }} />
                          <span className="dsn-legend-label">{item.status}</span>
                          <span className="dsn-legend-pct" style={{ color: item.color }}>{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Top 5 Chronic Diseases</div>
                  <div className="dsn-chart-subtitle">Selected by doctor in medical forms</div>
                  <div className="dsn-bar-chart-wrap">
                    <div className="dsn-bar-columns">
                      {(() => {
                        const barColors = [
                          "linear-gradient(180deg,#4361EE,#748FFC)",
                          "linear-gradient(180deg,#06D6A0,#3DCFB4)",
                          "linear-gradient(180deg,#FF8C42,#FFA96B)",
                          "linear-gradient(180deg,#FF4D6D,#FF7A93)",
                          "linear-gradient(180deg,#9B5DE5,#BB8AEE)",
                        ];
                        const dummyData = [
                          { label: "Hypertension", value: 120 },
                          { label: "Diabetes Type II", value: 95 },
                          { label: "Asthma", value: 80 },
                          { label: "Osteoarthritis", value: 65 },
                          { label: "Anemia", value: 40 },
                        ];
                        const maxVal = 120;
                        const maxHeight = 160;
                        return dummyData.map((item, i) => (
                          <div className="dsn-bar-col" key={i}>
                            <span className="dsn-bar-val">{item.value}</span>
                            <div className="dsn-bar-fill" style={{ background: barColors[i], height: `${(item.value / maxVal) * maxHeight}px` }} />
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="dsn-bar-labels">
                      {["Hypertension", "Diabetes Type II", "Asthma", "Osteoarthritis", "Anemia"].map((label, i) => (
                        <div key={i} className="dsn-bar-lbl" style={{ whiteSpace: "pre-line", textTransform: "capitalize" }}>{label}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dsn-top-wrapper-real-container" style={{ display: 'contents' }}>
              <div className="dsn-top-wrapper">
                <div className="dsn-greeting">
                  <h1>Welcome, Dr. {data?.doctor_name || "User"}</h1>
                  <p>Here's a summary of today's key AI insights and patient status.</p>
                </div>
                <div className="dsn-stats-grid">
                  {[
                    { label: "Total Registered Patients", val: data?.widgets.total_patients, color: "#3B5BDB", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
                    { label: "Today's Appointments", val: data?.widgets.today_appointments, color: "#3B5BDB", icon: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" },
                    { label: "Reports Analyzed", val: data?.widgets.reports_analyzed, color: "#2F9E44", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" },
                  ].map((item, idx) => (
                    <div className="dsn-stat-card" key={idx}>
                      <div className="dsn-stat-label">
                        <svg viewBox="0 0 24 24" fill={item.color} style={{ width: "20px" }}><path d={item.icon} /></svg>
                        <strong>{item.label}</strong>
                      </div>
                      <div>
                        <span className="dsn-stat-value">{item.val ?? 0}</span>
                      </div>
                    </div>
                  ))}
                  <div className="dsn-stat-card dsn-stat-card--growth">
                    <div className="dsn-stat-label dsn-stat-label--primary">
                      <svg viewBox="0 0 24 24" fill="var(--dsn-primary)" style={{ width: "20px" }}><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                      <strong>Monthly Patient Growth</strong>
                    </div>
                    <div className="dsn-growth-grid">
                      {[
                        { sub: "Last Mo.", valPath: data?.widgets.monthly_growth.details.last_month },
                        { sub: "This Mo.", valPath: data?.widgets.monthly_growth.details.this_month, className: "dsn-growth-val--primary" },
                        { sub: "Diff.", valPath: data?.widgets.monthly_growth.details.difference },
                        { sub: "Growth", valPath: data?.widgets.monthly_growth.details.growth_rate },
                      ].map((g, i) => (
                        <div className="dsn-growth-col" key={i}>
                          <div className="dsn-growth-sub">{g.sub}</div>
                          <div
                            className={`dsn-growth-val ${g.className || ""} ${g.sub === "Diff."
                              ? g.valPath?.toString().startsWith("-")
                                ? "dsn-growth-val--danger"
                                : "dsn-growth-val--success"
                              : ""
                              } ${g.sub === "Growth"
                                ? data?.widgets.monthly_growth.details.trend === "up"
                                  ? "dsn-growth-val--success"
                                  : "dsn-growth-val--danger"
                                : ""
                              }`}
                          >
                            {g.sub === "Growth"
                              ? `${data?.widgets.monthly_growth.details.trend === "up" ? "↑" : "↓"}${g.valPath}`
                              : (g.valPath ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dsn-charts-row">
                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Patient Status Distribution</div>
                  <div className="dsn-donut-wrap" style={{ position: "relative" }}>
                    <svg width="140" height="140" viewBox="0 0 130 130" className="dsn-donut-svg">
                      {(() => {
                        const radius = 50; const circumference = 2 * Math.PI * radius; let cumulativePercentage = 0;
                        const statusColors = { critical: "#FF4D6D", stable: "#06D6A0", "under review": "#FF8C42" };
                        const displayData = statusDistribution?.pie_chart_data || [];
                        return displayData.map((item, index) => {
                          const strokeLength = (item.percentage / 100) * circumference;
                          const offset = (cumulativePercentage / 100) * circumference;
                          cumulativePercentage += item.percentage;
                          return (
                            <circle
                              key={index}
                              cx="65" cy="65" r={radius} fill="none"
                              stroke={statusColors[item.status] || "#ccc"}
                              strokeWidth="22"
                              strokeDasharray={`${strokeLength + 0.5} ${circumference}`}
                              strokeLinecap="round" strokeDashoffset={-offset} transform="rotate(-90 65 65)" className="dsn-donut-segment"
                              onMouseEnter={() => setHoveredStatus(item)}
                              onMouseMove={(e) => setTooltipPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                              onMouseLeave={() => setHoveredStatus(null)}
                              style={{ transition: "all 0.3s ease", cursor: "pointer", opacity: hoveredStatus && hoveredStatus.status !== item.status ? 0.6 : 1 }}
                            />
                          );
                        });
                      })()}
                      <circle cx="65" cy="65" r="39" fill="white" />
                      <text x="65" y="61" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A1D2E" fontFamily="'Inter', sans-serif">
                        {statusDistribution?.total_registered_patients || 0}
                      </text>
                      <text x="65" y="76" textAnchor="middle" fontSize="10" fill="#8C91A7" fontFamily="'Inter', sans-serif">patients</text>
                    </svg>
                    {hoveredStatus && (
                      <div className="dsn-custom-tooltip" style={{ position: "absolute", left: tooltipPos.x + 15, top: tooltipPos.y - 10, pointerEvents: "none", zIndex: 100 }}>
                        <div className="tooltip-status" style={{ textTransform: "capitalize" }}><strong>{hoveredStatus.status}</strong></div>
                        <div className="tooltip-value">{hoveredStatus.value} Patients ({hoveredStatus.percentage}%)</div>
                      </div>
                    )}
                    <div className="dsn-legend-list">
                      {(statusDistribution?.pie_chart_data || []).map((item, index) => {
                        const config = { critical: { color: "#FF4D6D", bg: "#FFF0F3" }, stable: { color: "#06D6A0", bg: "#E6FAF5" }, "under review": { color: "#FF8C42", bg: "#FFF5ED" } };
                        const style = config[item.status] || { color: "#ccc", bg: "#f5f5f5" };
                        return (
                          <div key={index} className="dsn-legend-row" style={{ background: style.bg }}>
                            <div className="dsn-legend-dot" style={{ background: style.color }} />
                            <span className="dsn-legend-label">{item.status}</span>
                            <span className="dsn-legend-pct" style={{ color: style.color }}>{`${item.percentage}%`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Top 5 Chronic Diseases</div>
                  <div className="dsn-chart-subtitle">Selected by doctor in medical forms</div>
                  <div className="dsn-bar-chart-wrap">
                    <div className="dsn-bar-columns">
                      {(() => {
                        const barColors = [
                          "linear-gradient(180deg,#4361EE,#748FFC)", "linear-gradient(180deg,#06D6A0,#3DCFB4)", "linear-gradient(180deg,#FF8C42,#FFA96B)", "linear-gradient(180deg,#FF4D6D,#FF7A93)", "linear-gradient(180deg,#9B5DE5,#BB8AEE)",
                        ];
                        const displayData = TopDiseases || [];
                        const maxVal = Math.max(...(displayData.map((d) => d.value) || [1]));
                        const maxHeight = 160;
                        return displayData.map((item, i) => (
                          <div className="dsn-bar-col" key={i}>
                            <span className="dsn-bar-val">{item.value}</span>
                            <div className="dsn-bar-fill" style={{ background: barColors[i % barColors.length], height: `${(item.value / maxVal) * maxHeight}px`, transition: "height 0.5s ease" }} />
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="dsn-bar-labels">
                      {(TopDiseases || []).map((item, i) => (
                        <div key={i} className="dsn-bar-lbl" style={{ whiteSpace: "pre-line", textTransform: "capitalize" }}>{item.label}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── QUEUE MANAGEMENT ── */}
          <QueueSection />
        </div>
      </main>
    </>
  );
}
