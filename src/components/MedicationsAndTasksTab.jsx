import React, { useState, useEffect, useCallback, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  createVisitAPI,
  createVisitItem,
  getPatientVisitItems,
  deletePatientMedication,
  deletePatientTask,
} from "./mockAPI";
import ConfirmModal from "./ConfirmModal";
import moment from "moment";

const TrashIcon = () => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
); /* ─────────────────────────────────────────────
   MedicationsAndTasksTab
   Tasks & medications are fetched from:
   GET /api/patients/{patientId}/items
───────────────────────────────────────────── */

export default function MedicationsAndTasksTab({
  patientId,
  initialNextVisitDate,
  onNextVisitSaved,
  isActive,
}) {
  // ── View state: "dashboard" | "form" ──
  const [view, setView] = useState("dashboard");

  // ── Data ──
  const [meds, setMeds] = useState([]);
  const [taskItems, setTaskItems] = useState([]);
  const [nextVisitDisplay, setNextVisitDisplay] = useState(null);

  // ── Fetch state ──
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // ── Form step state: 1 | 2 ──
  const [step, setStep] = useState(1);

  // ── Step 1: visit date ──
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visitDateValue, setVisitDateValue] = useState("");
  const [visitSaved, setVisitSaved] = useState(false);

  // ── Step 2: type selection ──
  const [taskType, setTaskType] = useState(null); // "medications" | "tasks" | null

  // ── Medication form fields ──
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [savedMedsInForm, setSavedMedsInForm] = useState([]);

  // ── Task form fields ──
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskNextVisitDate, setTaskNextVisitDate] = useState(""); // maps to next_visit_date (shown as "Due Date" when hasNextVisit===false)
  const [taskNotes, setTaskNotes] = useState("");
  const [savedTasksInForm, setSavedTasksInForm] = useState([]);

  // ── hasNextVisit: tracks whether the user chose YES (true) or NO (false) in Step 1 ──
  const [hasNextVisit, setHasNextVisit] = useState(null); // null = not yet decided

  // ── Inline field validation errors ──
  const [errors, setErrors] = useState({});

  // ── Set of item IDs whose delete is in-flight (prevents double-click) ──
  const [deletingIds, setDeletingIds] = useState(new Set());

  // ── Delete Confirmation Modal State ──
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetType, setDeleteTargetType] = useState(null); // "medication" | "task"

  const openDeleteConfirmModal = (id, type) => {
    setDeleteTargetId(id);
    setDeleteTargetType(type);
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirmModal = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetType(null);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId || !deleteTargetType) return;

    // Call the appropriate delete function
    if (deleteTargetType === "medication") {
      await removeMedication(deleteTargetId);
    } else if (deleteTargetType === "task") {
      await removeTask(deleteTargetId);
    }

    closeDeleteConfirmModal();
  };

  // ── Visit API state ──
  const [visitId, setVisitId] = useState(null); // populated after action="next"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Toast ──
  const [toast, setToast] = useState({ show: false, msg: "" });
  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3000);
  };

