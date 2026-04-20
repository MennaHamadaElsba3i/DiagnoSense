import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../components/SidebarContext";
import { useSubscription } from "../components/SubscriptionContext";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import LogoutConfirmation from "../components/ConfirmationModal.jsx";
import { useNotifications } from "./NotificationsContext";
import { getDoctorInitials } from "./Dashboard";
import {
  getDoctorProfileAPI,
  updateDoctorProfileAPI,
  changePasswordAPI,
  deleteDoctorAccountAPI,
} from "./mockAPI";
import { getJsonCookie } from "./cookieUtils";
import { usePageCache } from "./PageCacheContext";
import "../css/Settingsmaincontent.css";

const EyeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const Settings = () => {
  const navigate = useNavigate();
  const { isSidebarCollapsed } = useSidebar();
  const { credits, isCreditsLoading } = useSubscription();
  const { unreadCount, openNotifications } = useNotifications();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const [profileFeedback, setProfileFeedback] = useState({
    type: "",
    message: "",
  });
  const { getCache, setCache, invalidateCache } = usePageCache();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target)
      ) {
        setIsAvatarMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  const [doctorId, setDoctorId] = useState(null);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    identity: "",
    specialty: "",
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = getJsonCookie("user");

      const id = user?.id || user?.doctor_id || user?.user_id;

      if (!id) {
        console.error("No Doctor ID found in session. Please login again.");
        return;
      }

      setDoctorId(id);

      // ── Cache check ──
      const cached = getCache("settings_profile");
      if (cached) {
        setProfileForm(cached);
        return;
      }

      try {
        const res = await getDoctorProfileAPI(id);
        const isSuccess = res?.success !== false;
        const actualData = res?.data?.data || res?.data || res;

        if (isSuccess && actualData && typeof actualData === "object") {
          const rawSpecialty =
            actualData.speciality ||
            actualData.specialization ||
            actualData.specialty ||
            "";

          const profileData = {
            fullName: actualData.name || actualData.fullName || "",
            identity:
              actualData.identity || actualData.email || actualData.phone || "",
            specialty: rawSpecialty === "N/A" ? "" : rawSpecialty,
          };

          setProfileForm(profileData);
          // ── Store to cache ──
          setCache("settings_profile", profileData);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();
  }, [getCache, setCache]);

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
    setProfileSaved(false);
    setProfileFeedback({ type: "", message: "" });
  };

  const handleProfileSave = async () => {
    if (!doctorId) return;
    setIsSavingProfile(true);
    try {
      const res = await updateDoctorProfileAPI(doctorId, {
        name: profileForm.fullName,
        specialization: profileForm.specialty,
      });
      if (res.success) {
        setProfileFeedback({
          type: "success",
          message: res.message || "Profile updated successfully.",
        });

        // ── Patch settings_profile cache in-place so revisiting shows fresh data ──
        const updatedProfile = {
          fullName: profileForm.fullName,
          identity: profileForm.identity,
          specialty: profileForm.specialty,
        };
        setCache("settings_profile", updatedProfile);

        // ── Update localStorage so Navbar initials reflect name change immediately ──
        if (profileForm.fullName) {
          localStorage.setItem("doctor_name", profileForm.fullName);
        }

        // ── Notify other consumers (backup invalidation) ──
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      } else {
        setProfileFeedback({
          type: "error",
          message: res.message || "Failed to update profile.",
        });
      }
      setTimeout(() => setProfileFeedback({ type: "", message: "" }), 20000);
    } catch (err) {
      setProfileFeedback({
        type: "error",
        message: "Network error. Please check your connection.",
      });
      setTimeout(() => setProfileFeedback({ type: "", message: "" }), 20000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfileCancel = async () => {
    setProfileFeedback({ type: "", message: "" });
    setProfileSaved(false);
    if (doctorId) {
      const res = await getDoctorProfileAPI(doctorId);
      const isSuccess = res?.success !== false;
      const actualData = res?.data?.data || res?.data || res;

      if (isSuccess && actualData && typeof actualData === "object") {
        setProfileForm({
          fullName: actualData.name || actualData.fullName || "",
          identity:
            actualData.identity || actualData.email || actualData.phone || "",
          specialty:
            actualData.speciality ||
            actualData.specialization ||
            actualData.specialty ||
            "",
        });
      }
    }
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthClass = [
    "",
    "settings-page-strength-weak",
    "settings-page-strength-fair",
    "settings-page-strength-good",
    "settings-page-strength-strong",
  ];

  const getPasswordStrength = (password) => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordFeedback({ type: "", message: "" });
    if (name === "newPassword") setPasswordStrength(getPasswordStrength(value));
  };

  const [passwordFeedback, setPasswordFeedback] = useState({
    type: "",
    message: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    setPasswordFeedback({ type: "", message: "", messages: null });
    setIsUpdatingPassword(true);

    try {
      const res = await changePasswordAPI(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword,
      );

      if (res.success) {
        setPasswordFeedback({
          type: "success",
          message: res.message || "Password changed successfully.",
          messages: null,
        });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordStrength(0);
      } else {
        const fieldErrors = res.errors ? Object.values(res.errors).flat() : [];
        setPasswordFeedback({
          type: "error",
          messages: fieldErrors.length > 0 ? fieldErrors : null,
          message:
            fieldErrors.length === 0
              ? res.message || "Failed to update password."
              : null,
        });
      }
    } catch {
      setPasswordFeedback({
        type: "error",
        message: "Network error. Please check your connection.",
        messages: null,
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordStrength(0);
    setPasswordFeedback({ type: "", message: "" });
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteForm, setDeleteForm] = useState({
    password: "",
    passwordConfirm: "",
  });
  const [showDeletePasswords, setShowDeletePasswords] = useState({
    password: false,
    passwordConfirm: false,
  });
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState({
    type: "",
    message: "",
    messages: null,
  });
  const [deleteCountdown, setDeleteCountdown] = useState(null);

  const handleDeleteAccount = async () => {
    if (!doctorId) return;

    setIsDeletingAccount(true);
    setDeleteFeedback({ type: "", message: "", messages: null });

    try {
      const res = await deleteDoctorAccountAPI(
        doctorId,
        deleteForm.password,
        deleteForm.passwordConfirm,
      );

      if (res.success) {
        setDeleteFeedback({
          type: "success",
          message: res.message || "Account deleted successfully.",
          messages: null,
        });
        setDeleteCountdown(25);
      } else {
        const fieldErrors = res.errors ? Object.values(res.errors).flat() : [];
        setDeleteFeedback({
          type: "error",
          messages: fieldErrors.length > 0 ? fieldErrors : null,
          message:
            fieldErrors.length === 0
              ? res.message || "Failed to delete account."
              : null,
        });
      }
    } catch {
      setDeleteFeedback({
        type: "error",
        message: "Network error. Please check your connection.",
        messages: null,
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    if (deleteCountdown === null) return;
    if (deleteCountdown === 0) {
      navigate("/auth", { replace: true });
      return;
    }
    const timer = setTimeout(() => setDeleteCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [deleteCountdown, navigate]);

  return (
    <>
      <div className="background-pattern"></div>

      <Sidebar activePage="settings" />

      {/* ── Navbar ── */}
      <Navbar
  isSidebarCollapsed={isSidebarCollapsed}
  credits={credits}
  isCreditsLoading={isCreditsLoading}
  unreadCount={unreadCount}
  getDoctorInitials={getDoctorInitials}
  openNotifications={openNotifications}
  setIsLogoutModalOpen={setIsLogoutModalOpen}
/>

      <LogoutConfirmation
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
      />

      {/* ── Main Content ── */}
      <div className={`main-content${isSidebarCollapsed ? " collapsed" : ""}`}>
        <div className="settings-page-wrapper">
          {/* Page Header */}
          <div className="settings-page-header">
            <div className="settings-page-header-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <div>
              <h1 className="settings-page-title">Settings</h1>
              <p className="settings-page-subtitle">
                Manage your account, preferences, and security.
              </p>
            </div>
          </div>

          {/* Two-column cards grid */}
          <div className="settings-page-grid">
            {/* ── Profile Information Card ── */}
            <div className="settings-page-card">
              <div className="settings-page-card-header">
                <h2 className="settings-page-card-title">
                  Profile Information
                </h2>
                <p className="settings-page-card-subtitle">
                  Update your personal details
                </p>
              </div>
              <hr className="settings-page-divider" />

              <div
                style={{
                  opacity: 0,
                  position: "absolute",
                  pointerEvents: "none",
                }}
              >
                <input
                  type="text"
                  name="fakeusernameremembered"
                  autoComplete="username"
                  tabIndex={-1}
                />
                <input
                  type="password"
                  name="fakepasswordremembered"
                  autoComplete="current-password"
                  tabIndex={-1}
                />
              </div>

              <div className="settings-page-form-group">
                <label className="settings-page-label">Full Name</label>
                <input
                  className="settings-page-input"
                  type="text"
                  name="fullName"
                  id="fullName"
                  value={profileForm.fullName}
                  onChange={handleProfileChange}
                  placeholder="Dr. Lina Ahmed"
                  autoComplete="name"
                  data-lpignore="true"
                />
              </div>

              <div className="settings-page-form-group">
                <label className="settings-page-label">Identity</label>
                <input
                  className="settings-page-input"
                  type="text"
                  name="identity"
                  value={profileForm.identity}
                  onChange={handleProfileChange}
                  placeholder="Email or Phone"
                  disabled
                />
              </div>

              <div className="settings-page-form-group">
                <label className="settings-page-label">Specialty</label>
                <input
                  className="settings-page-input"
                  type="text"
                  name="specialty"
                  value={profileForm.specialty}
                  onChange={handleProfileChange}
                  placeholder="e.g. Cardiology"
                />
              </div>

              {profileFeedback.message && (
                <div
                  className={`settings-page-profile-feedback ${
                    profileFeedback.type === "success"
                      ? "settings-page-profile-feedback--success"
                      : "settings-page-profile-feedback--error"
                  }`}
                >
                  {profileFeedback.type === "success" ? "✓" : "✕"}{" "}
                  {profileFeedback.message}
                </div>
              )}

              <div
                className="settings-page-card-actions"
                style={{ marginTop: "58px" }}
              >
                <div className="settings-page-actions-left">
                  <button
                    className="settings-page-btn-primary"
                    onClick={handleProfileSave}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="settings-page-btn-outline"
                    onClick={handleProfileCancel}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="settings-page-btn-danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                  </svg>
                  Delete Account
                </button>
              </div>
            </div>

            {/* ── Change Password Card ── */}
            <div className="settings-page-card">
              <div className="settings-page-card-header">
                <h2 className="settings-page-card-title">Change Password</h2>
                <p className="settings-page-card-subtitle">
                  Ensure your account is using a strong password
                </p>
              </div>
              <hr className="settings-page-divider" />

              <div className="settings-page-form-group">
                <label className="settings-page-label">Current Password</label>
                <div className="settings-page-input-wrapper">
                  <input
                    className="settings-page-input"
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                  />
                  <button
                    className="settings-page-eye-btn"
                    onClick={() =>
                      setShowPasswords((p) => ({ ...p, current: !p.current }))
                    }
                    tabIndex={-1}
                    type="button"
                  >
                    {showPasswords.current ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div style={{ textAlign: "left", marginTop: "8px" }}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/login", { state: { openForget: true } });
                    }}
                    style={{
                      fontSize: "13px",
                      color: "var(--primary-color, #3b82f6)",
                      textDecoration: "none",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.textDecoration = "underline")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.textDecoration = "none")
                    }
                  >
                    Forget Password?
                  </a>
                </div>
              </div>

              <div className="settings-page-form-group">
                <label className="settings-page-label">New Password</label>
                <div className="settings-page-input-wrapper">
                  <input
                    className="settings-page-input"
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                  />
                  <button
                    className="settings-page-eye-btn"
                    onClick={() =>
                      setShowPasswords((p) => ({ ...p, new: !p.new }))
                    }
                    tabIndex={-1}
                    type="button"
                  >
                    {showPasswords.new ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className="settings-page-strength-bar-track">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className={`settings-page-strength-bar-seg ${passwordStrength >= seg ? strengthClass[passwordStrength] : ""}`}
                    />
                  ))}
                </div>
                <p className="settings-page-strength-hint">
                  {passwordForm.newPassword
                    ? `Password strength: ${strengthLabel[passwordStrength] || "Very Weak"}`
                    : "Enter a password to see strength"}
                </p>
              </div>

              <div className="settings-page-form-group">
                <label className="settings-page-label">
                  Confirm New Password
                </label>
                <div className="settings-page-input-wrapper">
                  <input
                    className="settings-page-input"
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                  />
                  <button
                    className="settings-page-eye-btn"
                    onClick={() =>
                      setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                    }
                    tabIndex={-1}
                    type="button"
                  >
                    {showPasswords.confirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {(passwordFeedback.message || passwordFeedback.messages) && (
                <div
                  className={`settings-page-password-feedback ${
                    passwordFeedback.type === "success"
                      ? "settings-page-feedback--success"
                      : "settings-page-feedback--error"
                  }`}
                >
                  {passwordFeedback.type === "success" ? (
                    <span>✓ {passwordFeedback.message}</span>
                  ) : passwordFeedback.messages &&
                    passwordFeedback.messages.length > 1 ? (
                    <ul className="settings-page-feedback-list">
                      {passwordFeedback.messages.map((msg, i) => (
                        <li key={i}>✕ {msg}</li>
                      ))}
                    </ul>
                  ) : (
                    <span>
                      ✕{" "}
                      {passwordFeedback.messages?.[0] ??
                        passwordFeedback.message}
                    </span>
                  )}
                </div>
              )}

              <div className="settings-page-card-actions">
                <div className="settings-page-actions-left">
                  <button
                    className="settings-page-btn-primary"
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    className="settings-page-btn-outline"
                    onClick={handlePasswordCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Account Modal ── */}
      {isDeleteModalOpen && (
        <div
          className="settings-page-modal-overlay"
          onClick={() => {
            if (!isDeletingAccount && deleteCountdown === null) {
              setIsDeleteModalOpen(false);
              setDeleteFeedback({ type: "", message: "", messages: null });
              setDeleteForm({ password: "", passwordConfirm: "" });
            }
          }}
        >
          <div
            className="settings-page-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-page-modal-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </div>

            <h3 className="settings-page-modal-title">Delete Account</h3>

            {deleteFeedback.type === "success" ? (
              <div className="settings-page-delete-success">
                <div className="settings-page-delete-success-icon">✓</div>
                <p className="settings-page-delete-success-msg">
                  {deleteFeedback.message}
                </p>
                <p className="settings-page-delete-countdown">
                  Redirecting in <strong>{deleteCountdown}</strong> second
                  {deleteCountdown !== 1 ? "s" : ""}…
                </p>
              </div>
            ) : (
              <>
                <p className="settings-page-modal-body">
                  This action is{" "}
                  <span className="settings-page-modal-danger-text">
                    permanent and irreversible
                  </span>
                  . All your data, patients, and records will be deleted. Please
                  confirm your password to proceed.
                </p>
                <hr className="settings-page-divider" />

                <div className="settings-page-form-group">
                  <label className="settings-page-label">Password</label>
                  <div className="settings-page-input-wrapper">
                    <input
                      className="settings-page-input"
                      type={showDeletePasswords.password ? "text" : "password"}
                      value={deleteForm.password}
                      onChange={(e) => {
                        setDeleteForm({
                          ...deleteForm,
                          password: e.target.value,
                        });
                        setDeleteFeedback({
                          type: "",
                          message: "",
                          messages: null,
                        });
                      }}
                      placeholder="Enter your password"
                      disabled={isDeletingAccount}
                    />
                    <button
                      className="settings-page-eye-btn"
                      onClick={() =>
                        setShowDeletePasswords((p) => ({
                          ...p,
                          password: !p.password,
                        }))
                      }
                      tabIndex={-1}
                      type="button"
                    >
                      {showDeletePasswords.password ? (
                        <EyeOffIcon />
                      ) : (
                        <EyeIcon />
                      )}
                    </button>
                  </div>
                </div>

                <div className="settings-page-form-group">
                  <label className="settings-page-label">
                    Password Confirmation
                  </label>
                  <div className="settings-page-input-wrapper">
                    <input
                      className="settings-page-input"
                      type={
                        showDeletePasswords.passwordConfirm
                          ? "text"
                          : "password"
                      }
                      value={deleteForm.passwordConfirm}
                      onChange={(e) => {
                        setDeleteForm({
                          ...deleteForm,
                          passwordConfirm: e.target.value,
                        });
                        setDeleteFeedback({
                          type: "",
                          message: "",
                          messages: null,
                        });
                      }}
                      placeholder="Re-enter your password"
                      disabled={isDeletingAccount}
                    />
                    <button
                      className="settings-page-eye-btn"
                      onClick={() =>
                        setShowDeletePasswords((p) => ({
                          ...p,
                          passwordConfirm: !p.passwordConfirm,
                        }))
                      }
                      tabIndex={-1}
                      type="button"
                    >
                      {showDeletePasswords.passwordConfirm ? (
                        <EyeOffIcon />
                      ) : (
                        <EyeIcon />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Error feedback box — below inputs, above buttons ── */}
                {(deleteFeedback.message || deleteFeedback.messages) &&
                  deleteFeedback.type === "error" && (
                    <div className="settings-page-password-feedback settings-page-feedback--error">
                      {deleteFeedback.messages &&
                      deleteFeedback.messages.length > 1 ? (
                        <ul className="settings-page-feedback-list">
                          {deleteFeedback.messages.map((msg, i) => (
                            <li key={i}>✕ {msg}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>
                          ✕{" "}
                          {deleteFeedback.messages?.[0] ??
                            deleteFeedback.message}
                        </span>
                      )}
                    </div>
                  )}

                <div className="settings-page-modal-actions">
                  <button
                    className="settings-page-btn-outline settings-page-modal-cancel"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteFeedback({
                        type: "",
                        message: "",
                        messages: null,
                      });
                      setDeleteForm({ password: "", passwordConfirm: "" });
                    }}
                    disabled={isDeletingAccount}
                  >
                    Cancel
                  </button>
                  <button
                    className="settings-page-btn-danger"
                    onClick={handleDeleteAccount}
                    disabled={
                      isDeletingAccount ||
                      !deleteForm.password ||
                      !deleteForm.passwordConfirm
                    }
                  >
                    {isDeletingAccount ? (
                      <span className="settings-page-btn-loading">
                        <span className="settings-page-spinner" />
                        Deleting…
                      </span>
                    ) : (
                      <>
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                        </svg>
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
