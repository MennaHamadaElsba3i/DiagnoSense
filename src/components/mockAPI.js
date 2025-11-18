

// const mockUsers = [
//   { email: 'doctor@example.com', password: '12345678' },
//   { email: 'test@diagnoo.com', password: 'password123' }
// ];

// // OTP مخزن مؤقت
// let storedOTP = {};

// // Delay عشان يبان Loading
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // 1️⃣ Login API
// export const loginAPI = async (email, password) => {
//   await delay(1500); // simulate network delay

//   const user = mockUsers.find(u => u.email === email && u.password === password);

//   if (user) {
//     return {
//       success: true,
//       message: 'Login successful',
//       data: { email: user.email, token: 'mock-token-12345' }
//     };
//   } else {
//     return {
//       success: false,
//       message: 'Invalid email or password'
//     };
//   }
// };

// // 2️⃣ Register API
// export const registerAPI = async (userData) => {
//   await delay(1500);

//   const existingUser = mockUsers.find(u => u.email === userData.email);

//   if (existingUser) {
//     return {
//       success: false,
//       message: 'Email already exists'
//     };
//   }

//   // "حفظ" المستخدم
//   mockUsers.push({
//     email: userData.email,
//     password: userData.password
//   });

//   return {
//     success: true,
//     message: 'Account created successfully',
//     data: { email: userData.email }
//   };
// };

// // 3️⃣ Forget Password API (إرسال OTP)
// export const forgetPasswordAPI = async (email) => {
//   await delay(1500);

//   const user = mockUsers.find(u => u.email === email);

//   if (!user) {
//     return {
//       success: false,
//       message: 'Email not found. Please check and try again.'
//     };
//   }

//   // توليد OTP عشوائي (6 أرقام)
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   storedOTP[email] = otp;

//   // اطبع الـ OTP في الـ Console عشان تجربي بيه
//   console.log(`OTP for ${email}: ${otp}`);

//   return {
//     success: true,
//     message: 'OTP sent successfully',
//     data: { email }
//   };
// };

// // 4️⃣ Verify OTP API
// export const verifyOTPAPI = async (email, otp) => {
//   await delay(1000);

//   if (!storedOTP[email]) {
//     return {
//       success: false,
//       message: 'OTP expired or not found'
//     };
//   }

//   if (storedOTP[email] === otp) {
//     return {
//       success: true,
//       message: 'OTP verified successfully',
//       data: { email, verified: true }
//     };
//   } else {
//     return {
//       success: false,
//       message: 'Invalid OTP. Please try again.'
//     };
//   }
// };

// // 5️⃣ Resend OTP API
// export const resendOTPAPI = async (email) => {
//   await delay(1000);

//   const user = mockUsers.find(u => u.email === email);

//   if (!user) {
//     return {
//       success: false,
//       message: 'Email not found'
//     };
//   }

//   // توليد OTP جديد
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   storedOTP[email] = otp;

//   console.log(`New OTP for ${email}: ${otp}`);

//   return {
//     success: true,
//     message: 'OTP resent successfully'
//   };
// };

// // 6️⃣ Reset Password API
// export const resetPasswordAPI = async (email, newPassword) => {
//   await delay(1500);

//   const userIndex = mockUsers.findIndex(u => u.email === email);

//   if (userIndex === -1) {
//     return {
//       success: false,
//       message: 'User not found'
//     };
//   }

//   // تحديث الباسورد
//   mockUsers[userIndex].password = newPassword;

//   // مسح الـ OTP
//   delete storedOTP[email];

//   return {
//     success: true,
//     message: 'Password reset successfully'
//   };
// };

// // 7️⃣ Google Login API (Mock)
// export const googleLoginAPI = async () => {
//   await delay(1000);

//   return {
//     success: true,
//     message: 'Google login successful',
//     data: { email: 'google.user@example.com', token: 'google-mock-token' }
//   };
// };


// // ده الـ API للـ logout
// // ده الـ API للـ logout
// export const logoutAPI = async () => {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       // جيبي الـ token من localStorage
//       const token = localStorage.getItem("user_token");

//       // لو مفيش token أو Token غلط
//       if (!token || token === "invalid_token") {
//         resolve({
//           success: false,
//           message: "Unauthenticated"
//         });
//         return;
//       }

//       // لو الـ token صح
//       resolve({
//         success: true,
//         message: "Logged out successfully"
//       });
//     }, 1000);
//   });
// };

// // // تحديث الـ loginAPI عشان يحفظ الـ token
// // export const loginAPI = async (email, password) => {
// //   return new Promise((resolve) => {
// //     setTimeout(() => {
// //       if (email === "doctor@example.com" && password === "password123") {
// //         const userData = {
// //           id: 1,
// //           name: "Dr. Layla",
// //           email: email,
// //           token: "sample_user_token_12345" // الـ token
// //         };
// //         resolve({
// //           success: true,
// //           data: userData,
// //           message: "Login successful"
// //         });
// //       } else {
// //         resolve({
// //           success: false,
// //           message: "Invalid email or password"
// //         });
// //       }
// //     }, 1500);
// //   });
// // };