const parseValidDate = (value) => {
  if (!value || value === "No next visit") return null;
  const m = moment(value, "YYYY-MM-DD HH:mm:ss"); 
  return m.isValid() ? m.toDate() : null;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  // بنجبره يقرأ التنسيق اللي إحنا مخزنينه
  return moment(dateStr, "YYYY-MM-DD HH:mm:ss").format("ddd, MMMM D, YYYY, h:mm A");
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  return moment(dateStr, "YYYY-MM-DD HH:mm:ss").format("MMM D, h:mm A");
};

  // ── Normalize a raw backend task object into the frontend shape ──
  const normalizeTask = (t) => ({
    id: t.id,
    title: t.title ?? "",
    desc: t.description ?? t.desc ?? "",
    notes: t.notes ?? "",
    // Due_date comes from the backend with capital D.
    // Fallback: visit.next_visit_date formatted short.
    due:
      t.Due_date ??
      t.due_date ??
      t.dueDate ??
      (t.visit?.next_visit_date
        ? formatDateShort(t.visit.next_visit_date)
        : null),
    dueStyle: "normal",
  });

  // ── Fetch all items (tasks + medications + next_visit_date) from backend ──
  const fetchVisitItems = useCallback(async () => {
    if (!patientId) return;
    setIsLoadingItems(true);
    setFetchError(null);
    const res = await getPatientVisitItems(patientId);
    setIsLoadingItems(false);
    if (res?.success) {
      setTaskItems((res.data?.tasks ?? []).map(normalizeTask));
      setMeds(res.data?.medications ?? []);
      const label = res.data?.next_visit_date || null;
      setNextVisitDisplay(label);
      if (label && onNextVisitSaved) {
        onNextVisitSaved(label);
      }
    } else {
      setFetchError(res?.message || "Failed to load items.");
    }
  }, [patientId, onNextVisitSaved]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFetchedRef = useRef(null);

  // ── On mount and when patientId changes, fetch items ──
  useEffect(() => {
    if (!isActive) return;
    if (hasFetchedRef.current === patientId) return;
    fetchVisitItems();
    hasFetchedRef.current = patientId;
  }, [fetchVisitItems, isActive, patientId]);

  // ─── Open / close form ────────────────────
  const openForm = () => {
    setView("form");
    setTaskType(null);
    setMedName("");
    setMedDosage("");
    setMedFreq("");
    setMedDuration("");
    setTaskTitle("");
    setTaskDesc("");
    setTaskNextVisitDate("");
    setTaskNotes("");
    setSavedMedsInForm([]);
    setSavedTasksInForm([]);
    setErrors({});

    // ALWAYS start at Step 1 — show the Yes/No question every time
    setStep(1);
    setHasNextVisit(null);

    // Always show the Yes/No question first (showDatePicker=false).
    // Pre-populate the date field so if the user picks "Yes" it's ready,
    // but do NOT skip past the question screen.
    setShowDatePicker(false);
    setVisitSaved(false);
    setVisitId(null);
    if (initialNextVisitDate) {
      setVisitDateValue(initialNextVisitDate); // pre-fill for convenience after "Yes"
    } else {
      setVisitDateValue("");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setView("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Step navigation ──────────────────────
  const goToStep = (s) => {
    setStep(s);
    if (s === 1) {
      if (!visitSaved) setShowDatePicker(false);
    }
  };

  // ─── Visit date change ────────────────────
  const onVisitDateChange = (val) => {
    setVisitDateValue(val);
    if (val) {
      setVisitSaved(true);
      const formatted = formatDate(val);
      setNextVisitDisplay(formatted);
    } else {
      setVisitSaved(false);
    }
  };

  // ─── Ensure we have a visitId (create draft if user chose "No") ─────────
  const ensureVisitId = async () => {
    if (visitId) return visitId;
    // Auto-create a draft visit so we have an id to post items under
    const res = await createVisitAPI({
      patient_id: patientId,
      has_next_visit: 0,
      action: "next",
    });
    if (res && res.success && res.data?.id) {
      setVisitId(res.data.id);
      return res.data.id;
    }
    return null;
  };

  // ─── Save medication ──────────────────────
  const saveMedication = async (createAnother) => {
    // Validate all required fields at once
    const newErrors = {};
    if (!medName.trim()) newErrors.medName = "Medication name is required";
    if (!medDosage.trim()) newErrors.medDosage = "Dosage is required";
    if (!medFreq.trim()) newErrors.medFreq = "Frequency is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const vid = await ensureVisitId();
    if (!vid) {
      setIsSubmitting(false);
      showToast("❌ Visit not created. Please set Next Visit first.");
      return;
    }

    const action = createAnother ? "save_and_create_another" : "save";
    const payload = {
      action,
      type: "medication",
      name: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFreq.trim(),
      ...(medDuration.trim() && { duration: medDuration.trim() }),
    };

    const res = await createVisitItem(vid, payload);
    setIsSubmitting(false);

    if (!res || res.success === false) {
      showToast(`❌ ${res?.message || "Failed to save medication."}`);
      return;
    }

    // Track the saved med in the form's summary list (lightweight, no state shape needed)
    const returnedMed = res.data?.medication ?? res.data ?? null;
    const savedMedSummary = {
      id: returnedMed?.id ?? Date.now(),
      name: returnedMed?.name ?? medName.trim(),
      dosage: returnedMed?.dosage ?? medDosage.trim(),
      frequency: returnedMed?.frequency ?? medFreq.trim(),
    };
    setSavedMedsInForm((prev) => [...prev, savedMedSummary]);

    // Re-fetch to get backend-sourced list + updated next_visit_date
    fetchVisitItems();

    // Case: save_and_create_another → keep form open, reset inputs
    if (res.data?.action === "save_and_create_another" || createAnother) {
      setMedName("");
      setMedDosage("");
      setMedFreq("");
      setMedDuration("");
      setErrors({});
      showToast("💊 Medication saved! Add another.");
    } else {
      // Case: save → status=completed → close flow
      showToast("✅ Medication saved successfully!");
      closeForm();
    }
  };

  // ─── Save task ────────────────────────────
  const saveTask = async (createAnother) => {
    // Validate all required fields at once
    const newErrors = {};
    if (!taskTitle.trim()) newErrors.taskTitle = "Task title is required";
    // Due Date shown only on NO path
    if (hasNextVisit === false && !taskNextVisitDate)
      newErrors.taskNextVisitDate = "Due date is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const vid = await ensureVisitId();
    if (!vid) {
      setIsSubmitting(false);
      showToast("❌ Visit not created. Please set Next Visit first.");
      return;
    }

    const action = createAnother ? "save_and_create_another" : "save";
    const payload = {
      action,
      type: "task",
      title: taskTitle.trim(),
      ...(taskDesc.trim() && { description: taskDesc.trim() }),
      ...(taskNotes.trim() && { notes: taskNotes.trim() }),
      // Only include next_visit_date when the user did NOT schedule one in step 1
      ...(!hasNextVisit &&
        taskNextVisitDate && { next_visit_date: taskNextVisitDate }),
    };

    const res = await createVisitItem(vid, payload);
    setIsSubmitting(false);

    if (!res || res.success === false) {
      showToast(`❌ ${res?.message || "Failed to save task."}`);
      return;
    }

    // Track the saved task in the form's summary list
    const returnedTask = res.data?.task ?? res.data ?? null;
    const savedTaskSummary = {
      id: returnedTask?.id ?? Date.now(),
      title: returnedTask?.title ?? taskTitle.trim(),
      due: returnedTask?.next_visit_date
        ? formatDateShort(returnedTask.next_visit_date)
        : returnedTask?.Due_date
          ? formatDateShort(returnedTask.Due_date)
          : taskNextVisitDate
            ? formatDateShort(taskNextVisitDate)
            : null,
    };
    setSavedTasksInForm((prev) => [...prev, savedTaskSummary]);

    // Re-fetch to get backend-sourced list + updated next_visit_date
    fetchVisitItems();

    // Case: save_and_create_another → keep form open, reset inputs
    if (res.data?.action === "save_and_create_another" || createAnother) {
      setTaskTitle("");
      setTaskDesc("");
      setTaskNextVisitDate("");
      setTaskNotes("");
      setErrors({});
      showToast("✅ Task saved! Add another.");
    } else {
      // Case: save → status=completed → close flow
      showToast("✅ Task saved successfully!");
      closeForm();
    }
  };

  // ─── Delete medication (calls backend, then removes from state) ─────────
  const removeMedication = async (medicationId) => {
    if (deletingIds.has(medicationId)) return; // already in-flight
    setDeletingIds((prev) => new Set(prev).add(medicationId));
    const res = await deletePatientMedication(patientId, medicationId);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(medicationId);
      return next;
    });
    if (res?.success) {
      setMeds((prev) => prev.filter((m) => m.id !== medicationId));
      fetchVisitItems(); // re-sync with backend
    } else {
      showToast(`❌ ${res?.message || "Failed to delete medication."}`);
    }
  };

  // ─── Delete task (calls backend, then removes from state) ────────────────
  const removeTask = async (taskId) => {
    if (deletingIds.has(taskId)) return; // already in-flight
    setDeletingIds((prev) => new Set(prev).add(taskId));
    const res = await deletePatientTask(patientId, taskId);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    if (res?.success) {
      setTaskItems((prev) => prev.filter((t) => t.id !== taskId));
      fetchVisitItems(); // re-sync with backend
    } else {
      showToast(`❌ ${res?.message || "Failed to delete task."}`);
    }
  };

  // ─── Stepper helpers ──────────────────────
  const stepperBg1 = step === 1 ? "#2A66FF" : "#00C187";
  const stepperColor1 = "white";
  const stepperLabel1 = step === 1 ? "#2A66FF" : "#00C187";
  const stepper1Content = step === 1 ? "1" : "✓";

  const stepperBg2 = step === 2 ? "#2A66FF" : "#E6EAF2";
  const stepperColor2 = step === 2 ? "white" : "#8A94A6";
  const stepperLabel2 = step === 2 ? "#2A66FF" : "#8A94A6";
  const stepper2Content = step === 2 ? "✓" : "2";

  const lineBg = step === 2 ? "#00C187" : "#E6EAF2";

  // ─── Render ───────────────────────────────
  return (
    <div className="medications-tasks-tab">
      {/* ══ DASHBOARD VIEW ══ */}
      {view === "dashboard" && (
        <div id="tasks-dashboard">
          {/* Inline fetch error */}
          {fetchError && !isLoadingItems && (
            <div className="med-task-error-banner">
              ⚠️ {fetchError}
            </div>
          )}

          {/* Top bar: Next Visit (left, flex-grow) + Add button (right) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {/* Next Visit – always visible, fills the left */}
            <div className={`med-task-next-visit-bar ${nextVisitDisplay ? 'has-visit' : ''}`}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="med-task-next-visit-icon"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="med-task-next-visit-text">
                {nextVisitDisplay
                  ? `Next Visit: ${nextVisitDisplay}`
                  : "No next visit scheduled"}
              </span>
            </div>

            {/* Add button */}
            <button
              onClick={openForm}
              className="med-task-add-btn"
            >
              + Add Tasks or Medications
            </button>
          </div>

          {/* Two columns: Medications | Tasks */}
          <div className={`med-task-grid ${isLoadingItems && (meds.length > 0 || taskItems.length > 0) ? 'loading-overlay' : ''}`}>
            {/* Medications Column */}
            <div className="card med-task-column">
              <div className="med-task-column-header">
                <div className="med-task-icon-box medication">
                  {/* Pill / medication icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.5 20.5L3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z" />
                    <line x1="8.5" y1="11.5" x2="15.5" y2="11.5" />
                  </svg>
                </div>
                <div className="med-task-column-title">
                  Medications
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {meds.map((m) => (
                  <div key={m.id} className="med-task-item-card">
                    <div className="med-task-item-info">
                      <div className="med-task-item-name">
                        {m.name}
                      </div>
                      <div className="med-task-item-details">
                        {m.dosage} — {m.frequency}
                      </div>
                    </div>
                    <button
                      onClick={() => openDeleteConfirmModal(m.id, "medication")}
                      disabled={deletingIds.has(m.id)}
                      aria-label={`Delete ${m.name}`}
                      title="Remove medication"
                      style={{
                        flexShrink: 0,
                        width: "26px",
                        height: "26px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(156,163,175,0.35)",
                        background: "rgba(156,163,175,0.08)",
                        borderRadius: "7px",
                        cursor: deletingIds.has(m.id)
                          ? "not-allowed"
                          : "pointer",
                        color: "#9ca3af",
                        padding: 0,
                        opacity: deletingIds.has(m.id) ? 0.45 : 1,
                        transition:
                          "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease",
                      }}
                      onMouseOver={(e) => {
                        if (deletingIds.has(m.id)) return;
                        e.currentTarget.style.background =
                          "rgba(225,29,72,0.10)";
                        e.currentTarget.style.borderColor =
                          "rgba(225,29,72,0.45)";
                        e.currentTarget.style.color = "#e11d48";
                        e.currentTarget.style.transform = "scale(1.08)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          "rgba(156,163,175,0.08)";
                        e.currentTarget.style.borderColor =
                          "rgba(156,163,175,0.35)";
                        e.currentTarget.style.color = "#9ca3af";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks Column */}
            <div className="card med-task-column">
              <div className="med-task-column-header">
                <div className="med-task-icon-box task">
                  {/* Clipboard-list / tasks icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                    <line x1="9" y1="12" x2="15" y2="12" />
                    <line x1="9" y1="16" x2="13" y2="16" />
                  </svg>
                </div>
                <div className="med-task-column-title">
                  Tasks
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {taskItems.map((t) => {
                  const isUrgent = t.dueStyle === "urgent";
                  return (
                    <div key={t.id} className="med-task-item-card">
                      <div className="med-task-item-main">
                        <div className="med-task-item-content">
                          <div className="med-task-item-title">
                            {t.title}
                          </div>
                          {t.desc && (
                            <div className="med-task-item-desc">
                              {t.desc}
                            </div>
                          )}
                        </div>

                        <div className="med-task-item-actions">
                          {t.due ? (
                            <span className={`med-task-due-pill ${isUrgent ? 'urgent' : ''}`}>
                              Due {t.due}
                            </span>
                          ) : null}

                          <button
                            onClick={() => openDeleteConfirmModal(t.id, "task")}
                            disabled={deletingIds.has(t.id)}
                            aria-label={`Delete task: ${t.title}`}
                            title="Remove task"
                            className="med-task-delete-btn"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inline loading indicator moved to bottom */}
          {isLoadingItems && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "#8A94A6",
                fontSize: "14px",
                fontStyle: "italic",
              }}
            >
              {meds.length > 0 || taskItems.length > 0
                ? "Refreshing…"
                : "Loading…"}
            </div>
          )}
        </div>
      )}

      {/* ══ FORM VIEW ══ */}
      {view === "form" && (
        <div id="tasks-form-view">
          <div
            className="card"
            style={{ position: "relative", padding: "16px 48px 40px" }}
          >
            {/* ── Back icon — absolutely positioned top-left, no layout impact ── */}
            <button
              type="button"
              className="flow-back-icon"
              aria-label="Back"
              onClick={closeForm}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* ── 2-step Stepper ── */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: "40px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: stepperBg1,
                    color: stepperColor1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "15px",
                    transition: "all 0.3s",
                  }}
                >
                  {stepper1Content}
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: stepperLabel1,
                    whiteSpace: "nowrap",
                  }}
                >
                  Next Visit
                </span>
              </div>
              <div
                style={{
                  height: "2px",
                  flex: 1,
                  background: lineBg,
                  marginTop: "19px",
                  marginLeft: "8px",
                  marginRight: "8px",
                  transition: "background 0.4s",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: stepperBg2,
                    color: stepperColor2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "15px",
                    transition: "all 0.3s",
                  }}
                >
                  {stepper2Content}
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: stepperLabel2,
                    whiteSpace: "nowrap",
                  }}
                >
                  Medications &amp; Tasks
                </span>
              </div>
            </div>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0E1A34",
                    textAlign: "center",
                    marginBottom: "6px",
                  }}
                >
                  Schedule Next Visit
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#8A94A6",
                    textAlign: "center",
                    marginBottom: "32px",
                  }}
                >
                  Pick the date and time for the patient's next appointment
                </p>

                {!showDatePicker && (
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowDatePicker(true);
                        setHasNextVisit(true);
                      }}
                      style={{
                        padding: "12px 48px",
                        borderRadius: "12px",
                        border: "1.5px solid #E6EAF2",
                        background: "white",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#0E1A34",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        minWidth: "130px",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = "#2A66FF";
                        e.currentTarget.style.color = "#2A66FF";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = "#E6EAF2";
                        e.currentTarget.style.color = "#0E1A34";
                      }}
                    >
                      Yes
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={async () => {
                        // "No" path: create a draft visit to get a visit id, then go to step 2
                        setIsSubmitting(true);
                        setSubmitError(null);
                        const res = await createVisitAPI({
                          patient_id: patientId,
                          has_next_visit: 0,
                          action: "next",
                        });
                        setIsSubmitting(false);
                        if (res && res.success && res.data?.id) {
                          setVisitId(res.data.id);
                        }
                        setHasNextVisit(false);
                        // Even if draft creation failed we still navigate (ensureVisitId will retry)
                        goToStep(2);
                      }}
                      style={{
                        padding: "12px 48px",
                        borderRadius: "12px",
                        border: "1.5px solid #E6EAF2",
                        background: "white",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: isSubmitting ? "#aaa" : "#0E1A34",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        minWidth: "130px",
                        opacity: isSubmitting ? 0.6 : 1,
                      }}
                      onMouseOver={(e) => {
                        if (!isSubmitting) {
                          e.currentTarget.style.borderColor = "#2A66FF";
                          e.currentTarget.style.color = "#2A66FF";
                        }
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = "#E6EAF2";
                        e.currentTarget.style.color = isSubmitting
                          ? "#aaa"
                          : "#0E1A34";
                      }}
                    >
                      {isSubmitting ? "Please wait…" : "No"}
                    </button>
                  </div>
                )}

                {showDatePicker && (
                  <div style={{ marginTop: "28px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "14px 18px",
                        background: visitSaved ? "#F0FDF8" : "#F8FAFF",
                        borderRadius: "12px",
                        border: `1.5px solid ${visitSaved ? "#00C187" : "#E6EAF2"}`,
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          background: "#E9F0FF",
                          borderRadius: "9px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#2A66FF"
                          strokeWidth="2"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#8A94A6",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "3px",
                          }}
                        >
                          Next Visit Date &amp; Time
                        </div>
                      <div className="med-task-date-status-box">
                        <div className="med-task-date-input-wrapper">
                          <DatePicker
                            selected={parseValidDate(visitDateValue)}
                            onChange={(date) => {
                              if (date) {
                                const formattedDate = moment(date).format("YYYY-MM-DD HH:mm:ss");
                                onVisitDateChange(formattedDate);
                              } else {
                                onVisitDateChange("");
                              }
                            }}
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            placeholderText="Select date and time"
                            wrapperClassName="datepicker-wrapper"
                            className="step1-datepicker-input"
                            portalId="root"
                          />
                        </div>
                        {visitSaved && (
                          <div className="med-task-check-icon">
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {visitSaved && (
                      <div className="med-task-saved-date-mini-card">
                        <div className="med-task-saved-date-pill">
                          <span className="med-task-calendar-icon">📅</span>
                          <span className="med-task-saved-date-text">
                            {nextVisitDisplay}
                          </span>
                        </div>
                      </div>
                    )}

                    {submitError && (
                      <div className="med-task-error-banner small">
                        ⚠️ {submitError}
                      </div>
                    )}

                    <div className="med-task-form-actions">
                      <button
                        disabled={isSubmitting}
                        className="med-task-btn-back"
                        onClick={async () => {
                          if (!visitDateValue) {
                            showToast("⚠️ Please pick a date first");
                            return;
                          }
                          setIsSubmitting(true);
                          setSubmitError(null);
                          const res = await createVisitAPI({
                            patient_id: patientId,
                            has_next_visit: true,
                            next_visit_date: visitDateValue,
                            action: "save",
                          });
                          setIsSubmitting(true); // Wait for res
                          setIsSubmitting(false);
                          if (res && res.success) {
                            const savedDate = res.data?.next_visit_date || visitDateValue;
                            if (onNextVisitSaved) onNextVisitSaved(savedDate);
                            window.dispatchEvent(
                              new CustomEvent("patientNextVisitUpdated", {
                                detail: {
                                  patientId,
                                  next_visit_date: savedDate,
                                },
                              }),
                            );
                            showToast("✅ Visit saved successfully!");
                            closeForm();
                          } else {
                            setSubmitError(res?.message || "Failed to save visit. Please try again.");
                          }
                        }}
                      >
                        {isSubmitting ? "Saving…" : "+ Save & Back"}
                      </button>
                      <button
                        disabled={isSubmitting}
                        className="med-task-btn-next"
                        onClick={async () => {
                          if (!visitDateValue) {
                            showToast("⚠️ Please pick a date first");
                            return;
                          }
                          setIsSubmitting(true);
                          setSubmitError(null);
                          const res = await createVisitAPI({
                            patient_id: patientId,
                            has_next_visit: true,
                            next_visit_date: visitDateValue,
                            action: "next",
                          });
                          setIsSubmitting(false);
                          if (res && res.success) {
                            if (res.data?.id) setVisitId(res.data.id);
                            const savedDate = res.data?.next_visit_date || visitDateValue;
                            if (onNextVisitSaved) onNextVisitSaved(savedDate);
                            window.dispatchEvent(
                              new CustomEvent("patientNextVisitUpdated", {
                                detail: {
                                  patientId,
                                  next_visit_date: savedDate,
                                },
                              }),
                            );
                            goToStep(2);
                          } else {
                            setSubmitError(res?.message || "Failed to create visit. Please try again.");
                          }
                        }}
                      >
                        {isSubmitting ? "Please wait…" : "Next →"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div>
                {/* Type toggle */}
                <div className="med-task-type-toggle">
                  <button
                    onClick={() => setTaskType("medications")}
                    className={`med-task-type-btn ${taskType === "medications" ? "active" : ""}`}
                  >
                    Medications
                  </button>
                  <button
                    onClick={() => setTaskType("tasks")}
                    className={`med-task-type-btn ${taskType === "tasks" ? "active" : ""}`}
                  >
                    Tasks
                  </button>
                </div>

                {/* Medication form */}
                {taskType === "medications" && (
                  <div>
                    <div className="med-task-form-grid">
                      <div className="form-group no-margin">
                        <label className="form-label">
                          Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-input${errors.medName ? " input-error" : ""}`}
                          placeholder="e.g. Atorvastatin"
                          value={medName}
                          onChange={(e) => {
                            setMedName(e.target.value);
                            if (errors.medName)
                              setErrors((p) => ({ ...p, medName: "" }));
                          }}
                        />
                        {errors.medName && (
                          <p className="field-error">{errors.medName}</p>
                        )}
                      </div>
                      <div className="form-group no-margin">
                        <label className="form-label">
                          Dosage <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-input${errors.medDosage ? " input-error" : ""}`}
                          placeholder="e.g. 20mg"
                          value={medDosage}
                          onChange={(e) => {
                            setMedDosage(e.target.value);
                            if (errors.medDosage)
                              setErrors((p) => ({ ...p, medDosage: "" }));
                          }}
                        />
                        {errors.medDosage && (
                          <p className="field-error">{errors.medDosage}</p>
                        )}
                      </div>
                      <div className="form-group no-margin">
                        <label className="form-label">
                          Frequency <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-input${errors.medFreq ? " input-error" : ""}`}
                          placeholder="e.g. Once daily"
                          value={medFreq}
                          onChange={(e) => {
                            setMedFreq(e.target.value);
                            if (errors.medFreq)
                              setErrors((p) => ({ ...p, medFreq: "" }));
                          }}
                        />
                        {errors.medFreq && (
                          <p className="field-error">{errors.medFreq}</p>
                        )}
                      </div>
                      <div className="form-group no-margin">
                        <label className="form-label">Duration</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 1 month"
                          value={medDuration}
                          onChange={(e) => setMedDuration(e.target.value)}
                        />
                      </div>
                    </div>

                    {savedMedsInForm.length > 0 && (
                      <div className="med-task-added-list-container">
                        <div className="med-task-added-list-header">
                          💊 Added
                        </div>
                        <div className="med-task-added-list-stack">
                          {savedMedsInForm.map((m) => (
                            <div key={m.id} className="med-task-added-item-mini">
                              <span className="med-task-added-item-text">
                                💊 <strong>{m.name}</strong> — {m.dosage} —{" "}
                                {m.frequency}
                              </span>
                              <span className="med-task-added-item-check">✓</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="med-task-form-footer">
                      <button
                        onClick={() => goToStep(1)}
                        disabled={isSubmitting}
                        className="med-task-btn-secondary"
                      >
                        ← Back
                      </button>
                      <div className="med-task-footer-button-group">
                        <button
                          onClick={() => saveMedication(false)}
                          disabled={isSubmitting}
                          className="med-task-btn-outline"
                        >
                          {isSubmitting ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => saveMedication(true)}
                          disabled={isSubmitting}
                          className="med-task-btn-primary"
                        >
                          {isSubmitting ? "Saving…" : "Save & create another"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks form */}
                {taskType === "tasks" && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">
                        Title <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input${errors.taskTitle ? " input-error" : ""}`}
                        placeholder="e.g. Schedule MRI"
                        value={taskTitle}
                        onChange={(e) => {
                          setTaskTitle(e.target.value);
                          if (errors.taskTitle)
                            setErrors((p) => ({ ...p, taskTitle: "" }));
                        }}
                      />
                      {errors.taskTitle && (
                        <p className="field-error">{errors.taskTitle}</p>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Liver assessment follow-up"
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                      />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "18px",
                        marginBottom: "18px",
                      }}
                    >
                      {/* Next Visit date: only shown when user chose NO in step 1 (hasNextVisit===false) */}
                      {hasNextVisit === false && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">
                            Next Visit <span className="required">*</span>
                          </label>
                          <DatePicker
                            selected={parseValidDate(taskNextVisitDate)}
                            onChange={(date) => {
                              if (date) {
                                const formattedDate = moment(date).format("YYYY-MM-DD HH:mm:ss");
                                setTaskNextVisitDate(formattedDate);
                                if (errors.taskNextVisitDate)
                                  setErrors((p) => ({
                                    ...p,
                                    taskNextVisitDate: "",
                                  }));
                              } else {
                                setTaskNextVisitDate("");
                              }
                            }}
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            placeholderText="Select due date and time"
                            wrapperClassName="datepicker-wrapper"
                            className={`form-input styled-datepicker${errors.taskNextVisitDate ? " input-error" : ""}`}
                            portalId="root"
                          />
                          {errors.taskNextVisitDate && (
                            <p className="field-error">
                              {errors.taskNextVisitDate}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Notes: full-width when Due Date is hidden (YES path), half-width otherwise */}
                      <div
                        className={`form-group${hasNextVisit === true ? " notes-full" : ""}`}
                        style={{ marginBottom: 0 }}
                      >
                        <label className="form-label">Notes</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. complete before next appointment"
                          value={taskNotes}
                          onChange={(e) => setTaskNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    {savedTasksInForm.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#3A4560",
                            marginBottom: "8px",
                          }}
                        >
                          ✅ Added
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {savedTasksInForm.map((t) => (
                            <div
                              key={t.id}
                              style={{
                                padding: "10px 14px",
                                background: "#E9F0FF",
                                borderRadius: "8px",
                                border: "1px solid #C0D0FF",
                                fontSize: "13px",
                                color: "#0E1A34",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span>
                                ✅ <strong>{t.title}</strong>
                                {t.due ? ` — Due: ${t.due}` : ""}
                              </span>
                              <span
                                style={{ color: "#2A66FF", fontWeight: 600 }}
                              >
                                ✓
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="med-task-form-footer">
                      <button
                        onClick={() => goToStep(1)}
                        disabled={isSubmitting}
                        className="med-task-btn-secondary"
                      >
                        ← Back
                      </button>
                      <div className="med-task-footer-button-group">
                        <button
                          onClick={() => saveTask(false)}
                          disabled={isSubmitting}
                          className="med-task-btn-outline"
                        >
                          {isSubmitting ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => saveTask(true)}
                          disabled={isSubmitting}
                          className="med-task-btn-primary"
                        >
                          {isSubmitting ? "Saving…" : "Save & create another"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* No type selected yet */}
                {!taskType && (
                  <div className="med-task-form-footer no-type">
                    <button
                      onClick={() => goToStep(1)}
                      className="med-task-btn-secondary"
                    >
                      ← Back
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRMATION MODAL ══ */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={closeDeleteConfirmModal}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTargetType === "medication" ? "Medication" : "Task"}`}
        description={`Are you sure you want to delete this ${deleteTargetType}?`}
        confirmText="Delete"
        variant="danger"
        icon={<TrashIcon />}
      />
    </div>
  );
}
