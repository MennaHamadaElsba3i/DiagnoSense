// const API_BASE_URL = 'https://nontelepathically-pamphletary-cyndi.ngrok-free.dev';
// const API_BASE_URL = 'https://toothlike-intermetatarsal-avah.ngrok-free.dev';
// const API_BASE_URL = 'https://unpersecuted-vanitied-jayson.ngrok-free.dev';
// const API_BASE_URL = 'https://unallegedly-wrinkly-claribel.ngrok-free.dev';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

import { getCookie, setCookie, deleteCookie, setJsonCookie } from './cookieUtils';

const inflightRequests = new Map();

const apiCall = async (endpoint, options = {}) => {
  const isGet = !options.method || options.method === 'GET';
  const key = isGet ? endpoint : null;

  if (key && inflightRequests.has(key)) {
    console.log("[mockAPI] Deduplicating in-flight GET request:", key);
    return inflightRequests.get(key);
  }

  const { skipAuthClear, ...fetchOptions } = options;

  const executeCall = async () => {
    try {
      const token =
        getCookie("user_token") ||
        localStorage.getItem("user_token");

      const isFormData = fetchOptions.body instanceof FormData;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          'Accept': 'application/json',
          ...(API_BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' }),
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...fetchOptions.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && !skipAuthClear) {
          deleteCookie('user_token');
          deleteCookie('user');
          deleteCookie('isAuthenticated');
          window.location.href = '/login';
        }

        return {
          success: false,
          status: response.status,
          message: data.message || 'Something went wrong',
          errors: data.errors || null,
          data: data.data || null,
        };
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        message: 'Something went wrong. Please check your network connection..',
      };
    }
  };

  const promise = executeCall();
  if (key) {
    inflightRequests.set(key, promise);
    promise.finally(() => {
      inflightRequests.delete(key);
    });
  }

  return promise;
};


