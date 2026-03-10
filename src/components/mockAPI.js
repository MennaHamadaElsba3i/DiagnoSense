const API_BASE_URL = 'https://nontelepathically-pamphletary-cyndi.ngrok-free.dev';
// const API_BASE_URL = 'https://toothlike-intermetatarsal-avah.ngrok-free.dev';

import { getCookie, setCookie, deleteCookie, setJsonCookie } from './cookieUtils';

const apiCall = async (endpoint, options = {}) => {
  try {
    const token = getCookie('user_token');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',

        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {

      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
      }

      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.errors || null,
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};

// export const registerAPI = async (userData) => {
//   const result = await apiCall('/api/register/doctor', {
//     method: 'POST',
//     body: JSON.stringify({
//       name: userData.name,
//       email: userData.email,
//       phone: userData.phone,
//       password: userData.password,
//       password_confirmation: userData.password_confirmation,
//     }),
//   });

//   if (result.success && result.data && result.data.token) {
//     setCookie('user_token', result.data.token, 7);
//     setJsonCookie('user', result.data.user, 7);
//     setCookie('isAuthenticated', 'true', 7);
//   }

//   return result;
// };
export const registerAPI = async (userData) => {
  const payload = {
    name: userData.name,
    password: userData.password,
    password_confirmation: userData.password_confirmation,
  };

  if (userData.email && userData.email.trim() !== "") {
    payload.email = userData.email;
  }

  if (userData.phone && userData.phone.trim() !== "") {
    payload.phone = userData.phone;
  }

  const result = await apiCall('/api/register/doctor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.success && result.data && result.data.token) {
    setCookie('user_token', result.data.token, 7);
    setJsonCookie('user', result.data.user, 7);
    setCookie('isAuthenticated', 'true', 7);
  }

  return result;
};

export const loginAPI = async (identity, password) => {
  const result = await apiCall('/api/login/doctor', {
    method: 'POST',
    body: JSON.stringify({ identity, password }),
  });

  if (result.success && result.data && result.data.token) {
    setCookie('user_token', result.data.token, 7);
    setJsonCookie('user', result.data.user, 7);
    setCookie('isAuthenticated', 'true', 7);
  }

  return result;
};

export const logoutAPI = async () => {
  const token = getCookie('user_token');

  if (!token) {
    return {
      success: false,
      message: 'No token found',
    };
  }

  const result = await apiCall('/api/logout/doctor', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (result.success) {
    deleteCookie('user_token');
    deleteCookie('user');
    deleteCookie('isAuthenticated');
  }

  return result;
};


export const forgetPasswordAPI = async (identity) => {
  return await apiCall('/api/forget-password/doctor', {
    method: 'POST',
    body: JSON.stringify({ identity }),
  });
};

export const verifyOTPForResetAPI = async (identity, otp) => {
  return await apiCall('/api/verify-otp/doctor', {
    method: 'POST',
    body: JSON.stringify({ identity, otp }),
  });
};

export const resetPasswordAPI = async (reset_token, password, password_confirmation) => {
  return await apiCall('/api/reset-password/doctor', {
    method: 'POST',
    body: JSON.stringify({
      reset_token,
      password,
      password_confirmation,
    }),
  });
};

const FRONTEND_CALLBACK_URL = 'http://localhost:5173/auth/google/callback';

export const getGoogleRedirectAPI = async () => {
  return await apiCall(
    `/api/google/redirect?redirect_uri=${encodeURIComponent(FRONTEND_CALLBACK_URL)}`,
    { method: 'GET' }
  );
};

export const googleCallbackAPI = async (code) => {
  const result = await apiCall(
    `/api/google/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(FRONTEND_CALLBACK_URL)}`,
    { method: 'GET' }
  );

  // Backend returns: { success: true, data: { user: {...} }, token: "..." }
  const token = result?.token || result?.data?.token;
  const user = result?.data?.user || result?.data;

  if (token) {
    setCookie('user_token', token, 7);
    setCookie('isAuthenticated', 'true', 7);
    if (user) {
      setJsonCookie('user', user, 7);
    }
    // Also mirror to localStorage for axios-based callers
    localStorage.setItem('user_token', token);
  }

  return { success: !!token, token, user, raw: result };
};

export const googleLoginAPI = async (googleToken) => {
  const result = await apiCall('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token: googleToken }),
  });

  if (result.success && result.data && result.data.token) {
    setCookie('user_token', result.data.token, 7);
    setJsonCookie('user', result.data.user, 7);
    setCookie('isAuthenticated', 'true', 7);
  }

  return result;
};

export const verifyOTPAPI = async (identity, otp) => {
  return await apiCall('/api/verify-email/doctor', {
    method: 'POST',
    body: JSON.stringify({
      identity: identity,
      otp: otp
    }),
  });
};

export const resendOTPAPI = async () => {
  return await apiCall('/api/resend-otp/doctor', {
    method: 'GET',
  });
};

export const analyzeReportAPI = async (formData) => {
  const token = getCookie('user_token');

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
      }

      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.errors || null,
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};

