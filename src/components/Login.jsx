import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI, googleLoginAPI } from "./mockAPI";
import { setCookie, setJsonCookie } from "./cookieUtils";

const Login = ({ onForgotPassword }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    setIsLoading(true);
    setError("");

    const result = await loginAPI(email, password);

    if (result.success) {
      // alert("Login successful! Redirecting to dashboard...");
      // console.log("User data:", result.data);
      // localStorage.setItem("user", JSON.stringify(result.data.user));
      // localStorage.setItem("user_token", result.data.token); // حفظ الـ token
      // localStorage.setItem("isAuthenticated", "true");
      console.log(result.data);
      setCookie("user_token", result.data.token, 7);
      setJsonCookie("user", result.data.user, 7);
      setCookie("isAuthenticated", "true", 7);

      navigate("/dashboard");
    } else {
      setError(result.message || "Login failed. Please try again.");
    }
    setIsLoading(false);
  };

  // const handleGoogleLogin = async () => {
  //   const result = await googleLoginAPI();
  //   if (result.success) {
  //     alert("Google login successful!");
  //     console.log("User data:", result.data);
  //   }
  // };
  const handleGoogleLogin = async () => {
    const result = await googleLoginAPI();
    if (result.success) {
      localStorage.setItem("user", JSON.stringify(result.data));
      localStorage.setItem("user_token", result.data.token);
      localStorage.setItem("isAuthenticated", "true");
      navigate("/dashboard");
    }
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Login to your account</h2>
        <p>Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            name="email"
            required
            className={error ? "error" : ""}
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            name="password"
            required
            className={error ? "error" : ""}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-options">
          <label className="remember-me">
            <input type="checkbox" />
            Remember Me
          </label>
          <a
            href="#"
            className="forgot-password"
            onClick={(e) => {
              e.preventDefault();
              if (onForgotPassword) onForgotPassword();
            }}
          >
            Forgot Password?
          </a>
        </div>

        <button
          type="submit"
          className={`btn-primary ${isLoading ? "loading" : ""}`}
        >
          {!isLoading && "Login"}
        </button>
      </form>

      <div className="divider">
        <span>or continue with</span>
      </div>

      <div className="social-login">
        <button
          type="button"
          className="social-btn"
          onClick={handleGoogleLogin}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
      </div>
    </div>
  );
};

export default Login;
