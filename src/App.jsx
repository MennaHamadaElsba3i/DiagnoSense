// import React from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import AuthPage from "./pages/AuthPage.jsx";
// import Dashboard from "./components/Dashboard.jsx";
// import "./App.css";
// const ProtectedRoute = ({ children }) => {
//   const isAuthenticated = localStorage.getItem("isAuthenticated");
//   return isAuthenticated ? children : <Navigate to="/login" />;
// };
// function App() {
//   // return <AuthPage />;
//   return <Dashboard />;
// }

// export default App;

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./components/Dashboard.jsx";
import PatientList from "./components/PatientList.jsx";
import AddPatient from "./components/AddPatient.jsx";
import PatientProfile from "./components/PatientProfile.jsx"; 
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />

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

        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
    // <PatientProfile></PatientProfile>
    
  );
}

export default App;
