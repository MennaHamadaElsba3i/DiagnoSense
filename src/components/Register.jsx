import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerAPI } from "./mockAPI";
import { setCookie, setJsonCookie } from "./cookieUtils";

const Register = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstName = e.target.firstName.value;
    const lastName = e.target.lastName.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.password_confirmation.value;

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setIsLoading(true);
    setError("");
    const fullName = `${firstName} ${lastName}`.trim();

    const result = await registerAPI({
      name: fullName,
      email,
      password,
      password_confirmation: confirmPassword,
    });

    if (result.success) {
      // alert("Account created successfully! Redirecting to dashboard...");
      // console.log("User data:", result.data);
      console.log(result.data);
      
      

      // localStorage.setItem("user", JSON.stringify(result.data.user));
      // localStorage.setItem("user_token", result.data.token);
      // localStorage.setItem("isAuthenticated", "true");
      setCookie("user_token", result.data.token, 7);
      setJsonCookie("user", result.data.user, 7);
      setCookie("isAuthenticated", "true", 7);

      navigate("/dashboard");
    } else {
      // عرض الـ error - لو في validation errors
      if (result.errors) {
        // عرض أول error من الـ validation errors
        const firstError = Object.values(result.errors)[0][0];
        setError(firstError);
      } else {
        setError(result.message || "Registration failed. Please try again.");
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="tab-content active">
      <div className="form-header">
        <h2>Create Account</h2>
        <p>Fill in your details to get started</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="name-row">
          <div className="form-group">
            <input
              type="text"
              placeholder="First Name"
              name="firstName"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Last Name"
              name="lastName"
              required
            />
          </div>
        </div>

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
            minLength="8"
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Confirm Password"
            name="password_confirmation"
            required
            minLength="8"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-options" style={{ marginBottom: "20px" }}>
          <label className="remember-me">
            <input type="checkbox" required />I agree to Terms & Conditions
          </label>
        </div>

        <button
          type="submit"
          className={`btn-primary ${isLoading ? "loading" : ""}`}
        >
          {!isLoading && "Create Account"}
        </button>
      </form>
    </div>
  );
};

export default Register;