export const getPatientAnalysisAPI = async (patientId) => {
  const token = getCookie('user_token');

  try {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/analysis`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
    });

    if (response.status === 204) {
      return {
        success: true,
        data: null,
        message: 'No data available'
      };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response received:", text); // هيطبعلك الـ HTML في الكونسول عشان تشوفه
      return {
        success: false,
        message: 'Server returned an unexpected format (HTML). Check console.',
      };
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
      }

      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.errors || null,
      };
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};

export const getPatientsByStatusAPI = async (status, page = 1) => {
  const encodedType = encodeURIComponent(status);
  const urlUsed = `/api/patients/status/${encodedType}?page=${page}`;
  console.log("[status-filter] finalUrl:", urlUsed);
  return await apiCall(urlUsed, {
    method: 'GET',
  });
};

export const getPatientsAPI = async (page = 1, perPage = 9) => {
  const urlUsed = `/api/patients?page=${page}&per_page=${perPage}`;
  console.log("API URL", urlUsed);
  return await apiCall(urlUsed, {
    method: 'GET',
  });
};

export const addPatientAPI = async (formData) => {
  const token = getCookie('user_token');
  try {
    const response = await fetch(`${API_BASE_URL}/api/patients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
      }
      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.errors || null,
      };
    }

    const patientId = data?.data?.id ?? data?.patient_id ?? null;
    if (patientId) {
      localStorage.setItem('current_patient_id', patientId);
    }

    console.log("raw API data:", data); // add this
    console.log("extracted patientId:", patientId); // add this

    return {
      success: true,
      patient_id: patientId,
      data: data,
    };

  } catch (error) {
    console.error('API Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};
// Change this if backend expects a different query key (e.g. "query", "search", "name")
const SEARCH_QUERY_KEY = "search";

export const searchPatientsAPI = async (page = 1, term = "") => {
  const trimmed = term.trim();
  const url = `/api/search?page=${page}&${SEARCH_QUERY_KEY}=${encodeURIComponent(trimmed)}`;
  console.log("[search] requesting", { page, term: trimmed, url });
  const res = await apiCall(url, { method: 'GET' });
  console.log("[search] response", { meta: res?.meta || res?.data?.meta, len: (res?.data?.length ?? res?.data?.data?.length ?? "?") });
  return res;
};

export const getPatientKeyInfoAPI = async (patientId, token) => {
  // If no token provided, use apiCall which auto-reads token from cookies
  if (!token) {
    return await apiCall(`/api/patients/${patientId}/key-info`, { method: 'GET' });
  }
  // Token explicitly provided (e.g. ProcessingReports polling)
  try {
    const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}/key-info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });
    console.log("key-info status:", response.status);
    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false };
    }
    return data;
  } catch {
    return { success: false };
  }
};
export const getPatientOverviewAPI = async (patientId) => {
  return await apiCall(`/api/patients/${patientId}/overview`, { method: 'GET' });
};

export const addPatientKeyInfoNoteAPI = async (patientId, { insight, priority }) => {
  return await apiCall(`/api/patients/${patientId}/key-info`, {
    method: 'POST',
    body: JSON.stringify({ insight, priority }),
  });
};

