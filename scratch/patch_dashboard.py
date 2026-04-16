import re
import os

with open(r'f:\React\DiagnoSense\src\components\Dashboard.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update QueueSection Loading UI
new_queue_loading = """  if (loadingQueue) {
    return (
      <div className="preview-shimmer" style={{ width: '100%', borderRadius: '14px', pointerEvents: 'none', display: 'block' }}>
        <div className="dsn-queue-panel">
          <div className="dsn-queue-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="20" height="20" fill="none" stroke="#FF4D6D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Critical Patient Queue
            </div>
            <span className="dsn-queue-count" style={{color: '#64748b', fontSize: '13px', fontWeight: 600}}>4 remaining</span>
          </div>
          <div className="dsn-active-card">
            <div className="dsn-active-header">
              <div className="dsn-active-avatar" style={{ background: "#FF4D6D" }}>MH</div>
              <div className="dsn-active-info">
                <h3>Mahmoud Hassan</h3>
                <div className="dsn-active-meta">45 Years • Male</div>
              </div>
              <div className="dsn-active-status" style={{ background: "rgba(255, 77, 109, 0.15)", color: "#FF4D6D" }}>
                <span className="dsn-status-dot" style={{ background: "#FF4D6D" }}></span> Now
              </div>
            </div>
            <DashboardQueueInsight text="Extensive dummy insight text detailing symptoms and diagnostic recommendations." />
            <div className="dsn-active-actions">
              <button className="dsn-btn-view">View Details →</button>
              <button className="dsn-btn-done">Mark Attended</button>
            </div>
          </div>
          <div className="dsn-waiting-list" style={{ marginTop: '16px' }}>
            {[1, 2, 3].map((g, i) => (
              <div key={i} className="dsn-wait-card">
                <div className="dsn-wait-time">10:30 AM</div>
                <div className="dsn-wait-avatar" style={{ background: "#4C6EF5" }}>N</div>
                <div className="dsn-wait-name">Nada Ali</div>
                <div className="dsn-wait-status">Waiting</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }"""

code = re.sub(r'if \(loadingQueue\) \{.*?return \(\s*<div className="dsn-queue-panel">.*?</div>\s*\);\s*\}', new_queue_loading, code, flags=re.DOTALL)


# 2. Main Dashboard Replacement
dummy_top_wrapper = """          {loading ? (
            <div className="preview-shimmer" style={{ width: '100%', borderRadius: '24px', pointerEvents: 'none', display: 'block' }}>
              <div className="dsn-top-wrapper" style={{ pointerEvents: 'none' }}>
                <div className="dsn-greeting">
                  <h1>Welcome, Dr. Tareq Ahmed</h1>
                  <p>Here's a summary of today's key AI insights and patient status.</p>
                </div>
                <div className="dsn-stats-grid">
                  {[
                    { label: "Total Registered Patients", val: 450, color: "#3B5BDB", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
                    { label: "Today's Appointments", val: 12, color: "#3B5BDB", icon: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" },
                    { label: "Reports Analyzed", val: 38, color: "#2F9E44", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" },
                  ].map((item, idx) => (
                    <div className="dsn-stat-card" key={idx}>
                      <div className="dsn-stat-label">
                        <svg viewBox="0 0 24 24" fill={item.color} style={{ width: "20px" }}><path d={item.icon} /></svg>
                        <strong>{item.label}</strong>
                      </div>
                      <div><span className="dsn-stat-value">{item.val}</span></div>
                    </div>
                  ))}
                  <div className="dsn-stat-card dsn-stat-card--growth">
                    <div className="dsn-stat-label dsn-stat-label--primary">
                      <svg viewBox="0 0 24 24" fill="var(--dsn-primary)" style={{ width: "20px" }}><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                      <strong>Monthly Patient Growth</strong>
                    </div>
                    <div className="dsn-growth-grid">
                      {[
                        { sub: "Last Mo.", valPath: 410 },
                        { sub: "This Mo.", valPath: 450, className: "dsn-growth-val--primary" },
                        { sub: "Diff.", valPath: "+40", className: "dsn-growth-val--success" },
                        { sub: "Growth", valPath: "↑9.7%", className: "dsn-growth-val--success" },
                      ].map((g, i) => (
                        <div className="dsn-growth-col" key={i}>
                          <div className="dsn-growth-sub">{g.sub}</div>
                          <div className={`dsn-growth-val ${g.className || ""}`}>{g.valPath}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dsn-charts-row" style={{ marginTop: '24px', pointerEvents: 'none' }}>
                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Patient Status Distribution</div>
                  <div className="dsn-donut-wrap" style={{ position: "relative" }}>
                    <svg width="140" height="140" viewBox="0 0 130 130" className="dsn-donut-svg">
                      {(() => {
                        const radius = 50; const circumference = 2 * Math.PI * radius; let cumulativePercentage = 0;
                        const statusColors = { critical: "#FF4D6D", stable: "#06D6A0", "under review": "#FF8C42" };
                        const dummyData = [
                          { status: "critical", percentage: 33 },
                          { status: "stable", percentage: 33 },
                          { status: "under review", percentage: 34 },
                        ];
                        return dummyData.map((item, index) => {
                          const strokeLength = (item.percentage / 100) * circumference;
                          const offset = (cumulativePercentage / 100) * circumference;
                          cumulativePercentage += item.percentage;
                          return (
                            <circle key={index} cx="65" cy="65" r={radius} fill="none" stroke={statusColors[item.status]} strokeWidth="22" strokeDasharray={`${strokeLength + 0.5} ${circumference}`} strokeLinecap="round" strokeDashoffset={-offset} transform="rotate(-90 65 65)" className="dsn-donut-segment" />
                          );
                        });
                      })()}
                      <circle cx="65" cy="65" r="39" fill="white" />
                      <text x="65" y="61" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A1D2E" fontFamily="'Inter', sans-serif">450</text>
                      <text x="65" y="76" textAnchor="middle" fontSize="10" fill="#8C91A7" fontFamily="'Inter', sans-serif">patients</text>
                    </svg>
                    <div className="dsn-legend-list">
                      {[
                        { status: "critical", percentage: 33, color: "#FF4D6D", bg: "#FFF0F3" },
                        { status: "stable", percentage: 33, color: "#06D6A0", bg: "#E6FAF5" },
                        { status: "under review", percentage: 34, color: "#FF8C42", bg: "#FFF5ED" },
                      ].map((item, index) => (
                        <div key={index} className="dsn-legend-row" style={{ background: item.bg }}>
                          <div className="dsn-legend-dot" style={{ background: item.color }} />
                          <span className="dsn-legend-label">{item.status}</span>
                          <span className="dsn-legend-pct" style={{ color: item.color }}>{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Top 5 Chronic Diseases</div>
                  <div className="dsn-chart-subtitle">Selected by doctor in medical forms</div>
                  <div className="dsn-bar-chart-wrap">
                    <div className="dsn-bar-columns">
                      {(() => {
                        const barColors = [
                          "linear-gradient(180deg,#4361EE,#748FFC)",
                          "linear-gradient(180deg,#06D6A0,#3DCFB4)",
                          "linear-gradient(180deg,#FF8C42,#FFA96B)",
                          "linear-gradient(180deg,#FF4D6D,#FF7A93)",
                          "linear-gradient(180deg,#9B5DE5,#BB8AEE)",
                        ];
                        const dummyData = [
                          { label: "Hypertension", value: 120 },
                          { label: "Diabetes Type II", value: 95 },
                          { label: "Asthma", value: 80 },
                          { label: "Osteoarthritis", value: 65 },
                          { label: "Anemia", value: 40 },
                        ];
                        const maxVal = 120;
                        const maxHeight = 160;
                        return dummyData.map((item, i) => (
                          <div className="dsn-bar-col" key={i}>
                            <span className="dsn-bar-val">{item.value}</span>
                            <div className="dsn-bar-fill" style={{ background: barColors[i], height: `${(item.value / maxVal) * maxHeight}px` }} />
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="dsn-bar-labels">
                      {["Hypertension", "Diabetes Type II", "Asthma", "Osteoarthritis", "Anemia"].map((label, i) => (
                        <div key={i} className="dsn-bar-lbl" style={{ whiteSpace: "pre-line", textTransform: "capitalize" }}>{label}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : ("""

# Replace old top wrapper up to end of charts row
code = re.sub(r'<div className="dsn-top-wrapper">.*?{/\*\s*── QUEUE MANAGEMENT ──\s*\*/}', dummy_top_wrapper + r"""
            <div className="dsn-top-wrapper-real-container" style={{ display: 'contents' }}>
              <div className="dsn-top-wrapper">
                <div className="dsn-greeting">
                  <h1>Welcome, Dr. {data?.doctor_name || "User"}</h1>
                  <p>Here's a summary of today's key AI insights and patient status.</p>
                </div>
                <div className="dsn-stats-grid">
                  {[
                    { label: "Total Registered Patients", val: data?.widgets.total_patients, color: "#3B5BDB", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" },
                    { label: "Today's Appointments", val: data?.widgets.today_appointments, color: "#3B5BDB", icon: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" },
                    { label: "Reports Analyzed", val: data?.widgets.reports_analyzed, color: "#2F9E44", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" },
                  ].map((item, idx) => (
                    <div className="dsn-stat-card" key={idx}>
                      <div className="dsn-stat-label">
                        <svg viewBox="0 0 24 24" fill={item.color} style={{ width: "20px" }}><path d={item.icon} /></svg>
                        <strong>{item.label}</strong>
                      </div>
                      <div>
                        <span className="dsn-stat-value">{item.val ?? 0}</span>
                      </div>
                    </div>
                  ))}
                  <div className="dsn-stat-card dsn-stat-card--growth">
                    <div className="dsn-stat-label dsn-stat-label--primary">
                      <svg viewBox="0 0 24 24" fill="var(--dsn-primary)" style={{ width: "20px" }}><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                      <strong>Monthly Patient Growth</strong>
                    </div>
                    <div className="dsn-growth-grid">
                      {[
                        { sub: "Last Mo.", valPath: data?.widgets.monthly_growth.details.last_month },
                        { sub: "This Mo.", valPath: data?.widgets.monthly_growth.details.this_month, className: "dsn-growth-val--primary" },
                        { sub: "Diff.", valPath: data?.widgets.monthly_growth.details.difference },
                        { sub: "Growth", valPath: data?.widgets.monthly_growth.details.growth_rate },
                      ].map((g, i) => (
                        <div className="dsn-growth-col" key={i}>
                          <div className="dsn-growth-sub">{g.sub}</div>
                          <div
                            className={`dsn-growth-val ${g.className || ""} ${
                              g.sub === "Diff."
                                ? g.valPath?.toString().startsWith("-")
                                  ? "dsn-growth-val--danger"
                                  : "dsn-growth-val--success"
                                : ""
                            } ${
                              g.sub === "Growth"
                                ? data?.widgets.monthly_growth.details.trend === "up"
                                  ? "dsn-growth-val--success"
                                  : "dsn-growth-val--danger"
                                : ""
                            }`}
                          >
                            {g.sub === "Growth"
                              ? `${data?.widgets.monthly_growth.details.trend === "up" ? "↑" : "↓"}${g.valPath}`
                              : (g.valPath ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dsn-charts-row">
                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Patient Status Distribution</div>
                  <div className="dsn-donut-wrap" style={{ position: "relative" }}>
                    <svg width="140" height="140" viewBox="0 0 130 130" className="dsn-donut-svg">
                      {(() => {
                        const radius = 50; const circumference = 2 * Math.PI * radius; let cumulativePercentage = 0;
                        const statusColors = { critical: "#FF4D6D", stable: "#06D6A0", "under review": "#FF8C42" };
                        const displayData = statusDistribution?.pie_chart_data || [];
                        return displayData.map((item, index) => {
                          const strokeLength = (item.percentage / 100) * circumference;
                          const offset = (cumulativePercentage / 100) * circumference;
                          cumulativePercentage += item.percentage;
                          return (
                            <circle
                              key={index}
                              cx="65" cy="65" r={radius} fill="none"
                              stroke={statusColors[item.status] || "#ccc"}
                              strokeWidth="22"
                              strokeDasharray={`${strokeLength + 0.5} ${circumference}`}
                              strokeLinecap="round" strokeDashoffset={-offset} transform="rotate(-90 65 65)" className="dsn-donut-segment"
                              onMouseEnter={() => setHoveredStatus(item)}
                              onMouseMove={(e) => setTooltipPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                              onMouseLeave={() => setHoveredStatus(null)}
                              style={{ transition: "all 0.3s ease", cursor: "pointer", opacity: hoveredStatus && hoveredStatus.status !== item.status ? 0.6 : 1 }}
                            />
                          );
                        });
                      })()}
                      <circle cx="65" cy="65" r="39" fill="white" />
                      <text x="65" y="61" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1A1D2E" fontFamily="'Inter', sans-serif">
                        {statusDistribution?.total_registered_patients || 0}
                      </text>
                      <text x="65" y="76" textAnchor="middle" fontSize="10" fill="#8C91A7" fontFamily="'Inter', sans-serif">patients</text>
                    </svg>
                    {hoveredStatus && (
                      <div className="dsn-custom-tooltip" style={{ position: "absolute", left: tooltipPos.x + 15, top: tooltipPos.y - 10, pointerEvents: "none", zIndex: 100 }}>
                        <div className="tooltip-status" style={{ textTransform: "capitalize" }}><strong>{hoveredStatus.status}</strong></div>
                        <div className="tooltip-value">{hoveredStatus.value} Patients ({hoveredStatus.percentage}%)</div>
                      </div>
                    )}
                    <div className="dsn-legend-list">
                      {(statusDistribution?.pie_chart_data || []).map((item, index) => {
                        const config = { critical: { color: "#FF4D6D", bg: "#FFF0F3" }, stable: { color: "#06D6A0", bg: "#E6FAF5" }, "under review": { color: "#FF8C42", bg: "#FFF5ED" } };
                        const style = config[item.status] || { color: "#ccc", bg: "#f5f5f5" };
                        return (
                          <div key={index} className="dsn-legend-row" style={{ background: style.bg }}>
                            <div className="dsn-legend-dot" style={{ background: style.color }} />
                            <span className="dsn-legend-label">{item.status}</span>
                            <span className="dsn-legend-pct" style={{ color: style.color }}>{`${item.percentage}%`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="dsn-chart-card">
                  <div className="dsn-chart-title">Top 5 Chronic Diseases</div>
                  <div className="dsn-chart-subtitle">Selected by doctor in medical forms</div>
                  <div className="dsn-bar-chart-wrap">
                    <div className="dsn-bar-columns">
                      {(() => {
                        const barColors = [
                          "linear-gradient(180deg,#4361EE,#748FFC)", "linear-gradient(180deg,#06D6A0,#3DCFB4)", "linear-gradient(180deg,#FF8C42,#FFA96B)", "linear-gradient(180deg,#FF4D6D,#FF7A93)", "linear-gradient(180deg,#9B5DE5,#BB8AEE)",
                        ];
                        const displayData = TopDiseases || [];
                        const maxVal = Math.max(...(displayData.map((d) => d.value) || [1]));
                        const maxHeight = 160;
                        return displayData.map((item, i) => (
                          <div className="dsn-bar-col" key={i}>
                            <span className="dsn-bar-val">{item.value}</span>
                            <div className="dsn-bar-fill" style={{ background: barColors[i % barColors.length], height: `${(item.value / maxVal) * maxHeight}px`, transition: "height 0.5s ease" }} />
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="dsn-bar-labels">
                      {(TopDiseases || []).map((item, i) => (
                        <div key={i} className="dsn-bar-lbl" style={{ whiteSpace: "pre-line", textTransform: "capitalize" }}>{item.label}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

          {/* ── QUEUE MANAGEMENT ── */}""", code, flags=re.DOTALL)

with open(r'f:\React\DiagnoSense\src\components\Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
