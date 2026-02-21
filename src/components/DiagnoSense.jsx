import "../css/Diagnosense.css";
import { useNavigate } from "react-router-dom";
import dlogo from "../assets/Logo_Diagnoo.png";

export default function DiagnoSense() {
  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/login");
  };

  return (
    <div>
      <div className="background-decoration">
        <div className="floating-icon">🩺</div>
        <div className="floating-icon">💓</div>
        <div className="floating-icon">📊</div>
        <div className="floating-icon">⚕️</div>
        <div className="floating-icon">🔬</div>
      </div>

      <nav>
        <div className="logo">
          <img src={dlogo} alt="" style={{ width: "160px" }} />
        </div>
        <ul className="nav-links" style={{ marginBottom: "0px" }}>
          <li>
            <a href="#home">Home</a>
          </li>
          <li>
            <a href="#challenges">Challenges</a>
          </li>
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
        </ul>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }} className="btn-nav">
          Get Started
        </a>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <h1>
            Smarter Diagnostics.{" "}
            <span className="highlight">Fewer Errors.</span> Better Outcomes.
          </h1>
          <p>
            DiagnoSense turns the chaos of medical data into clear insights,
            helping doctors focus on care.
          </p>
          <div className="hero-actions">
            <a  href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }} className="start">
              Start Your Free Trial
            </a>
            <a href="#" className="btn-secondary">
              See How It Works
            </a>
          </div>
          <div className="trial-notice">
            No credit card required • Try in minutes
          </div>
        </div>

        <div className="preview-section">
          <div className="cards-stack">
            <div className="patient-card-3d">
              <div className="card-header">
                <div className="patient-avatar">JA</div>
                <div className="card-patient-info">
                  <div className="card-patient-name">Janna Ahmed</div>
                  <div className="card-patient-id">ID: #PAT-4821</div>
                </div>
                <span className="status-badge critical">Critical</span>
              </div>
              <div className="card-stats">
                <div className="stat-row">
                  <span className="stat-label">Blood Sugar</span>
                  <span className="stat-value trend-up">285 mg/dL ↑</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Creatinine</span>
                  <span className="stat-value trend-up">3.2 mg/dL ↑</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Blood Pressure</span>
                  <span className="stat-value">158/95 mmHg</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="last-visit">Last visit: 2 days ago</span>
                <button className="view-btn">View Details</button>
              </div>
            </div>

            <div className="patient-card-3d">
              <div className="card-header">
                <div className="patient-avatar avatar-2">HK</div>
                <div className="card-patient-info">
                  <div className="card-patient-name">Ahmed Elsarawy</div>
                  <div className="card-patient-id">ID: #PAT-4756</div>
                </div>
                <span className="status-badge attention">Attention</span>
              </div>
              <div className="card-stats">
                <div className="stat-row">
                  <span className="stat-label">Hemoglobin</span>
                  <span className="stat-value trend-down">9.2 g/dL ↓</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Blood Pressure</span>
                  <span className="stat-value">145/92 mmHg</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Heart Rate</span>
                  <span className="stat-value">78 bpm</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="last-visit">Follow-up due today</span>
                <button className="view-btn">View Details</button>
              </div>
            </div>

            <div className="patient-card-3d">
              <div className="card-header">
                <div className="patient-avatar avatar-3">DE</div>
                <div className="card-patient-info">
                  <div className="card-patient-name">Magdy Ahmed</div>
                  <div className="card-patient-id">ID: #PAT-4689</div>
                </div>
                <span className="status-badge stable">Stable</span>
              </div>
              <div className="card-stats">
                <div className="stat-row">
                  <span className="stat-label">All Vitals</span>
                  <span className="stat-value">Normal Range</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Improvement</span>
                  <span className="stat-value trend-down">95% ✓</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Treatment Plan</span>
                  <span className="stat-value">On Track</span>
                </div>
              </div>
              <div className="card-footer">
                <span className="last-visit">Next visit: In 2 weeks</span>
                <button className="view-btn">View Details</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section" id="challenges">
        <span className="section-badge">THE CHALLENGE</span>
        <h2 className="section-title">Understanding Diagnostic Errors</h2>
        <p className="section-subtitle">
          The statistics that drive our mission to transform medical
          decision-making
        </p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-number">23%</div>
            <div className="stat-card-label">
              Patients experience misdiagnosis annually
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">18%</div>
            <div className="stat-card-label">
              Lead to serious harm or preventable death
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">795K</div>
            <div className="stat-card-label">
              Annual US deaths from diagnostic errors
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-number">33%</div>
            <div className="stat-card-label">
              Doctor time spent reviewing medical records
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <span className="section-badge">CORE CAPABILITIES</span>
        <h2 className="section-title">
          Precision Through Layered Intelligence
        </h2>
        <p className="section-subtitle">
          Every feature designed to bring depth and clarity to your clinical
          decision-making process
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
            </div>
            <h3 className="feature-title">Smart Data Summaries</h3>
            <p className="feature-description">
              Automatically reads reports and results, extracting key details
              into clear summaries that help doctors focus on what matters most.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M18 20V10M12 20V4M6 20v-6"></path>
              </svg>
            </div>
            <h3 className="feature-title">Comparative Insights</h3>
            <p className="feature-description">
              Tracks changes across visits, highlighting improvements or
              declines with visual cues that make patient progress easy to
              understand.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <h3 className="feature-title">Decision Support System</h3>
            <p className="feature-description">
              Connects medical information to suggest possible conditions,
              helping doctors make faster, more confident, and data-backed
              clinical decisions.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h3 className="feature-title">Personalized Ranges</h3>
            <p className="feature-description">
              Adjusts normal test limits for each patient's age, gender, and
              health status, ensuring every result is interpreted accurately.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
              </svg>
            </div>
            <h3 className="feature-title">Patient Chat Assistant</h3>
            <p className="feature-description">
              Lets doctors ask case-specific questions and instantly get precise
              answers from verified patient data within their medical file.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"></path>
              </svg>
            </div>
            <h3 className="feature-title">Doctor Collaboration Hub</h3>
            <p className="feature-description">
              Creates secure spaces for doctors to discuss cases, share
              findings, and coordinate care efficiently with full documentation
              and clarity.
            </p>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-container">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>
              We'd love to hear from you. Reach out for demos, support, or
              partnership opportunities.
            </p>

            <div className="contact-details">
              <div className="contact-item">
                <div className="contact-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div className="contact-item-content">
                  <h4>Email</h4>
                  <p>support@diagnosense.com</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                  </svg>
                </div>
                <div className="contact-item-content">
                  <h4>Phone</h4>
                  <p>+20 1234567890</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div className="contact-item-content">
                  <h4>Location</h4>
                  <p>Egypt, Mansoura</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
                <div className="contact-item-content">
                  <h4>Company</h4>
                  <p>DiagnoSense Inc.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form">
            <div onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us how we can help you..."
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                className="form-submit"
                onClick={handleSubmit}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>
          &copy; 2026 DiagnoSense Inc. All rights reserved. | Transforming
          Medical Decision-Making with AI
        </p>
      </footer>
    </div>
  );
}
