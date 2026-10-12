import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
import { registerAPI } from "./mockAPI";
import { setCookie, setJsonCookie } from "./cookieUtils";

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const Register = ({ onRegisterSuccess }) => {
  // دالة صغيرة بتقرأ البيانات المحفوظة أول ما الصفحة تفتح
  const getSavedDraft = () => {
    const saved = sessionStorage.getItem("register_draft");
    return saved ? JSON.parse(saved) : {};
  };

  // بنقرأ البيانات مرة واحدة بس
  const [savedData] = useState(getSavedDraft());

  // بندي القيم الابتدائية للـ State من البيانات اللي قرأناها (أو قيم فاضية لو مفيش)
  const [firstName, setFirstName] = useState(savedData.firstName || "");
  const [lastName, setLastName] = useState(savedData.lastName || "");
  const [contactValue, setContactValue] = useState(savedData.contact || "");
  const [specializationValue, setSpecializationValue] = useState(savedData.specialization || "");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [contactErrors, setContactErrors] = useState([]);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ده الـ useEffect الوحيد اللي هنحتاجه (عشان يحفظ التعديلات الجديدة)
  useEffect(() => {
    const draft = {
      firstName,
      lastName,
      contact: contactValue,
      specialization: specializationValue,
    };
    sessionStorage.setItem("register_draft", JSON.stringify(draft));
  }, [firstName, lastName, contactValue, specializationValue]);

  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "#e74c3c" };
    if (score === 2) return { score: 2, label: "Fair", color: "#f39c12" };
    if (score === 3) return { score: 3, label: "Good", color: "#2ecc71" };
    return { score: 4, label: "Strong", color: "#27ae60" };
  };

  const getPasswordRequirements = (password) => [
  {
    id: "length",
    label: "At least 8 characters",
    met: password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Contains an uppercase letter",
    met: /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Contains a lowercase letter",
    met: /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Contains a number",
    met: /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "Contains a special character",
    met: /[^A-Za-z0-9]/.test(password),
  },
];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstName = e.target.firstName.value;
    const lastName = e.target.lastName.value;
    const contact = contactValue.trim();
    const password = e.target.password.value;
    const confirmPassword = e.target.password_confirmation.value;
    const specialization = specializationValue.trim();

    if (!contact) {
      setError("Please provide an email address or phone number.");
      return;
    }

    setIsLoading(true);
    setError("");
    setContactErrors([]);
    setPasswordErrors([]);

    const fullName = `${firstName} ${lastName}`.trim();

    const result = await registerAPI({
      name: fullName,
      contact,
      password,
      password_confirmation: confirmPassword,
      specialization,
    });
    console.log("Register errors:", result.errors);
    console.log("Register message:", result.message);

    const token = result.token || result.data?.token;
    const user = result.user || result.data?.user || result.data;

    if (result.success && token) {
      const identityUsed = contact;
      setCookie("user_token", token, 7);
      if (user) setJsonCookie("user", user, 7);
      setCookie("isAuthenticated", "true", 7);

      localStorage.removeItem("doctor_name");
      localStorage.removeItem("support_form_draft");

      sessionStorage.removeItem("register_draft");

      if (onRegisterSuccess) {
        onRegisterSuccess(identityUsed);
      }
      // navigate("/dashboard");
    } else {
      if (result.data) {
        if (result.data.contact) {
          setContactErrors(result.data.contact);
        }

        if (result.data.password) {
          setPasswordErrors(result.data.password);
        }

        const otherErrors = Object.keys(result.data).filter(
          (key) => key !== "contact" && key !== "password",
        );
        if (otherErrors.length > 0) {
          setError(result.data[otherErrors[0]][0]);
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
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Last Name"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder="Email address or Phone Number"
            name="contact"
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            className={contactErrors.length > 0 ? "error" : ""}
            required
          />
          {contactErrors.length > 0 && (
            <div className="field-errors">
              {contactErrors.map((err, index) => (
                <div
                  key={index}
                  className="error-message"
                  style={{ marginTop: "5px", marginBottom: "0" }}
                >
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <input
            type="text"
            placeholder="Specialization"
            name="specialization"
            value={specializationValue}
            onChange={(e) => setSpecializationValue(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              name="password"
              required
              minLength="8"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              className={passwordErrors.length > 0 ? "error" : ""}
              style={{ paddingRight: "42px", width: "100%" }}
            />
            
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                color: "#888",
                display: "flex",
                alignItems: "center"
              }}
              tabIndex={-1}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {passwordValue && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                <div style={{ display: "flex", gap: "6px", flex: 1, marginRight: "12px" }}>
                  {[1, 2, 3, 4].map((level) => {
                    const strength = getPasswordStrength(passwordValue);
                    const isActive = level <= strength.score;
                    return (
                      <div
                        key={level}
                        style={{
                          height: "4px",
                          flex: 1,
                          borderRadius: "4px",
                          backgroundColor: isActive ? strength.color : "#e2e8f0",
                          transition: "background-color 0.3s ease"
                        }}
                      />
                    );
                  })}
                </div>
                <span style={{ fontSize: "12px", fontWeight: "600", color: getPasswordStrength(passwordValue).color }}>
                  {getPasswordStrength(passwordValue).label}
                </span>
              </div>

              <ul
                style={{
                  listStyle: "none",
                  padding: "10px 0 2px 0",
                  margin: 0,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px 12px",
                }}
                aria-label="Password requirements"
              >
                {getPasswordRequirements(passwordValue).map((req) => (
                  <li
                    key={req.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "9px",
                      fontWeight: "400",
                      color: req.met ? "#2ecc71" : "#94a3b8",
                      transition: "color 0.25s ease",
                    }}
                    aria-checked={req.met}
                    role="checkbox"
                  >
                    <span
                      style={{
                        width: "13px",
                        height: "13px",
                        borderRadius: "50%",
                        border: `1.5px solid ${req.met ? "#2ecc71" : "#cbd5e1"}`,
                        backgroundColor: req.met ? "#2ecc71" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.25s ease",
                      }}
                      aria-hidden="true"
                    >
                      {req.met && (
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M2 6.5L4.5 9L10 3"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {req.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="form-group">
          <div style={{ position: "relative" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              name="password_confirmation"
              required
              minLength="8"
              className={passwordErrors.length > 0 ? "error" : ""}
              style={{ paddingRight: "42px", width: "100%" }}
            />
            
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                color: "#888",
                display: "flex",
                alignItems: "center"
              }}
              tabIndex={-1}
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {passwordErrors.length > 0 && (
            <div className="field-errors">
              {passwordErrors.map((error, index) => (
                <div key={index} className="error-message" style={{ marginTop: "5px", marginBottom: "0" }}>
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
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          className={`btn-primary ${isLoading ? "loading" : ""}`}
        >
          {!isLoading && "Create Account"}
        </button>
      </form>
    </div>
  );
};

export default Register;