// // export const googleLoginAPI = async () => {
// //   return new Promise((resolve) => {
// //     setTimeout(() => {
// //       const userData = {
// //         id: 2,
// //         name: "Dr. Ahmed",
// //         email: "doctor@gmail.com",
// //         token: "google_user_token_67890"
// //       };
// //       resolve({
// //         success: true,
// //         data: userData
// //       });
// //     }, 1000);
// //   });
// // };

// // export const registerAPI = async (userData) => {
// //   return new Promise((resolve) => {
// //     setTimeout(() => {
// //       if (userData.email && userData.password) {
// //         const newUser = {
// //           id: 3,
// //           name: userData.name,
// //           email: userData.email,
// //           token: "new_user_token_54321"
// //         };
// //         resolve({
// //           success: true,
// //           data: newUser,
// //           message: "Registration successful"
// //         });
// //       } else {
// //         resolve({
// //           success: false,
// //           message: "Missing required fields"
// //         });
// //       }
// //     }, 1500);
// //   });
// // };

// ⚙️ Base URL للـ API



//2222222222
// const API_BASE_URL = 'https://nontelepathically-pamphletary-cyndi.ngrok-free.dev';

// const apiCall = async (endpoint, options = {}) => {
//   try {
//     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//       headers: {
//         'Content-Type': 'application/json',
//         'Accept': 'application/json',
//         ...options.headers,
//       },
//       ...options,
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       return {
//         success: false,
//         message: data.message || 'Something went wrong',
//         errors: data.errors || null,
//       };
//     }

//     return data;
//   } catch (error) {
//     console.error('API Error:', error);
//     return {
//       success: false,
//       message: 'Network error. Please check your connection.',
//     };
//   }
// };

// export const registerAPI = async (userData) => {
//   return await apiCall('/api/register/doctor', {
//     method: 'POST',
//     body: JSON.stringify({
//       name: userData.name,
//       email: userData.email,
//       password: userData.password,
//       password_confirmation: userData.password_confirmation,
//     }),
//   });
// };

// export const loginAPI = async (email, password) => {
//   return await apiCall('/api/login/doctor', {
//     method: 'POST',
//     body: JSON.stringify({ email, password }),
//   });
// };

// export const logoutAPI = async () => {
//   const token = localStorage.getItem('user_token');

//   if (!token) {
//     return {
//       success: false,
//       message: 'No token found',
//     };
//   }

//   return await apiCall('/api/logout/doctor', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${token}`,
//     },
//   });
// };

// export const forgetPasswordAPI = async (email) => {
//   return await apiCall('/api/forget-password/doctor', {
//     method: 'POST',
//     body: JSON.stringify({ email }),
//   });
// };

// export const resetPasswordAPI = async (token, email, password, password_confirmation) => {
//   return await apiCall('/api/reset-password/doctor', {
//     method: 'POST',
//     body: JSON.stringify({
//       token,
//       email,
//       password,
//       password_confirmation,
//     }),
//   });
// };

// export const googleLoginAPI = async (googleToken) => {
//   return await apiCall('/auth/google', {
//     method: 'POST',
//     body: JSON.stringify({ token: googleToken }),
//   });
// };

// export const verifyOTPAPI = async (email, otp) => {
//   return await apiCall('/api/verify-email/doctor', {
//     method: 'POST',
//     body: JSON.stringify({ email, otp }),
//   });
// };

// export const resendOTPAPI = async (email) => {
//   return await apiCall('/api/resend-otp/doctor', {
//     method: 'GET',
//     body: JSON.stringify({ email }),
//   });
// };


//==33333333333333333

const API_BASE_URL = 'https://nontelepathically-pamphletary-cyndi.ngrok-free.dev';

import { getCookie, setCookie, deleteCookie, setJsonCookie } from './cookieUtils';

const apiCall = async (endpoint, options = {}) => {
  try {
    const token = getCookie('user_token');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',

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

export const registerAPI = async (userData) => {
  const result = await apiCall('/api/register/doctor', {
    method: 'POST',
    body: JSON.stringify({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      password_confirmation: userData.password_confirmation,
    }),
  });

  if (result.success && result.data && result.data.token) {
    setCookie('user_token', result.data.token, 7); 
    setJsonCookie('user', result.data.user, 7);
    setCookie('isAuthenticated', 'true', 7);
  }

  return result;
};

export const loginAPI = async (email, password) => {
  const result = await apiCall('/api/login/doctor', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
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


export const forgetPasswordAPI = async (email) => {
  return await apiCall('/api/forget-password/doctor', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};


export const resetPasswordAPI = async (otp, email, password, password_confirmation) => {
  return await apiCall('/api/reset-password/doctor', {
    method: 'POST',
    body: JSON.stringify({
      otp,
      email,
      password,
      password_confirmation,
    }),
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

export const verifyOTPAPI = async (email, otp) => {
  return await apiCall('/api/verify-email/doctor', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
};

export const resendOTPAPI = async (email) => {

  return await apiCall('/api/resend-otp/doctor', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};