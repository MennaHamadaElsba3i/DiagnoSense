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
import "./App.css";
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

        {/* Google OAuth callback - backend redirects here after sign in */}
        <Route path="/google-callback" element={<GoogleCallback />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <PatientList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/addpatient"
          element={
            <ProtectedRoute>
              <AddPatient />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient-profile"
          element={
            <ProtectedRoute>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-patient"
          element={
            <ProtectedRoute>
              <AddPatient />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
