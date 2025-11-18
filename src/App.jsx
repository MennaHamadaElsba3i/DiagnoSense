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
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* صفحة اللوجين */}
        <Route path="/login" element={<AuthPage />} />

        {/* صفحة الداشبورد المحمية */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* الصفحة الرئيسية توجه للوجين */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* أي صفحة غير موجودة توجه للوجين */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
