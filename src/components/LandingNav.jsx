import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import dlogo from "../assets/Logo_Diagnoo.png";
import "../css/Diagnosense.css";

export default function LandingNav() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav>
        {/* Logo */}
        <div className="logo">
          <img src={dlogo} alt="DiagnoSense" />
        </div>

        {/* Desktop links */}
        <ul className="nav-links-desktop">
          <li><a href="/#home">Home</a></li>
          <li><a href="/#challenges">Challenges</a></li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); navigate("/integration"); }}>Integration</a></li>
          <li><a href="/#features">Features</a></li>
          <li><a href="/#contact">Contact</a></li>
        </ul>

        {/* Desktop button */}
        <div className="btn-nav-wrapper">
          <a href="/login" className="btn-nav">Get Started</a>
        </div>

        {/* Hamburger */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={menuOpen ? "bar rotate-top" : "bar"}></span>
          <span className={menuOpen ? "bar hide-mid" : "bar"}></span>
          <span className={menuOpen ? "bar rotate-bot" : "bar"}></span>
        </button>
      </nav>

      {/* ── Right Sidebar ── */}
      {/* Overlay — clicking it closes sidebar */}
      <div
        className={`sidebar-overlay ${menuOpen ? "active" : ""}`}
        onClick={closeMenu}
      />

      {/* Sidebar panel */}
      <div className={`mobile-sidebar ${menuOpen ? "open" : ""}`}>
        <button className="sidebar-close-btn" onClick={closeMenu}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="sidebar-logo">
          <img src={dlogo} alt="DiagnoSense" style={{ width: "120px", paddingLeft: "0.5rem" }} />
        </div>

        <ul className="sidebar-links">
          <li><a href="/#home"       onClick={closeMenu}>Home</a></li>
          <li><a href="/#challenges" onClick={closeMenu}>Challenges</a></li>
          <li><a href="#" onClick={(e) => { e.preventDefault(); closeMenu(); navigate("/integration"); }}>Integration</a></li>
          <li><a href="/#features"   onClick={closeMenu}>Features</a></li>
          <li><a href="/#contact"    onClick={closeMenu}>Contact</a></li>
        </ul>

        <a href="/login" className="btn-nav sidebar-cta" onClick={closeMenu}>
          Get Started
        </a>
      </div>
    </>
  );
}