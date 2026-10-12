import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setCookie, setJsonCookie } from "./cookieUtils";

/**
 * GoogleCallback
 *
 * Mounted at /auth/google/callback (unprotected route).
 * Backend now redirects here with token directly in the URL hash.
 */
const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Try to get token from URL hash (New Backend Behavior)
    const hash = window.location.hash || "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    let token =
      hashParams.get("token") ||
      hashParams.get("access_token") ||
      hashParams.get("user_token");

    // 2. Fallback to search params (Backward Compatibility)
    if (!token) {
      token =
        searchParams.get("token") ||
        searchParams.get("access_token") ||
        searchParams.get("user_token");
    }

    if (!token) {
      // No token found — log details and send back to login.
      console.error("Google callback token missing. hash:", window.location.hash, "search:", window.location.search);
      setError("Sign-in failed: no token received. Redirecting to login…");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
      return;
    }

    // Store token identically to normal login (setCookie "user_token", 7 days)
    setCookie("user_token", token, 7);
    setCookie("isAuthenticated", "true", 7);

    // If user data is returned in the hash/search params, save it
    let userStr = hashParams.get("user") || searchParams.get("user");
    if (userStr) {
      try {
        const userObj = JSON.parse(decodeURIComponent(userStr));
        setJsonCookie("user", userObj, 7);
      } catch (e) {
        console.error("Failed to parse user data from URL:", e);
      }
    }

    // Dispatch authChanged event like normal login
    window.dispatchEvent(new CustomEvent("authChanged"));

    // Clean the URL hash
    window.history.replaceState(null, "", window.location.pathname);

    // Navigate to dashboard
    navigate("/dashboard", { replace: true });
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "16px",
        fontFamily: "Inter, sans-serif",
        color: "#374151",
      }}
    >
      {error ? (
        <p style={{ color: "#dc2626", fontSize: "15px" }}>{error}</p>
      ) : (
        <>
          {/* Simple CSS spinner — no extra dependency needed */}
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #2563eb",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, fontSize: "15px" }}>Signing you in…</p>
        </>
      )}
    </div>
  );
};

export default GoogleCallback;
