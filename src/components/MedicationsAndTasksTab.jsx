import React, { useState, useEffect, useCallback, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  createVisitAPI,
  createVisitMedication,
  createVisitTask,
  getPatientVisitItems,
  getVisitEditAPI,
  deletePatientMedication,
  deletePatientTask,
  updatePatientVisitDateAPI,
} from "./mockAPI";
import ConfirmModal from "./ConfirmModal";
import moment from "moment";

const getSessionActionDate = (patientId) => {
  try {
    return sessionStorage.getItem(`latestActionDate_${patientId}`);
  } catch {
    return null;
  }
};

const setSessionActionDate = (patientId, date) => {
  try {
    if (date) sessionStorage.setItem(`latestActionDate_${patientId}`, date);
    else sessionStorage.removeItem(`latestActionDate_${patientId}`);
  } catch {}
};

/**
 * Extracts the most useful error message from an API response.
 * Priority:
 *  1. First field-level error from res.errors (or res.data when it's an object of arrays)
 *  2. res.message
 *  3. fallback string
 */
const extractApiError = (res, fallback = "Something went wrong.") => {
  const errorsObj = res?.errors ?? (res?.data && typeof res.data === "object" && !Array.isArray(res.data) ? res.data : null);
  if (errorsObj) {
    for (const key of Object.keys(errorsObj)) {
      const val = errorsObj[key];
      if (Array.isArray(val) && val.length > 0) return val[0];
      if (typeof val === "string" && val) return val;
    }
  }
  return res?.message || fallback;
};

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
);