export const patchKeyPointAPI = async (keyPointId, { insight }) => {
  return await apiCall(`/api/key-points/${keyPointId}`, {
    method: 'PATCH',
    body: JSON.stringify({ insight }),
  });
};
export const deleteKeyPointAPI = async (keyPointId) => {
  const token = getCookie('user_token');
  console.log('[deleteKeyPoint] sending request — keyPointId:', keyPointId, '| token:', token);

  const result = await apiCall(`/api/key-points/${keyPointId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('[deleteKeyPoint] full backend response:', result);
  return result;
};

/**
 * PATCH /api/patients/{patientId}/status
 * @param {number|string} patientId
 * @param {"stable"|"critical"|"under review"} status  — must match backend exactly
 */
export const updatePatientStatusAPI = async (patientId, status) => {
  return await apiCall(`/api/patients/${patientId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

/**
 * GET /api/patients/{patientId}/decision-support
 * Returns decision support data for a given patient.
 * Token is injected automatically by apiCall (reads user_token cookie).
 * 401 handling (cookie cleanup) is also done inside apiCall.
 */
export const getDecisionSupportAPI = async (patientId) => {
  return await apiCall(`/api/patients/${patientId}/decision-support`, {
    method: 'GET',
  });
};

/**
 * GET /api/patients/{patientId}/activities
 * Returns activity history for a given patient.
 * Token is injected automatically by apiCall (reads user_token cookie).
 * 401 handling (cookie cleanup) is also done inside apiCall.
 */
export const getPatientActivitiesAPI = async (patientId) => {
  return await apiCall(`/api/patients/${patientId}/activities`, {
    method: 'GET',
  });
};

/**
 * POST /api/visits
 * Sent as application/x-www-form-urlencoded (not JSON) — backend requirement.
 * @param {object} params
 * @param {number|string} params.patient_id
 * @param {boolean}       params.has_next_visit
 * @param {string}        [params.next_visit_date]  - "YYYY-MM-DD", required when has_next_visit=true
 * @param {"save"|"next"} params.action
 */
export const createVisitAPI = async ({ patient_id, has_next_visit, next_visit_date, action }) => {
  const token = getCookie('user_token');

  const params = new URLSearchParams();
  params.append('patient_id', patient_id);
  params.append('has_next_visit', has_next_visit ? '1' : '0');
  if (next_visit_date) params.append('next_visit_date', next_visit_date);
  params.append('action', action);

  try {
    const response = await fetch(`${API_BASE_URL}/api/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
      }
      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.errors || null,
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};

/**
 * POST /api/visits/{visitId}/items
 * Creates a task or medication under a specific visit.
 * Content-Type: application/json
 *
 * @param {number|string} visitId  - ID returned from POST /api/visits (response.data.id)
 * @param {object} payload
 * @param {"save"|"save_and_create_another"} payload.action
 * @param {"task"|"medication"} payload.type
 *
 * If type="task":   payload.title (required), payload.description, payload.notes, payload.Due_date
 * If type="medication": payload.name, payload.dosage, payload.frequency (all required), payload.duration, payload.notes
 */
export const createVisitItem = async (visitId, payload) => {
  return await apiCall(`/api/visits/${visitId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * GET /api/patients/{patientId}/items
 * Returns all tasks, medications, and next_visit_date for a patient.
 * Token is injected automatically by apiCall (reads user_token cookie).
 * Response shape: { success: true, data: { tasks: [], medications: [], next_visit_date: string|null } }
 */
export const getPatientVisitItems = async (patientId) => {
  return await apiCall(`/api/patients/${patientId}/items`, { method: 'GET' });
};

/**
 * DELETE /api/patients/{patientId}/medications/{medicationId}
 * Deletes a single medication for a patient.
 * Success: { success: true, message: "Medication deleted successfully" }
 */
export const deletePatientMedication = async (patientId, medicationId) => {
  return await apiCall(`/api/patients/${patientId}/medications/${medicationId}`, {
    method: 'DELETE',
  });
};

/**
 * DELETE /api/patients/{patientId}/tasks/{taskId}
 * Deletes a single task for a patient.
 * Success: { success: true, message: "Task deleted successfully" }
 */
export const deletePatientTask = async (patientId, taskId) => {
  return await apiCall(`/api/patients/${patientId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
};

/**
 * GET /api/visits?patient_id={patientId}
 * Fetches the patient's most recent / upcoming visit that has a next_visit_date.
 * Returns { next_visit_date, id, status } or null if unavailable.
 *
 * Gracefully handles 404/405 (no dedicated GET endpoint) by returning null.
 */
export const getPatientNextVisitAPI = async (patientId) => {
  const token = getCookie('user_token');

  try {
    const response = await fetch(`${API_BASE_URL}/api/visits?patient_id=${patientId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    // Endpoint might not support GET — fail silently
    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
      }
      console.warn('[getPatientNextVisit] endpoint returned', response.status, '— no GET visits support');
      return null;
    }

    const data = await response.json();
    console.log('[getPatientNextVisit] raw response', data);

    // Shape 1: { success: true, data: [ { next_visit_date, id, status }, ... ] }
    if (data?.success && Array.isArray(data?.data)) {
      // Find the most recent visit that has a next_visit_date
      const visits = data.data;
      const withDate = visits.filter((v) => v.next_visit_date);
      if (!withDate.length) return null;
      // Sort descending by id (or created_at) and take the most recent
      withDate.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      return withDate[0];
    }

    // Shape 2: { success: true, data: { next_visit_date, ... } }
    if (data?.success && data?.data?.next_visit_date) {
      return data.data;
    }

    // Shape 3: flat object { next_visit_date, ... }
    if (data?.next_visit_date) {
      return data;
    }

    return null;
  } catch (error) {
    console.warn('[getPatientNextVisit] fetch error', error);
    return null;
  }
};
/**
 * DELETE /api/patients/{patientId}
 * Deletes a single patient.
 * Success: { success: true, message: "Patient deleted successfully" }
 */
export const deletePatientAPI = async (patientId) => {
  return await apiCall(`/api/patients/${patientId}`, {
    method: 'DELETE',
  });
};

/**
 * POST /wallet/charge
 * Charges the doctor's wallet with the specified balance.
 * @param {number} balance - The balance to charge
 */
export const chargeWalletAPI = async (balance) => {
  const success_url = `${window.location.origin}/subscription?tab=billing`;
  const cancel_url = `${window.location.origin}/subscription?tab=billing`;

  return await apiCall('/api/wallet/charge', {
    method: 'POST',
    body: JSON.stringify({ balance, success_url, cancel_url }),
  });
};