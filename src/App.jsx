// [Merge conflict resolved: removed all conflict markers and duplicate/commented dead code]
// No code needed in this section; relevant code is below in the file.
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";
import Dashboard from "./components/Dashboard.jsx";
import PatientList from "./components/PatientList.jsx";
import AddPatient from "./components/AddPatient.jsx";
import PatientProfile from "./components/PatientProfile.jsx";
import ProcessingReports from "./components/ProcessingReports.jsx";
import DiagnoSense from "./components/DiagnoSense.jsx";
import GoogleCallback from "./components/GoogleCallback.jsx";
import EvidencePanel from './components/EvidencePanel';
import Settings from './components/Settings.jsx';
import Subscription from './components/subscription.jsx';
import Integration from "./components/integration.jsx";
import Support from "./components/support.jsx";
import Unauthorized from "./components/Unauthorized.jsx";
import "./App.css";
import { SidebarProvider } from "./components/SidebarContext";
import { SubscriptionProvider } from "./components/SubscriptionContext";
import { NotificationsProvider } from "./components/NotificationsContext";
import NotificationsPanel from "./components/NotificationsPanel";
import { getCookie, setCookie, setJsonCookie } from "./components/cookieUtils";
import { ThemeProvider } from "./components/ThemeContext";
import { PageCacheProvider } from "./components/PageCacheContext";

const ProtectedRoute = ({ children }) => {
  const token = getCookie("user_token");
  return token ? children : <Navigate to="/login" />;
};

const GuestRoute = ({ children }) => {
  const token = getCookie("user_token");
  return token ? <Navigate to="/dashboard" replace /> : children;
};

const ProtectedLayout = () => {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <SubscriptionProvider>
          <NotificationsProvider>
            <Outlet />
            <NotificationsPanel />
          </NotificationsProvider>
        </SubscriptionProvider>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

/**
 * OAuthHashHandler
 *
 * Checks for Google auth tokens in the URL hash on every route load.
 * This is necessary because the backend may redirect to the root URL (/)
 * with the token in the hash (e.g., localhost:5173/#token=...).
 */
const OAuthHashHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || "";
    if (!hash) return;

    console.log("[OAuthHashHandler] hash detected:", Boolean(hash));

    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const token =
      hashParams.get("token") ||
      hashParams.get("access_token") ||
      hashParams.get("user_token");

    if (token) {
      console.log("[OAuthHashHandler] token detected:", Boolean(token));

      // Store token using utility
      setCookie("user_token", token, 7);
      setCookie("isAuthenticated", "true", 7);
      
      localStorage.setItem("user_token", token);
      localStorage.setItem("isAuthenticated", "true");

      // Explicitly set document.cookie for true cookie fallback
      document.cookie = `user_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      document.cookie = `isAuthenticated=true; path=/; max-age=${7 * 24 * 60 * 60}`;

      const fetchProfile = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
          const response = await fetch(`${API_BASE_URL}/api/v1/doctors/profile/edit`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const doctorData = result.data;
              console.log("[OAuthHashHandler] profile loaded:", Boolean(doctorData?.id));
              
              setJsonCookie("user", doctorData, 7);
              localStorage.setItem("user", JSON.stringify(doctorData));

              window.dispatchEvent(new CustomEvent("authChanged"));

              window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
              );

              navigate("/dashboard", { replace: true });
            } else {
              console.error("[OAuthHashHandler] Invalid profile data format");
            }
          } else if (response.status === 401) {
            setCookie("user_token", "", -1);
            localStorage.removeItem("user_token");
            navigate("/login", { replace: true });
          } else {
            console.error("[OAuthHashHandler] Failed to load profile:", response.status);
          }
        } catch (error) {
          console.error("[OAuthHashHandler] Error fetching profile (safe log)");
        }
      };

      fetchProfile();
    }
  }, [navigate]);

  return null;
};

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      window.close();
    }
  }, []);

  return (
    <ThemeProvider>
    <PageCacheProvider>
    <BrowserRouter>
      <OAuthHashHandler />
      <Routes>
        <Route path="/" element={<DiagnoSense />} />

        <Route path="/home" element={<DiagnoSense />} />

        <Route path="/login" element={<GuestRoute><AuthPage /></GuestRoute>} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        <Route path="/loading" element={<ProcessingReports />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/evidence" element={<EvidencePanel />} />
        <Route path="/integration" element={<Integration />} />

        {/* Google OAuth callback - backend redirects here after sign in */}
        <Route path="/google-callback" element={<GoogleCallback />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        {/* Global Authenticated Layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/addpatient" element={<AddPatient />} />
          <Route path="/add-patient" element={<AddPatient />} />
          <Route path="/patient-profile" element={<PatientProfile />} />
          <Route path="/patient-profile/:patientId" element={<PatientProfile />} />
          <Route path="/edit-patient/:patientId" element={<AddPatient />} />
          <Route path="/support" element={<Support />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </PageCacheProvider>
    </ThemeProvider>
  );
}

export default App;

