import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { googleCallbackAPI } from "./mockAPI";

/**
 * GoogleCallback
 *
 * Mounted at /auth/google/callback.
 * Google OAuth redirects here with ?code=... after the user picks their account.
 *
 * Flow:
 *  1. Read `code` from the URL query string.
 *  2. POST it to the backend via googleCallbackAPI (GET /api/google/callback?code=...).
 *  3. Backend returns { success, token, data: { user } }.
 *  4. Token is stored in cookies + localStorage inside googleCallbackAPI.
 *  5. Navigate to /dashboard.
 */
const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      // No auth code — something went wrong, send back to login.
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const exchangeCode = async () => {
      try {
        const result = await googleCallbackAPI(code);

        if (cancelled) return;

        if (result.success) {
          navigate("/dashboard", { replace: true });
        } else {
          console.error("[GoogleCallback] auth failed:", result);
          setError("Google sign-in failed. Please try again.");
          setTimeout(() => {
            if (!cancelled) navigate("/login", { replace: true });
          }, 2500);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[GoogleCallback] unexpected error:", err);
        setError("An unexpected error occurred. Redirecting to login…");
        setTimeout(() => {
          if (!cancelled) navigate("/login", { replace: true });
        }, 2500);
      }
    };

    exchangeCode();

    return () => {
      cancelled = true;
    };
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