export default function MedicationsAndTasksTab({
  patientId,
  initialNextVisitDate,
  onNextVisitSaved,
  isActive,
}) {
  const [view, setView] = useState("dashboard");

  const [meds, setMeds] = useState([]);
  const [taskItems, setTaskItems] = useState([]);
  const [nextVisitDisplay, setNextVisitDisplay] = useState(null);

  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [step, setStep] = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visitDateValue, setVisitDateValue] = useState("");
  const [visitSaved, setVisitSaved] = useState(false);

  const [taskType, setTaskType] = useState(null);

  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [savedMedsInForm, setSavedMedsInForm] = useState([]);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskNextVisitDate, setTaskNextVisitDate] = useState("");
  const [isNextVisitLocked, setIsNextVisitLocked] = useState(false);
  const [taskNotes, setTaskNotes] = useState("");
  const [savedTasksInForm, setSavedTasksInForm] = useState([]);

  const [hasNextVisit, setHasNextVisit] = useState(null);

  const [errors, setErrors] = useState({});

  const [deletingIds, setDeletingIds] = useState(new Set());

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetType, setDeleteTargetType] = useState(null);

  const [isEditingVisit, setIsEditingVisit] = useState(false);
  const [selectedNewDate, setSelectedNewDate] = useState(null);

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

    if (deleteTargetType === "medication") {
      await removeMedication(deleteTargetId);
    } else if (deleteTargetType === "task") {
      await removeTask(deleteTargetId);
    }

    closeDeleteConfirmModal();
  };

  const [visitId, setVisitId] = useState(null);
  // Ref mirrors visitId for synchronous reads inside async callbacks
  // (avoids stale-closure bugs, especially with Save & create another)
  const visitIdRef = useRef(null);
  const latestLoadedVisitIdRef = useRef(null);
  const isCreatingVisitRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [toast, setToast] = useState({ show: false, msg: "" });
  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3000);
  };

  const parseValidDate = (value) => {
    if (!value || value === "No next visit") return null;
    const cleanValue = value.replace(/Z$/, '').replace(/\+00:00$/, '');
    const m = moment(cleanValue, [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DDTHH:mm:ss.SSSSSS",
      "YYYY-MM-DD",
    ]);
    return m.isValid() ? m.toDate() : null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return moment(dateStr, "YYYY-MM-DD HH:mm:ss").format(
      "ddd, MMMM D, YYYY, h:mm A",
    );
  };

  const filterPassedTime = (time) => {
    const currentDate = new Date();
    const selectedDate = new Date(time);
    return currentDate.getTime() < selectedDate.getTime();
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    let m = moment(dateStr, [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DD",
      "MMMM D",
      "ddd, MMM D, YYYY h:mm A",
      "ddd, MMMM D, YYYY h:mm A",
      "ddd, MMM DD, YYYY h:mm A"
    ]);
    if (!m.isValid()) m = moment(dateStr);
    if (!m.isValid()) return dateStr;
    return m.hours() === 0 && m.minutes() === 0
      ? m.format("MMM D")
      : m.format("MMM D, h:mm A");
  };

  const normalizeTask = (t) => {

    const buildVisitDateTime = (visit) => {
      if (!visit) return null;

      const dateStr = visit.next_visit_date;
      const timeStr = visit.time;

      if (!dateStr) return null;

      if (timeStr) {
        const combined = `${dateStr} ${timeStr}`;
        const m = moment(combined, "YYYY-MM-DD h:mm A");
        if (m.isValid()) return m.format("MMM D, h:mm A");
      }

      const m = moment(dateStr, "YYYY-MM-DD");
      return m.isValid() ? m.format("MMM D") : null;
    };

    return {
      id: t.id,
      title: t.title ?? "",
      desc: t.description ?? t.desc ?? "",
      notes: t.notes ?? "",
      due: buildVisitDateTime(t.visit) ?? (t.due_date ? formatDateShort(t.due_date) : t.Due_date ? formatDateShort(t.Due_date) : null),
      dueStyle: "normal",
    };
  };

  const fetchVisitItems = useCallback(async () => {
    if (!patientId) return;
    setIsLoadingItems(true);
    setFetchError(null);
    const res = await getPatientVisitItems(patientId);
    setIsLoadingItems(false);

    if (res?.success) {
      const rawTasks = res.data?.tasks ?? [];
      setTaskItems(rawTasks.map(normalizeTask));
      setMeds(res.data?.medications ?? []);

      let maxDateRaw = res.data?.latest_next_visit_date || res.data?.next_visit_date || null;
      let maxDateObj = null;

      if (maxDateRaw) {
        const m = moment(maxDateRaw, [
          "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD",
          "ddd, MMM D, YYYY h:mm A", "ddd, MMMM D, YYYY, h:mm A"
        ]);
        if (!m.isValid()) {
          const fallback = moment(maxDateRaw);
          if (fallback.isValid()) maxDateObj = fallback;
        } else {
          maxDateObj = m;
        }
      }

      rawTasks.forEach(t => {
        const tDue = t.due_date || t.Due_date;
        if (tDue) {
          const m = moment(tDue, [
            "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD",
            "ddd, MMM D, YYYY h:mm A", "ddd, MMMM D, YYYY, h:mm A"
          ]);
          const parsed = m.isValid() ? m : moment(tDue);
          if (parsed.isValid()) {
            if (!maxDateObj || parsed.isAfter(maxDateObj)) {
              maxDateObj = parsed;
              maxDateRaw = tDue;
            }
          }
        }
      });

      let displayLabel = maxDateRaw;
      if (maxDateObj) {
        displayLabel = maxDateObj.format("ddd, MMMM D, YYYY, h:mm A");
      }

      // Reflects the absolute latest entry action performed by the user session
      const sessionLatest = getSessionActionDate(patientId);
      if (sessionLatest) {
        displayLabel = sessionLatest;
      }

      setNextVisitDisplay(displayLabel);
      if (displayLabel && onNextVisitSaved) {
        onNextVisitSaved(displayLabel);
      }

      // Extract next_visit_id from the updated backend contract
      const existingId = res.data?.next_visit_id || null;
      if (existingId) {
        latestLoadedVisitIdRef.current = existingId;
      }
    } else {
      // Treat 404/resource-not-found as empty state, not a hard error
      const msg = res?.message || "";
      const isNotFound =
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("no visit") ||
        msg.toLowerCase().includes("no record");
      if (!isNotFound) {
        setFetchError(msg || "Failed to load items.");
      }
    }
  }, [patientId, onNextVisitSaved]);

  const hasFetchedRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    if (hasFetchedRef.current === patientId) return;
    fetchVisitItems();
    hasFetchedRef.current = patientId;
  }, [fetchVisitItems, isActive, patientId]);

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
    setIsNextVisitLocked(false);
    setSavedMedsInForm([]);
    setSavedTasksInForm([]);
    setErrors({});

    setStep(1);
    // Reset visitId both in state and in the synchronous ref
    visitIdRef.current = null;
    setVisitId(null);

    // Always open at the Yes/No question — never skip to the date picker
    setHasNextVisit(null);
    setShowDatePicker(false);
    setVisitSaved(false);

    // Silently store any existing date so Yes button can prefill it
    const prefillDate = nextVisitDisplay || initialNextVisitDate || null;
    setVisitDateValue(prefillDate || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setView("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep = (s) => {
    setStep(s);
    if (s === 1) {
      if (!visitSaved) setShowDatePicker(false);
    }
  };

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

  const ensureVisitId = async () => {
    // Read from ref — always current, even between React renders
    if (visitIdRef.current) return visitIdRef.current;

    if (hasNextVisit === false && latestLoadedVisitIdRef.current) {
      visitIdRef.current = latestLoadedVisitIdRef.current;
      setVisitId(latestLoadedVisitIdRef.current);
      return latestLoadedVisitIdRef.current;
    }

    if (isCreatingVisitRef.current) {
      // Very brief polling guard if multiple saves are fired at once
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100));
        if (visitIdRef.current) return visitIdRef.current;
      }
    }

    isCreatingVisitRef.current = true;

    try {
      const payload = {
        patient_id: patientId,
        action: "next",
      };

      if (hasNextVisit === true) {
        payload.has_next_visit = true;
        payload.next_visit_date = visitDateValue;
      } else {
        payload.has_next_visit = false;
      }

      const res = await createVisitAPI(payload);
      // Reject explicit error responses
      if (res?.success === false) {
        if (res?.errors?.next_visit_date) {
          setStep(1);
          setSubmitError(extractApiError(res));
          return "VALIDATION_ERROR";
        }
        return null;
      }
      // Handle common backend response shapes:
      const id =
        res?.data?.id ??
        res?.data?.visit?.id ??
        res?.data?.visit_session?.id ??
        res?.id ??
        res?.visit?.id ??
        res?.visit_id ??
        res?.patient_visit_id ??
        null;

      if (id) {
        visitIdRef.current = id;
        setVisitId(id);
        return id;
      }

      // Fallback if backend returned success but no explicit id
      if (latestLoadedVisitIdRef.current) {
        visitIdRef.current = latestLoadedVisitIdRef.current;
        setVisitId(latestLoadedVisitIdRef.current);
        return latestLoadedVisitIdRef.current;
      }

      return null;
    } finally {
      isCreatingVisitRef.current = false;
    }
  };

  const saveMedication = async (createAnother) => {
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
    if (vid === "VALIDATION_ERROR") {
      setIsSubmitting(false);
      return;
    }
    if (!vid) {
      setIsSubmitting(false);
      showToast("❌ Visit not created. Please set Next Visit first.");
      return;
    }

    const action = createAnother ? "save_and_create_another" : "save";
    const payload = {
      action,
      name: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFreq.trim(),
      ...(medDuration.trim() && { duration: medDuration.trim() }),
      ...(hasNextVisit === true && visitDateValue && { next_visit_date: visitDateValue }),
    };

    const res = await createVisitMedication(vid, payload);
    setIsSubmitting(false);

    if (!res || res.success === false) {
      showToast(`❌ ${extractApiError(res, "Failed to save medication.")}`);
      return;
    }

    const returnedMed = res.data?.medication ?? res.data ?? null;
    const savedMedSummary = {
      id: returnedMed?.id ?? Date.now(),
      name: returnedMed?.name ?? medName.trim(),
      dosage: returnedMed?.dosage ?? medDosage.trim(),
      frequency: returnedMed?.frequency ?? medFreq.trim(),
    };
    setSavedMedsInForm((prev) => [...prev, savedMedSummary]);

    fetchVisitItems();

    if (res.data?.action === "save_and_create_another" || createAnother) {
      setMedName("");
      setMedDosage("");
      setMedFreq("");
      setMedDuration("");
      setErrors({});
      showToast("💊 Medication saved! Add another.");
    } else {
      showToast("✅ Medication saved successfully!");
      closeForm();
    }
  };

  const saveTask = async (createAnother) => {
    const newErrors = {};
    if (!taskTitle.trim()) newErrors.taskTitle = "Task title is required";
    if (hasNextVisit === false && !taskNextVisitDate)
      newErrors.taskNextVisitDate = "Due date is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const vid = await ensureVisitId();
    if (vid === "VALIDATION_ERROR") {
      setIsSubmitting(false);
      return;
    }
    if (!vid) {
      setIsSubmitting(false);
      showToast("❌ Visit not created. Please set Next Visit first.");
      return;
    }

    const action = createAnother ? "save_and_create_another" : "save";
    const payload = {
      action,
      title: taskTitle.trim(),
      ...(taskDesc.trim() && { description: taskDesc.trim() }),
      ...(taskNotes.trim() && { notes: taskNotes.trim() }),
    };

    if (hasNextVisit === true && visitDateValue) {
      payload.next_visit_date = visitDateValue;
    } else if (hasNextVisit === false && taskNextVisitDate) {
      payload.next_visit_date = taskNextVisitDate;
    }

    const res = await createVisitTask(vid, payload);
    setIsSubmitting(false);

    if (!res || res.success === false) {
      showToast(`❌ ${extractApiError(res, "Failed to save task.")}`);
      return;
    }

    const returnedTask = res.data?.task ?? res.data ?? null;
    const incomingDue = returnedTask?.due_date || returnedTask?.Due_date || null;
    if (incomingDue) {
      let formattedDate = incomingDue;
      const m = moment(incomingDue, [
        "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD", 
        "ddd, MMM D, YYYY h:mm A", "ddd, MMMM D, YYYY, h:mm A"
      ]);
      if (m.isValid()) formattedDate = m.format("ddd, MMMM D, YYYY, h:mm A");
      setSessionActionDate(patientId, formattedDate);
      setNextVisitDisplay(formattedDate);
    }

    const savedTaskSummary = {
      id: returnedTask?.id ?? Date.now(),
      title: returnedTask?.title ?? taskTitle.trim(),
      due: taskNextVisitDate
        ? formatDateShort(taskNextVisitDate)
        : returnedTask?.due_date
          ? formatDateShort(returnedTask.due_date)
          : returnedTask?.Due_date
            ? formatDateShort(returnedTask.Due_date)
            : null,
    };
    setSavedTasksInForm((prev) => [...prev, savedTaskSummary]);

    fetchVisitItems();

    if (res.data?.action === "save_and_create_another" || createAnother) {
      setTaskTitle("");
      setTaskDesc("");
      setTaskNotes("");
      if (hasNextVisit === false && taskNextVisitDate) {
        setIsNextVisitLocked(true);
      }
      setErrors({});
      showToast("✅ Task saved! Add another.");
    } else {
      showToast("✅ Task saved successfully!");
      closeForm();
    }
  };

  const removeMedication = async (medicationId) => {
    if (deletingIds.has(medicationId)) return;
    setDeletingIds((prev) => new Set(prev).add(medicationId));
    const res = await deletePatientMedication(medicationId);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(medicationId);
      return next;
    });
    if (res?.success) {
      setMeds((prev) => prev.filter((m) => m.id !== medicationId));
      fetchVisitItems();
    } else {
      showToast(`❌ ${res?.message || "Failed to delete medication."}`);
    }
  };

  const removeTask = async (taskId) => {
    if (deletingIds.has(taskId)) return;
    setDeletingIds((prev) => new Set(prev).add(taskId));
    const res = await deletePatientTask(taskId);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    if (res?.success) {
      setTaskItems((prev) => prev.filter((t) => t.id !== taskId));
      fetchVisitItems();
    } else {
      showToast(`❌ ${res?.message || "Failed to delete task."}`);
    }
  };

  const stepperBg1 = step === 1 ? "#2A66FF" : "#00C187";
  const stepperColor1 = "white";
  const stepperLabel1 = step === 1 ? "#2A66FF" : "#00C187";
  const stepper1Content = step === 1 ? "1" : "✓";

  const stepperBg2 = step === 2 ? "#2A66FF" : "#E6EAF2";
  const stepperColor2 = step === 2 ? "white" : "#8A94A6";
  const stepperLabel2 = step === 2 ? "#2A66FF" : "#8A94A6";
  const stepper2Content = step === 2 ? "✓" : "2";

  const lineBg = step === 2 ? "#00C187" : "#E6EAF2";

  const handleSaveNextVisit = async () => {
    if (!selectedNewDate) return;
    try {
      let finalDate = selectedNewDate;
      const now = new Date();
      if (finalDate.getTime() <= now.getTime()) {
        finalDate = new Date(finalDate);
        finalDate.setHours(now.getHours() + 1, 0, 0, 0);
      }

      // Format full datetime as YYYY-MM-DD HH:mm:ss — required by backend
      const pad = (n) => n.toString().padStart(2, "0");
      const backendDatetime =
        `${finalDate.getFullYear()}-${pad(finalDate.getMonth() + 1)}-${pad(finalDate.getDate())} ` +
        `${pad(finalDate.getHours())}:${pad(finalDate.getMinutes())}:00`;

      const uiDisplayDate = moment(finalDate).format("YYYY-MM-DD HH:mm:ss");
      onVisitDateChange(uiDisplayDate);

      const vid = latestLoadedVisitIdRef.current || visitIdRef.current;

      if (!vid) {
        setIsEditingVisit(false);
        setSelectedNewDate(null);
        return;
      }

      // PATCH /api/v1/visits/{visitId}
      const patchRes = await updatePatientVisitDateAPI(vid, { next_visit_date: backendDatetime });

      if (patchRes?.success) {
        const displayLabel = moment(finalDate).format("ddd, MMMM D, YYYY, h:mm A");
        setNextVisitDisplay(displayLabel);
        setSessionActionDate(patientId, displayLabel);
        if (onNextVisitSaved) onNextVisitSaved(displayLabel);
        setIsEditingVisit(false);
        setSelectedNewDate(null);
        fetchVisitItems();
      } else {
        setIsEditingVisit(false);
        setSelectedNewDate(null);
      }
    } catch {
      setIsEditingVisit(false);
      setSelectedNewDate(null);
    }
  };


  return (
    <div className="medications-tasks-tab">
      {view === "dashboard" && (
        <div id="tasks-dashboard">
          {fetchError && !isLoadingItems && (
            <div className="med-task-error-banner">⚠️ {fetchError}</div>
          )}

          <div className="med-task-header-actions">
            <div
              className={`med-task-next-visit-bar ${nextVisitDisplay ? "has-visit" : ""}`}
              onClick={() => {
                if (!isEditingVisit) {
                  setIsEditingVisit(true);
                  // Preload the current visit date from GET /api/v1/visits/{visitId}/edit
                  const vid = latestLoadedVisitIdRef.current;
                  if (vid) {
                    getVisitEditAPI(vid).then((editRes) => {
                      if (editRes?.success) {
                        const rawDate =
                          editRes.data?.next_visit_date ??
                          editRes.data?.date ??
                          null;
                        const parsed = rawDate ? parseValidDate(rawDate) : null;
                        if (parsed) setSelectedNewDate(parsed);
                        else if (visitDateValue) setSelectedNewDate(parseValidDate(visitDateValue));
                      } else if (visitDateValue) {
                        setSelectedNewDate(parseValidDate(visitDateValue));
                      }
                    }).catch(() => {
                      if (visitDateValue) setSelectedNewDate(parseValidDate(visitDateValue));
                    });
                  } else if (visitDateValue) {
                    setSelectedNewDate(parseValidDate(visitDateValue));
                  }
                }
              }}
              style={{
                cursor: isEditingVisit ? "default" : "pointer",
                display: "flex",
                justifyContent: "space-between",
                flex: 1,
                border: isEditingVisit ? "1.5px solid #2A66FF" : "",
                background: isEditingVisit ? "#F8FAFF" : "",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                {isEditingVisit ? (
                  <DatePicker
                    selected={selectedNewDate}
                    onChange={(date) => {
                      if (date) setSelectedNewDate(date);
                    }}
                    showTimeSelect
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    minDate={new Date()}
                    filterTime={filterPassedTime}
                    dateFormat={["dd/MM/yyyy h:mm aa", "dd-MM-yyyy h:mm aa", "dd.MM.yyyy h:mm aa", "dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy"]}
                    placeholderText="DD/MM/YYYY hh:mm aa"
                    wrapperClassName="datepicker-wrapper"
                    className="step1-datepicker-input"
                    portalId="root"
                    autoFocus
                  />
                ) : (
                  <span className="med-task-next-visit-text">
                    {nextVisitDisplay
                      ? `Next Visit: ${nextVisitDisplay}`
                      : "No next visit scheduled"}
                  </span>
                )}
                {isEditingVisit && (
                  <button
                    onMouseDown={(e) => {
                      // Use onMouseDown to fire before react-datepicker's outside-click handler
                      // which would otherwise unmount this button before onClick fires.
                      e.preventDefault();
                      e.stopPropagation();
                      if (selectedNewDate) handleSaveNextVisit();
                    }}
                    disabled={!selectedNewDate}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 14px",
                      background: selectedNewDate ? "#2A66FF" : "#E6EAF2",
                      color: selectedNewDate ? "white" : "#8A94A6",
                      border: "none",
                      borderRadius: "6px",
                      cursor: selectedNewDate ? "pointer" : "not-allowed",
                      fontSize: "13px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                    title="Save Next Visit"
                  >
                    Save
                  </button>
                )}
              </div>
              
              {!isEditingVisit && (
                <button
                  className="pp-note-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingVisit(true);
                  }}
                  aria-label="Edit Next Visit"
                  title="Edit Next Visit"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>

            <button onClick={openForm} className="med-task-add-btn">
              + Add Tasks or Medications
            </button>
          </div>

          <div
            className={`med-task-grid ${isLoadingItems && (meds.length > 0 || taskItems.length > 0) ? "loading-overlay" : ""}`}
          >
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
                <div className="med-task-column-title">Medications</div>
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
                      <div className="med-task-item-name">{m.name}</div>
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
                <div className="med-task-column-title">Tasks</div>
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
                          <div className="med-task-item-text">
                            <div className="med-task-item-title">{t.title}</div>
                            {t.desc && (
                              <div className="med-task-item-desc">{t.desc}</div>
                            )}
                          </div>
                          {t.due ? (
                            <div className="med-task-item-due">
                              <span
                                className={`med-task-due-pill ${isUrgent ? "urgent" : ""}`}
                              >
                                Due {t.due}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="med-task-item-actions">
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
          <div className="card med-task-form-card">
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
                  className={`med-task-stepper-circle ${step === 1 ? "active" : "completed"}`}
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
                  className={`med-task-stepper-label ${step === 1 ? "active" : "completed"}`}
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
                  className={`med-task-stepper-circle ${step === 2 ? "active" : "inactive"}`}
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
                  className={`med-task-stepper-label ${step === 2 ? "active" : "inactive"}`}
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
                  className="med-task-step-heading"
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
                  className="med-task-step-desc"
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
                  <div className="med-task-choice-container">
                    <button
                      className="med-task-choice-btn"
                      onClick={() => {
                        setShowDatePicker(true);
                        setHasNextVisit(true);
                        // Apply prefill now that user confirmed they want a next visit
                        const prefill = nextVisitDisplay || initialNextVisitDate || null;
                        if (prefill && !visitDateValue) {
                          setVisitDateValue(prefill);
                          setVisitSaved(true);
                          const formatted = formatDate(prefill);
                          setNextVisitDisplay(formatted);
                        }
                      }}
                    >
                      Yes
                    </button>
                    <button
                      className="med-task-choice-btn"
                      onClick={() => {
                        setHasNextVisit(false);
                        // Clear next visit display since user chose No
                        window.dispatchEvent(
                          new CustomEvent("patientNextVisitUpdated", {
                            detail: {
                              patientId,
                              next_visit_date: null,
                            },
                          }),
                        );
                        goToStep(2);
                      }}
                    >
                      No
                    </button>
                  </div>
                )}

                {showDatePicker && (
                  <div style={{ marginTop: "28px" }}>
                    <div
                      className={`med-task-date-picker-wrapper ${visitSaved ? "saved" : ""}`}
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
                        className="med-task-calendar-icon-box"
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
                          className="med-task-input-label"
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
                                  let finalDate = date;
                                  const now = new Date();
                                  if (finalDate.getTime() <= now.getTime()) {
                                    finalDate = new Date(finalDate);
                                    finalDate.setHours(now.getHours() + 1, 0, 0, 0);
                                  }
                                  const formattedDate = moment(finalDate).format(
                                    "YYYY-MM-DD HH:mm:ss",
                                  );
                                  onVisitDateChange(formattedDate);
                                } else {
                                  onVisitDateChange("");
                                }
                              }}
                              showTimeSelect
                              showMonthDropdown
                              showYearDropdown
                              dropdownMode="select"
                              minDate={new Date()}
                              filterTime={filterPassedTime}
                              dateFormat={["dd/MM/yyyy h:mm aa", "dd-MM-yyyy h:mm aa", "dd.MM.yyyy h:mm aa", "dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy"]}
                              placeholderText="DD/MM/YYYY hh:mm aa"
                              wrapperClassName="datepicker-wrapper"
                              className="step1-datepicker-input"
                              portalId="root"
                            />
                          </div>
                          {visitSaved && (
                            <div className="med-task-check-icon">✓</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {visitSaved && (
                      <div className="med-task-saved-date-mini-card">
                        <div className="med-task-saved-date-pill">
                          <span
                            className="icon-container"
                            style={{ color: "#3B66F5", display: "inline-flex" }}
                          >
                            <svg
                              width="17"
                              height="17"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M17 2V4H7V2H5V4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H20C21.1046 22 22 21.1046 22 20V6C22 4.89543 21.1046 4 20 4H19V2H17ZM20 20H4V9H20V20ZM16 13H12V17H16V13Z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          <span className="med-task-saved-date-text">
                            {nextVisitDisplay}
                          </span>
                        </div>
                      </div>
                    )}

                    {submitError && (
                      <div className="med-task-error-banner small">
                        {submitError}
                      </div>
                    )}

                    <div className="med-task-form-actions">
                      <button
                        disabled={isSubmitting}
                        className="med-task-btn-back"
                        onClick={async () => {
                          if (!visitDateValue) {
                            showToast("Please pick a date first");
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
                            const savedDate =
                              res.data?.next_visit_date || res.data?.visit?.next_visit_date || visitDateValue;
                            let formattedDate = savedDate;
                            const m = moment(savedDate, [
                                "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD", 
                                "ddd, MMM D, YYYY h:mm A", "ddd, MMMM D, YYYY, h:mm A"
                            ]);
                            if (m.isValid()) formattedDate = m.format("ddd, MMMM D, YYYY, h:mm A");

                            setSessionActionDate(patientId, formattedDate);
                            setNextVisitDisplay(formattedDate);
                            
                            if (onNextVisitSaved) onNextVisitSaved(formattedDate);
                            window.dispatchEvent(
                              new CustomEvent("patientNextVisitUpdated", {
                                detail: {
                                  patientId,
                                  next_visit_date: formattedDate,
                                },
                              }),
                            );
                            showToast("✅ Visit saved successfully!");
                            closeForm();
                          } else {
                            setSubmitError(
                              extractApiError(res, "Failed to save visit. Please try again."),
                            );
                          }
                        }}
                      >
                        {isSubmitting ? "Saving…" : "+ Save & Back"}
                      </button>
                      <button
                        className="med-task-btn-next"
                        onClick={() => {
                          if (!visitDateValue) {
                            showToast("⚠️ Please pick a date first");
                            return;
                          }
                          if (onNextVisitSaved) onNextVisitSaved(visitDateValue);
                          window.dispatchEvent(
                            new CustomEvent("patientNextVisitUpdated", {
                              detail: {
                                patientId,
                                next_visit_date: visitDateValue,
                              },
                            }),
                          );
                          goToStep(2);
                        }}
                      >
                        Next →
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
                          Added this session
                        </div>
                        <div className="med-task-added-list-stack">
                          {savedMedsInForm.map((m) => (
                            <div key={m.id} className="med-task-added-item-mini">
                              <div className="med-task-added-item-icon medication">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.5 20.5L3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z" />
                                  <line x1="8.5" y1="11.5" x2="15.5" y2="11.5" />
                                </svg>
                              </div>
                              <div className="med-task-added-item-body">
                                <span className="med-task-added-item-name">{m.name}</span>
                                <span className="med-task-added-item-meta">{m.dosage} &middot; {m.frequency}</span>
                              </div>
                              <div className="med-task-added-item-check">
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="1.5 6 4.5 9 10.5 3" />
                                </svg>
                              </div>
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
                          <div
                            className={`med-task-inline-date-wrapper ${isNextVisitLocked ? "locked" : ""}`}
                            style={isNextVisitLocked ? { opacity: 0.6, pointerEvents: "none", cursor: "not-allowed" } : {}}
                          >
                            <svg className="med-task-inline-cal-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <DatePicker
                              selected={parseValidDate(taskNextVisitDate)}
                              disabled={isNextVisitLocked}
                              onChange={(date) => {
                                if (date) {
                                  let finalDate = date;
                                  const now = new Date();
                                  if (finalDate.getTime() <= now.getTime()) {
                                    finalDate = new Date(finalDate);
                                    finalDate.setHours(now.getHours() + 1, 0, 0, 0);
                                  }
                                  const formattedDate = moment(finalDate).format(
                                    "YYYY-MM-DD HH:mm:ss",
                                  );
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
                              showMonthDropdown
                              showYearDropdown
                              dropdownMode="select"
                              minDate={new Date()}
                              filterTime={filterPassedTime}
                              dateFormat={["dd/MM/yyyy h:mm aa", "dd-MM-yyyy h:mm aa", "dd.MM.yyyy h:mm aa", "dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy"]}
                              placeholderText="DD/MM/YYYY hh:mm aa"
                              wrapperClassName="datepicker-wrapper"
                              className={`form-input med-task-inline-date-input${errors.taskNextVisitDate ? " input-error" : ""}`}
                              portalId="root"
                            />
                          </div>
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
                      <div className="med-task-added-list-container">
                        <div className="med-task-added-list-header">
                          Added this session
                        </div>
                        <div className="med-task-added-list-stack">
                          {savedTasksInForm.map((t) => (
                            <div key={t.id} className="med-task-added-item-mini">
                              <div className="med-task-added-item-icon task">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                  <rect x="9" y="3" width="6" height="4" rx="1" />
                                  <line x1="9" y1="12" x2="15" y2="12" />
                                  <line x1="9" y1="16" x2="13" y2="16" />
                                </svg>
                              </div>
                              <div className="med-task-added-item-body">
                                <span className="med-task-added-item-name">{t.title}</span>
                                {t.due && <span className="med-task-added-item-meta">Due {t.due}</span>}
                              </div>
                              <div className="med-task-added-item-check">
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="1.5 6 4.5 9 10.5 3" />
                                </svg>
                              </div>
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
