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

// import React from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import AuthPage from "./pages/AuthPage.jsx";
// import Dashboard from "./components/Dashboard.jsx";
// import PatientList from "./components/PatientList.jsx";
// import AddPatient from "./components/AddPatient.jsx";
// import PatientProfile from "./components/PatientProfile.jsx"; 
// import DiagnoSense from "./components/DiagnoSense.jsx"
// import "./App.css";

// const ProtectedRoute = ({ children }) => {
//   const isAuthenticated = localStorage.getItem("isAuthenticated");
//   return isAuthenticated ? children : <Navigate to="/login" />;
// };

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/login" element={<AuthPage />} />

//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <Dashboard />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/patients"
//           element={
//             <ProtectedRoute>
//               <PatientList />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/addpatient"
//           element={
//             <ProtectedRoute>
//               <AddPatient />
//             </ProtectedRoute>
//           }
//         />

      
//         <Route
//           path="/patient-profile" 
//           element={
//             <ProtectedRoute>
//               <PatientProfile />
//             </ProtectedRoute>
//           }
//         />


//         <Route path="/" element={<Navigate to="/login" />} />

//         <Route path="*" element={<Navigate to="/login" />} />
//       </Routes>
//     </BrowserRouter>
//     // <DiagnoSense></DiagnoSense>
//     // <PatientProfile></PatientProfile>
    
//   );
// }

// export default App;

//-------------------------------------------------------------------------------------------
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./components/Dashboard.jsx";
import PatientList from "./components/PatientList.jsx";
import AddPatient from "./components/AddPatient.jsx";
import PatientProfile from "./components/PatientProfile.jsx";
import DiagnoSense from "./components/DiagnoSense.jsx"; // تأكدي ان المسار صح
import GoogleCallback from "./components/GoogleCallback.jsx";
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
        {/* 1. دي التغييرة المهمة: الروت الأساسي يفتح صفحة DiagnoSense */}
        <Route path="/" element={<DiagnoSense />} />
        
        {/* وبرضه لو حد كتب /home يفتح نفس الصفحة */}
        <Route path="/home" element={<DiagnoSense />} />

        {/* 2. صفحة اللوجين */}
        <Route path="/login" element={<AuthPage />} />

        {/* Google OAuth callback - backend redirects here after sign in */}
        <Route path="/google-callback" element={<GoogleCallback />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        {/* 3. الصفحات المحمية (لازم تسجيل دخول) */}
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

        {/* أي رابط غلط يرجعنا لصفحة الهوم */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