export const registerAPI = async (userData) => {
  const payload = {
    name: userData.name,
    contact: userData.contact,
    password: userData.password,
    password_confirmation: userData.password_confirmation,
    specialization: userData.specialization,
  };

  const result = await apiCall('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const token = result?.token || result?.data?.token;
  const user = result?.data?.user || result?.user || result?.data;

  if (result.success && token) {
    setCookie('user_token', token, 7);
    if (user) setJsonCookie('user', user, 7);
    setCookie('isAuthenticated', 'true', 7);
  }

  return result;
};

export const loginAPI = async (contact, password, type = "doctor") => {
  const result = await apiCall(`/api/v1/auth/login/${type}`, {
    method: 'POST',
    body: JSON.stringify({ contact, password }),
    skipAuthClear: true,
  });

  const token = result?.token || result?.data?.token;
  const user = result?.data?.user || result?.user || result?.data;

  if (result.success && token) {
    setCookie('user_token', token, 7);
    if (user) setJsonCookie('user', user, 7);
    setCookie('isAuthenticated', 'true', 7);

    window.dispatchEvent(new CustomEvent("authChanged"));
  }

  return result;
};

export const logoutAPI = async (type = "doctor") => {
  const token = getCookie('user_token');

  if (!token) {
    deleteCookie('user_token');
    deleteCookie('user');
    deleteCookie('isAuthenticated');
    return {
      success: true,
      message: 'Logged out successfully (no token found)',
    };
  }

  const result = await apiCall(`/api/v1/auth/logout/${type}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ token }),
  });

  if (result.success) {
    deleteCookie('user_token');
    deleteCookie('user');
    deleteCookie('isAuthenticated');
  }

  return result;
};


export const forgetPasswordAPI = async (contact) => {
  return await apiCall('/api/v1/auth/forget-password/doctor', {
    method: 'POST',
    body: JSON.stringify({ contact }),
  });
};

export const verifyOTPForResetAPI = async (contact, otp) => {
  return await apiCall('/api/v1/auth/verify-otp/doctor', {
    method: 'POST',
    body: JSON.stringify({ contact, otp }),
  });
};

export const resetPasswordAPI = async (reset_token, password, password_confirmation) => {
  try {
    const params = new URLSearchParams();
    params.append('password', password);
    params.append('password_confirmation', password_confirmation);

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password/doctor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        ...(API_BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' }),
        'Authorization': `Bearer ${reset_token}`,
      },
      body: params.toString(),
    });

    const data = await response.json();
    console.log('[resetPasswordAPI] status:', response.status);
    console.log('[resetPasswordAPI] response data:', data);

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.data || data.errors || null,
      };
    }

    return data;

  } catch (error) {
    console.error('[resetPasswordAPI] network error:', error);
    return {
      success: false,
      message: 'Something went wrong. Please check your network connection..',
    };
  }
};

const FRONTEND_CALLBACK_URL = `${window.location.origin}/auth/google/callback`;

export const getGoogleRedirectAPI = async () => {
  return await apiCall(
    `/api/v1/auth/google/redirect`,
    { method: 'GET' }
  );
};

export const googleCallbackAPI = async (code) => {
  const result = await apiCall(
    `/api/google/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(FRONTEND_CALLBACK_URL)}`,
    { method: 'GET' }
  );

  const token = result?.token || result?.data?.token;
  const user = result?.data?.user || result?.data;

  if (token) {
    setCookie('user_token', token, 7);
    setCookie('isAuthenticated', 'true', 7);
    if (user) {
      setJsonCookie('user', user, 7);
    }
    // window.dispatchEvent(new CustomEvent("authChanged"));

    window.dispatchEvent(new CustomEvent("authChanged"));
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

    window.dispatchEvent(new CustomEvent("authChanged"));
  }

  return result;
};

export const verifyOTPAPI = async (identity, otp) => {


  return await apiCall('/api/v1/auth/verify-contact', {
    method: 'POST',
    body: JSON.stringify({ otp }),
    skipAuthClear: true,

  });
};

export const resendOTPAPI = async () => {

  return await apiCall('/api/v1/auth/resend-otp', {
    method: 'GET',
    skipAuthClear: true,

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
        window.location.href = '/login';
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
      message: 'Something went wrong. Please check your network connection..',
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
        ...(API_BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' })
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
      console.error("Non-JSON response received:", text);
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
        window.location.href = '/login';
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
      message: 'Something went wrong. Please check your network connection..',
    };
  }
};

export const getPatientsAPI = async ({ status, search, page } = {}) => {
  const params = new URLSearchParams();

  if (status && status !== 'all') {
    params.append('status', status);
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  if (page && page > 1) {
    params.append('page', page);
  }


  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/v1/patients?${queryString}`
    : `/api/v1/patients`;

  console.log("[getPatientsAPI] requesting:", endpoint);
  return await apiCall(endpoint, { method: 'GET' });
};

export const extractPatientsPayload = (response) => {
  const patients =
    response?.data?.data ||
    response?.data?.patients ||
    response?.patients ||
    (Array.isArray(response?.data) ? response.data : null) ||
    (Array.isArray(response) ? response : null) ||
    [];

  const meta =
    response?.data?.meta ||
    response?.meta ||
    null;

  const links =
    response?.data?.links ||
    response?.links ||
    null;

  return {
    patients: Array.isArray(patients) ? patients : [],
    meta,
    links
  };
};

export const addPatientAPI = async (formData) => {
  const token = getCookie('user_token');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(API_BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' }),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
        window.location.href = '/login';
      }
      return {
        success: false,
        message: data.message || 'Something went wrong',
        errors: data.errors || data.data || null,
        status: response.status,
      };
    }

    const patientId = data?.data?.patient_id ?? data?.data?.id ?? data?.patient_id ?? null;
    if (patientId) {
      localStorage.setItem('current_patient_id', patientId);
    }

    console.log("raw API data:", data);
    console.log("extracted patientId:", patientId);

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
      message: 'Something went wrong. Please check your network connection..',
    };
  }
};

export const getPatientKeyInfoAPI = async (patientId) => {
  return await apiCall(`/api/v1/patients/${patientId}/key-points`, { method: 'GET' });
};
export const getPatientOverviewAPI = async (patientId) => {
  return await apiCall(`/api/v1/patients/${patientId}/overview`, { method: 'GET' });
};

export const addPatientKeyInfoNoteAPI = async (patientId, { insight, priority }) => {
  return await apiCall(`/api/v1/patients/${patientId}/key-points`, {
    method: 'POST',
    body: JSON.stringify({ insight, priority }),
  });
};

