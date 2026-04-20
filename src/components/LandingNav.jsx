import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import dlogo from "../assets/Logo_Diagnoo.png";
import "../css/Diagnosense.css";

export default function LandingNav() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav>
      <div className="logo">
        <img src={dlogo} alt="DiagnoSense" style={{ width: "140px" }} />
      </div>

      <ul className="nav-links-desktop">
        <li><a href="/#home">Home</a></li>
        <li><a href="/#challenges">Challenges</a></li>
        <li>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/integration"); }}>
            Integration
          </a>
        </li>
        <li><a href="/#features">Features</a></li>
        <li><a href="/#contact">Contact</a></li>
      </ul>

      <div className="btn-nav-wrapper">
        <a href="/login" className="btn-nav">Get Started</a>
      </div>

      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={menuOpen ? "bar rotate-top" : "bar"}></span>
        <span className={menuOpen ? "bar hide-mid" : "bar"}></span>
        <span className={menuOpen ? "bar rotate-bot" : "bar"}></span>
      </button>

      {menuOpen && (
        <div className="mobile-dropdown">
          <ul>
            <li><a href="/#home"       onClick={closeMenu}>Home</a></li>
            <li><a href="/#challenges" onClick={closeMenu}>Challenges</a></li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); closeMenu(); navigate("/integration"); }}>
                Integration
              </a>
            </li>
            <li><a href="/#features"   onClick={closeMenu}>Features</a></li>
            <li><a href="/#contact"    onClick={closeMenu}>Contact</a></li>
            <li>
              <a href="/login" className="btn-nav mobile-btn" onClick={closeMenu}>
                Get Started
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}