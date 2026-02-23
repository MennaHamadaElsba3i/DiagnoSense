import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setCookie, setJsonCookie } from "./cookieUtils";

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("user_token") || searchParams.get("access_token");
    const userParam = searchParams.get("user");

    if (token) {
      setCookie("user_token", token, 7);
      setCookie("isAuthenticated", "true", 7);
      if (userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          setJsonCookie("user", user, 7);
        } catch (e) {
          // ignore if user parsing fails
        }
      }
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <p>Signing in...</p>
    </div>
  );
};

export default GoogleCallback;