export const patchKeyPointAPI = async (keyPointId, { insight }) => {
  return await apiCall(`/api/v1/key-points/${keyPointId}`, {
    method: 'PATCH',
    body: JSON.stringify({ insight }),
  });
};
export const deleteKeyPointAPI = async (keyPointId) => {
  const token = getCookie('user_token');
  console.log('[deleteKeyPoint] sending request — keyPointId:', keyPointId, '| token:', token);

  const result = await apiCall(`/api/v1/key-points/${keyPointId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('[deleteKeyPoint] full backend response:', result);
  return result;
};

/**
 
 * @param {number|string} patientId
 * @param {"stable"|"critical"|"under review"} status  — must match backend exactly
 */
export const updatePatientStatusAPI = async (patientId, status) => {
  return await apiCall(`/api/v1/patients/${patientId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};


export const getDecisionSupportAPI = async (patientId) => {
  return await apiCall(`/api/v1/patients/${patientId}/decision-support`, {
    method: 'GET',
  });
};

/**
 * POST /api/v1/patients/{patientId}/re-analyze
 * Triggers AI re-analysis for Decision Support on patients created under a
 * Basic plan that lacked Decision Support at analysis time.
 * Called only after a successful upgrade / pay-per-use for the 'decision' feature.
 *
 * @param {number|string} patientId
 */
export const reAnalyzePatientDecisionSupportAPI = async (patientId) => {
  return await apiCall(`/api/v1/patients/${patientId}/re-analyze`, {
    method: 'POST',
  });
};


export const getPatientActivitiesAPI = async (patientId, page = 1) => {
  return await apiCall(`/api/v1/patients/${patientId}/activities?page=${page}&limit=10`, {
    method: 'GET',
  });
};


export const getComparativeAnalysisAPI = async (patientId) => {
  return await apiCall(`/api/v1/patients/${patientId}/comparative-analysis`, {
    method: 'GET',
  });
};

/**
 * POST /api/v1/patients/{patientId}/visits
 * Creates a new patient visit session.
 * Content-Type: application/json
 *
 * @param {object} params
 * @param {number|string} params.patient_id
 * @param {boolean}       params.has_next_visit
 * @param {string}        [params.next_visit_date]  — required when has_next_visit is true
 * @param {"save"|"next"} params.action
 */
export const createVisitAPI = async ({ patient_id, has_next_visit, next_visit_date, action }) => {
  const body = {
    has_next_visit: !!has_next_visit,
    action,
  };
  if (has_next_visit && next_visit_date) {
    body.next_visit_date = next_visit_date;
  }

  return await apiCall(`/api/v1/patients/${patient_id}/visits`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * GET /api/v1/visits/{visitId}/edit
 * Returns the editable data for an existing visit (includes next_visit_date).
 *
 * @param {number|string} visitId
 */
export const getVisitEditAPI = async (visitId) => {
  return await apiCall(`/api/v1/visits/${visitId}/edit`, { method: 'GET' });
};

/**
 * PATCH /api/v1/visits/{visitId}
 * Updates the next visit date of an existing patient visit session.
 *
 * @param {number|string} visitId
 * @param {object} payload - e.g. { next_visit_date: "2026-06-04 17:30:00" }
 */
export const updatePatientVisitDateAPI = async (visitId, payload) => {
  return await apiCall(`/api/v1/visits/${visitId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

/**
 * POST /api/v1/visits/{visitId}/medications
 * Adds a medication entry to a specific visit.
 *
 * @param {number|string} visitId
 * @param {object} payload
 * @param {string} payload.name         — required
 * @param {string} payload.dosage       — required
 * @param {string} payload.frequency    — required
 * @param {string} [payload.duration]   — optional
 * @param {string} [payload.next_visit_date] — optional
 * @param {"save"|"save_and_create_another"} payload.action — required
 */
export const createVisitMedication = async (visitId, payload) => {
  return await apiCall(`/api/v1/visits/${visitId}/medications`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * POST /api/v1/visits/{visitId}/tasks
 * Adds a care task entry to a specific visit.
 *
 * @param {number|string} visitId
 * @param {object} payload
 * @param {string} payload.title        — required
 * @param {string} [payload.description] — optional
 * @param {string} [payload.notes]      — optional
 * @param {string} [payload.next_visit_date] — optional
 * @param {"save"|"save_and_create_another"} payload.action — required
 */
export const createVisitTask = async (visitId, payload) => {
  return await apiCall(`/api/v1/visits/${visitId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * GET /api/v1/patients/{patientId}/visits
 * Returns visit history with tasks, medications, and latest next visit date.
 */
export const getPatientVisitItems = async (patientId) => {
  return await apiCall(`/api/v1/patients/${patientId}/visits`, { method: 'GET' });
};

/**
 * DELETE /api/v1/medications/{medicationId}
 * Deletes a single medication entry.
 */
export const deletePatientMedication = async (medicationId) => {
  return await apiCall(`/api/v1/medications/${medicationId}`, {
    method: 'DELETE',
  });
};

/**
 * DELETE /api/v1/tasks/{taskId}
 * Deletes a single care task entry.
 */
export const deletePatientTask = async (taskId) => {
  return await apiCall(`/api/v1/tasks/${taskId}`, {
    method: 'DELETE',
  });
};


export const getPatientNextVisitAPI = async (patientId) => {
  const token = getCookie('user_token');

  try {
    const response = await fetch(`${API_BASE_URL}/api/visits?patient_id=${patientId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(API_BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });


    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
        window.location.href = '/login';
      }
      console.warn('[getPatientNextVisit] endpoint returned', response.status, '— no GET visits support');
      return null;
    }

    const data = await response.json();
    console.log('[getPatientNextVisit] raw response', data);


    if (data?.success && Array.isArray(data?.data)) {

      const visits = data.data;
      const withDate = visits.filter((v) => v.next_visit_date);
      if (!withDate.length) return null;

      withDate.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      return withDate[0];
    }


    if (data?.success && data?.data?.next_visit_date) {
      return data.data;
    }


    if (data?.next_visit_date) {
      return data;
    }

    return null;
  } catch (error) {
    console.warn('[getPatientNextVisit] fetch error', error);
    return null;
  }
};

export const deletePatientAPI = async (patientId) => {
  return await apiCall(`/api/v1/patients/${patientId}`, {
    method: 'DELETE',
  });
};



export const getPatientForEditAPI = async (patientId) => {
  const token = getCookie('user_token');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}/edit`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(API_BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' }),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
        window.location.href = '/login';
      }
      return {
        success: false,
        status: response.status,
        message: data.message || 'Something went wrong',
        errors: data.errors || null,
      };
    }

    return { success: true, data: data.data ?? data };
  } catch (error) {
    console.error('[getPatientForEdit] API Error:', error);
    return { success: false, message: 'Something went wrong. Please check your network connection..' };
  }
};

/**

* Updates patient data. Sent as multipart/form-data so files can be included.
 * @param {number|string} patientId
 * @param {FormData} formData  — built by EditPatient before submitting
 */
export const updatePatientAPI = async (patientId, formData) => {
  const token = getCookie('user_token');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(API_BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' }),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        deleteCookie('user_token');
        deleteCookie('user');
        deleteCookie('isAuthenticated');
        window.location.href = '/login';
      }
      return {
        success: false,
        status: response.status,
        message: data.message || 'Something went wrong',
        errors: data.errors || data.data || null,
        data: data.data || null,
      };
    }

    return { success: true, message: data.message, data };
  } catch (error) {
    console.error('[updatePatient] API Error:', error);
    return { success: false, message: 'Something went wrong. Please check your network connection..' };
  }
};

/**
 * POST /wallet/charge
 * Charges the doctor's wallet with the specified balance.
 * @param {number} balance - The balance to charge
 */
export const chargeWalletAPI = async (balance) => {
  const success_url = `${window.location.origin}/close-popup.html`;
  const cancel_url = `${window.location.origin}/close-popup.html`;

  return await apiCall('/api/v1/wallets/charge', {
    method: 'POST',
    body: JSON.stringify({ balance, success_url, cancel_url }),
  });
};


/**
 * GET /api/transactions
 * Fetches the wallet transaction history.
 */
export const getTransactionsAPI = async (page = 1) => {
  return await apiCall(`/api/v1/wallets/transactions?page=${page}`, {
    method: 'GET',
  });
};

/**
 * GET /api/subscription/plans
 * Returns available subscription plans.
 */
export const getSubscriptionPlansAPI = async () => {
  return await apiCall('/api/v1/subscriptions/plans', {
    method: 'GET',
  });
};

/**
 * POST /api/subscription/subscribe
 * Subscribes user to a specific plan.
 */
export const subscribeToPlanAPI = async (planId) => {
  const result = await apiCall(`/api/v1/subscriptions/${planId}/subscribe`, {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
  if (!result.success && result.status === 403) {
    const error = new Error(result.message);
    error.response = { status: 403, data: { message: result.message } };
    throw error;
  }
  return result;
};

export const cancelSubscriptionAPI = async () => {
  return await apiCall('/api/v1/subscriptions/cancel', {
    method: 'POST',
  });
};

export const subscribeToPayPerUseAPI = async () => {
  const result = await apiCall('/api/v1/subscriptions/pay-per-use', {
    method: 'POST',
  });
  if (!result.success && result.status === 403) {
    const error = new Error(result.message);
    error.response = { status: 403, data: { message: result.message } };
    throw error;
  }
  return result;
};

/**
 * GET /api/subscription/current
 * Returns current billing mode, wallet balance, usage, and plan details.
 */
export const getCurrentSubscriptionAPI = async () => {
  return await apiCall('/api/v1/subscriptions/current', {
    method: 'GET',
  });
};



/**
 * GET /api/v1/notifications
 * Fetches paginated notifications (cursor-based).
 * @param {string|null} cursor — the next-page cursor returned by the API
 */
export const getNotificationsAPI = async (cursor) => {
  const url = cursor
    ? `/api/v1/notifications?cursor=${encodeURIComponent(cursor)}`
    : '/api/v1/notifications';
  return await apiCall(url, { method: 'GET' });
};

/**
 * GET /api/v1/notifications/unread-count
 * Returns the number of unread notifications.
 */
export const getUnreadNotificationsCountAPI = async () => {
  return await apiCall('/api/v1/notifications/unread-count', { method: 'GET' });
};

/**
 * PATCH /api/v1/notifications/{notification}/read
 * Marks a single notification as read.
 */
export const markNotificationAsReadAPI = async (id) => {
  return await apiCall(`/api/v1/notifications/${id}/read`, {
    method: 'PATCH',
  });
};

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all notifications as read.
 */
export const markAllNotificationsAsReadAPI = async () => {
  return await apiCall('/api/v1/notifications/read-all', { method: 'PATCH' });
};

/**
 * DELETE /api/v1/notifications/clear-all
 * Clears all notifications.
 */
export const clearAllNotificationsAPI = async () => {
  return await apiCall('/api/v1/notifications/clear-all', { method: 'DELETE' });
};



export const getDashboardWidgets = async () => {
  return await apiCall('/api/v1/dashboard/summary', {
    method: 'GET',
  });
};

export const getDashboardStatusDistribution = async () => {
  return await apiCall('/api/v1/dashboard/status-distribution', {
    method: 'GET',
  });
}

export const getTopfiveDiseases = async () => {
  return await apiCall('/api/v1/dashboard/top-diseases', {
    method: 'GET',
  });
}

export const getTodayVisitsAPI = async () => {
  return await apiCall('/api/v1/dashboard/today-visits', {
    method: 'GET',
  });
};


export const markVisitAttendedAPI = async (visitId) => {
  return await apiCall(`/api/v1/visits/${visitId}/attend`, {
    method: 'PATCH',
  });
};
/**
 * POST /api/chatbot/{patientId}
 * Sends a doctor's question to the AI chatbot.
 * Returns either a direct answer or "Preparing patient data..." (async path).
 * @param {number|string} patientId
 * @param {string} question - The doctor's typed question
 */
export const sendChatbotMessageAPI = async (patientId, question) =>
  apiCall(`/api/v1/patients/${patientId}/chatbot/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });



export const sendSupportAPI = async ({ category, urgency, message, name, attachment }) => {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('urgency', urgency);
  formData.append('message', message);

  if (name && name.trim()) {
    formData.append('name', name.trim());
  }

  if (attachment) {
    formData.append('attachment', attachment);
  }

  return await apiCall('/api/v1/support', {
    method: 'POST',
    body: formData,
  });
};


export const getDoctorProfileAPI = async () => {
  return await apiCall(`/api/v1/doctors/profile/edit`, {
    method: 'GET',
  });
};


export const updateDoctorProfileAPI = async (doctorId, { name, specialization }) => {
  return await apiCall(`/api/v1/doctors/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ name, specialization }),
  });
};

export const changePasswordAPI = async (current_password, new_password, new_password_confirmation) => {
  const params = new URLSearchParams();
  params.append('current_password', current_password);
  params.append('new_password', new_password);
  params.append('new_password_confirmation', new_password_confirmation);

  return await apiCall('/api/v1/doctors/change-password', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
};


export const deleteDoctorAccountAPI = async (password, password_confirmation) => {
  return await apiCall(`/api/v1/doctors/profile`, {
    method: 'DELETE',
    body: JSON.stringify({ password, password_confirmation }),
  });
};