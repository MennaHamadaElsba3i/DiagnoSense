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

export const getGoogleRedirectAPI = async () => {
  return await apiCall('/api/google/redirect', {
    method: 'GET',
  });
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

    // 1. لو الرد 204 (نجاح بس مفيش داتا)
    if (response.status === 204) {
      return {
        success: true,
        data: null, // أو array فاضية [] حسب ديزاينك
        message: 'No data available'
      };
    }

    // 2. التأكد إن الرد فعلاً JSON قبل ما نحاول نقرأه
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // لو الرد مش JSON (غالباً HTML error page)
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

export const getPatientsAPI = async (page = 1, perPage = 9) => {
  const urlUsed = `/api/patients?page=${page}&per_page=${perPage}`;
  console.log("API URL", urlUsed);
  return await apiCall(urlUsed, {
    method: 'GET',
  });
};
