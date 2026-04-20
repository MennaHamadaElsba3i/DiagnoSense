// [Merge conflict resolved: removed all conflict markers and duplicate/commented dead code]
// No code needed in this section; relevant code is below in the file.
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./components/Dashboard.jsx";
import PatientList from "./components/PatientList.jsx";
import AddPatient from "./components/AddPatient.jsx";
import EditPatient from "./components/EditPatient.jsx";
import PatientProfile from "./components/PatientProfile.jsx";
import ProcessingReports from "./components/ProcessingReports.jsx";
import DiagnoSense from "./components/DiagnoSense.jsx";
import GoogleCallback from "./components/GoogleCallback.jsx";
import EvidencePanel from './components/EvidencePanel';
import Settings from './components/Settings.jsx';
import Subscription from './components/subscription.jsx';
import Integration from "./components/integration.jsx";
import Support from "./components/support.jsx";
import "./App.css";
import { SidebarProvider } from "./components/SidebarContext";
import { SubscriptionProvider } from "./components/SubscriptionContext";
import { NotificationsProvider } from "./components/NotificationsContext";
import NotificationsPanel from "./components/NotificationsPanel";
import { getCookie } from "./components/cookieUtils";
import { ThemeProvider } from "./components/ThemeContext";
import { PageCacheProvider } from "./components/PageCacheContext";

const ProtectedRoute = ({ children }) => {
  const token = getCookie("user_token");
  return token ? children : <Navigate to="/login" />;
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

function App() {
  return (
    <ThemeProvider>
    <PageCacheProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiagnoSense />} />

        <Route path="/home" element={<DiagnoSense />} />

        <Route path="/login" element={<AuthPage />} />

        <Route path="/loading" element={<ProcessingReports />} />
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
          <Route path="/edit-patient/:patientId" element={<EditPatient />} />
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

