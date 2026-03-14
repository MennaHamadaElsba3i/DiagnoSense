// [Merge conflict resolved: removed all conflict markers and duplicate/commented dead code]
// No code needed in this section; relevant code is below in the file.
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
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
import "./App.css";
import { SidebarProvider } from "./components/SidebarContext";
import { SubscriptionProvider } from "./components/SubscriptionContext";
import { NotificationsProvider } from "./components/NotificationsContext";
import NotificationsPanel from "./components/NotificationsPanel";
import { getCookie } from "./components/cookieUtils";

const ProtectedRoute = ({ children }) => {
  const token = getCookie("user_token");
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <Dashboard />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <PatientList />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <Settings />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <Subscription />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/addpatient"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <AddPatient />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient-profile"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <PatientProfile />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient-profile/:patientId"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <PatientProfile />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-patient"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <AddPatient />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SidebarProvider>
                <SubscriptionProvider>
                  <NotificationsProvider>
                    <Support />
                    <NotificationsPanel />
                  </NotificationsProvider>
                </SubscriptionProvider>
              </SidebarProvider>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

