import React, { useState, useEffect } from 'react';
import LandingNav from './LandingNav';
import '../css/integration.css';

function Integration() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [testStatus, setTestStatus] = useState('Run Test');

  const handleRunTest = () => {
    if (testStatus === 'Testing...' || testStatus === 'Test Successful ✓') return;

    setTestStatus('Testing...');

    setTimeout(() => {
      setTestStatus('Test Successful ✓');

      setTimeout(() => {
        setTestStatus('Run Test');
      }, 2000);
    }, 1500);
  };

  return (
    <>
      <LandingNav />
      <div className="integration-page">
        {/* Hero Section */}
        <section className="intg-hero">
          <div className="intg-container">
            {/* <div className="intg-badge">SMART ON FHIR READY</div> */}
            <h1>Seamless <span className="intg-highlight">EHR Integration</span></h1>
            <p className="intg-subheadline">
              Diagnosense integrates with existing hospital systems as a secure clinical intelligence layer.
            </p>
            <p className="intg-microcopy">No workflow disruption. No data migration required.</p>
            <div className="intg-hero-actions">
              <button className="intg-btn-primary" onClick={() => setIsAuthenticated(true)}>Start Your Free Trial</button>
              <button className="intg-btn-secondary">See How It Works</button>
            </div>
            <p className="intg-hero-note">No credit card required • Try in minutes</p>
          </div>
        </section>

        {/* How Integration Works */}
        <section style={{ background: 'var(--bg-white)' }}>
          <div className="intg-container">
            <div className="intg-section-header">
              <h2>How Integration Works</h2>
              <p>A secure, streamlined connection between your EHR and clinical intelligence</p>
            </div>

            <div className="intg-flow-container">
              <div className="intg-flow-box">
                <div className="intg-flow-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="9" x2="15" y2="9" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <h3>Hospital EHR</h3>
                <p>Your existing system</p>
              </div>

              <div className="intg-flow-arrow">→</div>

              <div className="intg-flow-box">
                <div className="intg-flow-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M12 11V7" />
                    <circle cx="12" cy="5" r="2" />
                  </svg>
                </div>
                <h3>Secure Layer</h3>
                <p>FHIR-compliant API</p>
              </div>

              <div className="intg-flow-arrow">→</div>

              <div className="intg-flow-box">
                <div className="intg-flow-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                    <polyline points="7.5 19.79 7.5 14.6 3 12" />
                    <polyline points="21 12 16.5 14.6 16.5 19.79" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <h3>Diagnosense AI</h3>
                <p>Intelligence engine</p>
              </div>

              <div className="intg-flow-arrow">→</div>

              <div className="intg-flow-box">
                <div className="intg-flow-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h3>Clinical Insights</h3>
                <p>Actionable guidance</p>
              </div>
            </div>
          </div>
        </section>

        {/* Integrated Data Overview */}
        <section>
          <div className="intg-container">
            <div className="intg-section-header">
              <h2>Integrated Data Overview</h2>
              <p>Seamlessly access the clinical data you need, when you need it</p>
            </div>

            <div className="intg-data-grid">
              <div className="intg-data-card">
                <div className="intg-data-card-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3>Demographics</h3>
                <p>Patient identity, contact information, and basic demographic data</p>
              </div>

              <div className="intg-data-card">
                <div className="intg-data-card-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2v20M2 12h20" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <h3>Medical History</h3>
                <p>Past diagnoses, procedures, and chronic conditions</p>
              </div>

              <div className="intg-data-card">
                <div className="intg-data-card-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 3h18v18H3z" />
                    <path d="M7 8h10M7 12h10M7 16h10" />
                  </svg>
                </div>
                <h3>Labs & Vitals</h3>
                <p>Blood work, test results, vital signs, and trends</p>
              </div>

              <div className="intg-data-card">
                <div className="intg-data-card-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                    <line x1="9" y1="15" x2="9.01" y2="15" />
                    <line x1="15" y1="15" x2="15.01" y2="15" />
                  </svg>
                </div>
                <h3>Medications</h3>
                <p>Current prescriptions, dosages, and medication history</p>
              </div>

              <div className="intg-data-card">
                <div className="intg-data-card-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <h3>Imaging Summaries</h3>
                <p>Radiology reports and diagnostic imaging results</p>
              </div>

              <div className="intg-data-card">
                <div className="intg-data-card-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h3>Allergies</h3>
                <p>Known allergies and adverse reactions</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Compliance */}
        <section style={{ background: 'var(--bg-white)' }}>
          <div className="intg-container">
            <div className="intg-section-header">
              <h2>Security & Compliance</h2>
              <p>Enterprise-grade protection for your most sensitive data</p>
            </div>

            <div className="intg-security-grid">
              <div className="intg-security-card">
                <div className="intg-security-card-header">
                  <div className="intg-security-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <h3>HIPAA Compliant</h3>
                </div>
                <p>Full compliance with HIPAA regulations. All data transmission and storage meet federal healthcare privacy standards.</p>
              </div>

              <div className="intg-security-card">
                <div className="intg-security-card-header">
                  <div className="intg-security-icon">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h3>Role-Based Access</h3>
                </div>
                <p>Granular permissions ensure users only access data relevant to their role and responsibilities within your organization.</p>
              </div>

              <div className="intg-security-card">
                <div className="intg-security-card-header">
                  <div className="intg-security-icon">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </div>
                  <h3>Read-Only by Default</h3>
                </div>
                <p>Diagnosense operates in read-only mode to ensure data integrity. We never modify your source records without explicit authorization.</p>
              </div>

              <div className="intg-security-card">
                <div className="intg-security-card-header">
                  <div className="intg-security-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <h3>No External Storage</h3>
                </div>
                <p>Clinical data remains in your EHR. Diagnosense processes insights in real-time without storing patient information externally.</p>
              </div>
            </div>

            <div className="intg-trust-banner">
              <h3>Clinical Intelligence Layer, Not a Data Repository</h3>
              <p>Diagnosense acts as a clinical intelligence layer, not a data repository. Your data stays exactly where it belongs—secure in your infrastructure.</p>
            </div>
          </div>
        </section>

        {/* Authenticated Sections */}
        {isAuthenticated && (
          <>
            {/* Integration Status */}
            <section className="intg-auth-section intg-visible" id="statusSection">
              <div className="intg-container">
                <div className="intg-status-dashboard">
                  <div className="intg-status-header">
                    <h2>Integration Status</h2>
                    <span className="intg-status-badge intg-connected">
                      <span className="intg-status-dot"></span>
                      Connected
                    </span>
                  </div>

                  <div className="intg-status-grid">
                    <div className="intg-status-item">
                      <div className="intg-status-item-label">Last Sync</div>
                      <div className="intg-status-item-value intg-small">2 minutes ago</div>
                    </div>

                    <div className="intg-status-item">
                      <div className="intg-status-item-label">Connected System</div>
                      <div className="intg-status-item-value intg-small">Epic EHR v2024</div>
                    </div>

                    <div className="intg-status-item">
                      <div className="intg-status-item-label">Integration Standard</div>
                      <div className="intg-status-item-value intg-small">FHIR R4</div>
                    </div>

                    <div className="intg-status-item">
                      <div className="intg-status-item-label">Data Categories</div>
                      <div className="intg-status-item-value">6 Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Integration Settings */}
            <section className="intg-auth-section intg-visible" id="settingsSection" style={{ background: 'var(--bg-white)' }}>
              <div className="intg-container">
                <div className="intg-settings-panel">
                  <h3>Integration Settings</h3>

                  <div className="intg-setting-row">
                    <div className="intg-setting-info">
                      <h4>Enable Integration</h4>
                      <p>Allow Diagnosense to access clinical data from your EHR</p>
                    </div>
                    <label className="intg-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="intg-toggle-slider"></span>
                    </label>
                  </div>

                  <div className="intg-setting-row">
                    <div className="intg-setting-info">
                      <h4>Sync Mode</h4>
                      <p>Choose how frequently data syncs with your EHR</p>
                    </div>
                    <div className="intg-select-wrapper">
                      <select>
                        <option>Real-time</option>
                        <option>Every 5 minutes</option>
                        <option>Every 15 minutes</option>
                        <option>Hourly</option>
                      </select>
                    </div>
                  </div>

                  <div className="intg-setting-row">
                    <div className="intg-setting-info">
                      <h4>Data Categories</h4>
                      <p>Select which data types to integrate</p>
                    </div>
                    <div className="intg-select-wrapper">
                      <select multiple style={{ height: 'auto', padding: '0.5rem' }} defaultValue={["Demographics", "Medical History", "Labs & Vitals", "Medications", "Imaging", "Allergies"]}>
                        <option value="Demographics">Demographics</option>
                        <option value="Medical History">Medical History</option>
                        <option value="Labs & Vitals">Labs & Vitals</option>
                        <option value="Medications">Medications</option>
                        <option value="Imaging">Imaging</option>
                        <option value="Allergies">Allergies</option>
                      </select>
                    </div>
                  </div>

                  <div className="intg-setting-row">
                    <div className="intg-setting-info">
                      <h4>Permission Scope</h4>
                      <p>Define access level for Diagnosense</p>
                    </div>
                    <div className="intg-select-wrapper">
                      <select>
                        <option>Read-only (Recommended)</option>
                        <option>Read and Alert</option>
                        <option>Full Access</option>
                      </select>
                    </div>
                  </div>

                  <div className="intg-setting-row">
                    <div className="intg-setting-info">
                      <h4>Test Connection</h4>
                      <p>Verify integration is functioning correctly</p>
                    </div>
                    <button
                      className="intg-btn-secondary"
                      style={{
                        margin: 0,
                        background: testStatus === 'Test Successful ✓' ? 'var(--success-green)' : '',
                        color: testStatus === 'Test Successful ✓' ? 'white' : '',
                        borderColor: testStatus === 'Test Successful ✓' ? 'var(--success-green)' : ''
                      }}
                      onClick={handleRunTest}
                      disabled={testStatus === 'Testing...'}
                    >
                      {testStatus}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Monitoring & Logs */}
            <section className="intg-auth-section intg-visible" id="monitoringSection">
              <div className="intg-container">
                <div className="intg-section-header">
                  <h2>Monitoring & Activity</h2>
                  <p>Real-time insights into your integration performance</p>
                </div>

                <div className="intg-monitoring-grid">
                  <div className="intg-monitor-card">
                    <h4>API Activity (Last 24h)</h4>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Total Requests</span>
                      <span className="intg-monitor-stat-value">12,847</span>
                    </div>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Successful</span>
                      <span className="intg-monitor-stat-value intg-success">12,832</span>
                    </div>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Failed</span>
                      <span className="intg-monitor-stat-value intg-error">15</span>
                    </div>
                  </div>

                  <div className="intg-monitor-card">
                    <h4>Performance Metrics</h4>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Avg Response Time</span>
                      <span className="intg-monitor-stat-value intg-success">127ms</span>
                    </div>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Uptime (30d)</span>
                      <span className="intg-monitor-stat-value intg-success">99.97%</span>
                    </div>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Data Freshness</span>
                      <span className="intg-monitor-stat-value intg-success">&lt; 2 min</span>
                    </div>
                  </div>

                  <div className="intg-monitor-card">
                    <h4>Sync Summary</h4>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Records Synced</span>
                      <span className="intg-monitor-stat-value">2,483</span>
                    </div>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Last Error</span>
                      <span className="intg-monitor-stat-value intg-warning">3 hours ago</span>
                    </div>
                    <div className="intg-monitor-stat">
                      <span className="intg-monitor-stat-label">Queue Size</span>
                      <span className="intg-monitor-stat-value intg-success">0</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '2.5rem' }}>
                  <div className="intg-settings-panel">
                    <h3>Recent Activity Logs</h3>
                    <div className="intg-log-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Event</th>
                            <th>Status</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="intg-log-timestamp">2025-02-05 14:32:18</td>
                            <td>Data Sync Completed</td>
                            <td><span className="intg-log-status intg-success">Success</span></td>
                            <td>847 records updated</td>
                          </tr>
                          <tr>
                            <td className="intg-log-timestamp">2025-02-05 14:27:05</td>
                            <td>API Request</td>
                            <td><span className="intg-log-status intg-success">Success</span></td>
                            <td>Patient demographics query</td>
                          </tr>
                          <tr>
                            <td className="intg-log-timestamp">2025-02-05 11:15:42</td>
                            <td>Connection Test</td>
                            <td><span className="intg-log-status intg-success">Success</span></td>
                            <td>Manual test by admin</td>
                          </tr>
                          <tr>
                            <td className="intg-log-timestamp">2025-02-05 08:53:21</td>
                            <td>Sync Error</td>
                            <td><span className="intg-log-status intg-error">Error</span></td>
                            <td>Timeout on lab results</td>
                          </tr>
                          <tr>
                            <td className="intg-log-timestamp">2025-02-05 08:30:10</td>
                            <td>Data Sync Completed</td>
                            <td><span className="intg-log-status intg-success">Success</span></td>
                            <td>1,124 records updated</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default Integration;
