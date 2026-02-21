import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
import { registerAPI } from "./mockAPI";
import { setCookie, setJsonCookie } from "./cookieUtils";

const Register = ({ onRegisterSuccess }) => {
  // const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailErrors, setEmailErrors] = useState([]);
  const [passwordErrors, setPasswordErrors] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstName = e.target.firstName.value;
    const lastName = e.target.lastName.value;
    const email = e.target.email.value;
    const phone = e.target.phone.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.password_confirmation.value;

    if (!email && !phone) {
      setError("Please provide either an email address or a phone number.");
      return;
    }
    setIsLoading(true);
    setError("");
    setEmailErrors([]);
    setPasswordErrors([]);

    const fullName = `${firstName} ${lastName}`.trim();

    const result = await registerAPI({
      name: fullName,
      email,
      phone,
      password,
      password_confirmation: confirmPassword,
    });

    if (result.success) {
      const identityUsed = email ? email : phone;
      console.log(result.data);
      setCookie("user_token", result.data.token, 7);
      setJsonCookie("user", result.data.user, 7);
      setCookie("isAuthenticated", "true", 7);

      if (onRegisterSuccess) {
        onRegisterSuccess(identityUsed); 
      }
      // navigate("/dashboard");
    } else {
      if (result.errors) {
        if (result.errors.email) {
          setEmailErrors(result.errors.email);
        }

        if (result.errors.password) {
          setPasswordErrors(result.errors.password);
        }

        const otherErrors = Object.keys(result.errors).filter(
          (key) => key !== "email" && key !== "password",
        );
        if (otherErrors.length > 0) {
          setError(result.errors[otherErrors[0]][0]);
        }
      } else {
        setError(result.message);
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
    
            className={emailErrors.length > 0 ? "error" : ""}
          />
          {emailErrors.length > 0 && (
            <div className="field-errors">
              {emailErrors.map((error, index) => (
                <div
                  key={index}
                  className="error-message"
                  style={{ marginTop: "5px", marginBottom: "0" }}
                >
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <input
            type="tel"
            placeholder="Phone Number (Optional if email is provided)"
            name="phone"
            className={error.includes("phone") ? "error" : ""}
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            name="password"
            required
            className={passwordErrors.length > 0 ? "error" : ""}
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Confirm Password"
            name="password_confirmation"
            required
            className={passwordErrors.length > 0 ? "error" : ""}
          />
          {passwordErrors.length > 0 && (
            <div className="field-errors">
              {passwordErrors.map((error, index) => (
                <div
                  key={index}
                  className="error-message"
                  style={{ marginTop: "5px", marginBottom: "0" }}
                >
                  {error}
                </div>
              ))}
            </div>
          )}
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
