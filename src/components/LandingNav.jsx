import React from "react";
import { useNavigate } from "react-router-dom";
import dlogo from "../assets/Logo_Diagnoo.png";
import "../css/Diagnosense.css";

export default function LandingNav() {
  const navigate = useNavigate();

  return (
    <nav>
      <div className="logo" style={{ width: "160px" }}>
        <img src={dlogo} alt="" style={{ width: "160px" }} />
      </div>
      <ul className="nav-links" style={{ marginBottom: "0px" }}>
        <li>
          <a href="/#home">Home</a>
        </li>
        <li>
          <a href="/#challenges">Challenges</a>
        </li>
        <li>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate("/integration"); }}>Integration</a>
        </li>
        <li>
          <a href="/#features">Features</a>
        </li>
        <li>
          <a href="/#contact">Contact</a>
        </li>
      </ul>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          navigate("/login");
        }}
        className="btn-nav"
      >
        Get Started
      </a>
    </nav>
  );
}
