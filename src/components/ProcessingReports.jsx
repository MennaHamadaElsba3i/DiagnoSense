import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPatientKeyInfoAPI } from './mockAPI.js';
import '../css/ProcessingReports.css';

const INSIGHT_MESSAGES = [
  "Over 2.6 million diagnostic errors happen yearly due to missed patient data.",
  "Poorly organized patient records cost healthcare systems billions annually.",
  "DiagnoSense reduces manual chart review time by up to 60% per patient.",
  "Save time to create 20% more usable clinical hours without extra work.",
  "Faster chart review can safely increase patient capacity by up to 25%.",
  "Stop searching through scattered reports. See the most critical findings first.",
  "Key medications, risks, and abnormal trends are instantly highlighted for you.",
  "Instantly verify any highlighted insight using the built-in View Evidence tool.",
  "Comparative Analysis maps out long-term lab results in one clear timeline.",
  "Easily track patient progress to see if their treatment plan needs adjustment.",
  "Decision Support suggests alternative diagnoses based on complex medical history.",
  "Unclear details? Ask DiagnoBot to find answers directly from the patient's records.",
  "Structured insights reduce the risk of missing hidden but critical details.",
  "Instant access to organized patient history improves diagnostic confidence.",
  "Diagnose faster and with more confidence by focusing on what matters most."
];

export default function ProcessingReports({
  patientId: propsPatientId,
  token: propsToken,
  onSuccess,
  onFailure,
  onStop,
}) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const pollingRef = useRef(null);
  const messageIntervalRef = useRef(null);
  const hasNavigated = useRef(false);
  const svgRef = useRef(null);           // anchor for animation-sync reset on mount

  const [messageIndex, setMessageIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState('pr-fade-in');
  const [progressWidth, setProgressWidth] = useState(2);
  const [stepStates, setStepStates] = useState([false, false, false]);

  // Timeline for staged progress bar and checklist
  useEffect(() => {
    let t = 0;
    const progressInterval = setInterval(() => {
      if (hasNavigated.current) {
        clearInterval(progressInterval);
        return;
      }
      t += 1;
      
      if (t === 1) setProgressWidth(18);
      if (t === 2) {
        setProgressWidth(32);
        setStepStates([true, false, false]);
      }
      if (t === 3) setProgressWidth(45);
      if (t === 4) setProgressWidth(55);
      if (t === 5) {
        setProgressWidth(68);
        setStepStates([true, true, false]);
      }
      if (t === 6) setProgressWidth(76);
      if (t === 8) setProgressWidth(82);
      if (t === 10) setProgressWidth(85);
      if (t === 12) setProgressWidth(88);
      
      if (t > 12 && t % 3 === 0) {
        setProgressWidth(prev => Math.min(prev + 1, 95));
      }
    }, 1000);
    
    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    messageIntervalRef.current = setInterval(() => {
      if (hasNavigated.current) {
        clearInterval(messageIntervalRef.current);
        return;
      }
      setFadeClass('pr-fade-out');
      setTimeout(() => {
        if (!hasNavigated.current) {
          setMessageIndex((prev) => (prev + 1) % INSIGHT_MESSAGES.length);
          setFadeClass('pr-fade-in');
        }
      }, 300);
    }, 6000);

    return () => clearInterval(messageIntervalRef.current);
  }, []);

  useEffect(() => {
    const patientId = propsPatientId || state?.patientId;
    const token = propsToken || state?.token;

    if (!patientId || !token) {
      console.warn('ProcessingReports: missing patientId or token', { patientId, token, state });
      return;
    }

    pollingRef.current = setInterval(async () => {
      const result = await getPatientKeyInfoAPI(patientId, token);

      if (result?.success && result?.data && !hasNavigated.current) {
        hasNavigated.current = true;
        clearInterval(pollingRef.current);
        clearInterval(messageIntervalRef.current);

        // Visually complete the final steps before navigating
        setProgressWidth(100);
        setStepStates([true, true, true]);

        setTimeout(() => {
          if (onSuccess) {
            onSuccess(result.data);
          } else {
            navigate(`/patient-profile/${patientId}`, {
              state: { keyInfoData: result.data, patientId },
            });
          }
        }, 700);
      } else if (result?.success === false) {
        if (result.message === 'AI analysis is processing now') {
          // keep polling
        } else if (result.message && result.message.toLowerCase().includes('processing')) {
          // keep polling
        } else if (
          result.message &&
          result.message.toLowerCase().includes('failed') &&
          result.message.toLowerCase().includes('no information')
        ) {
          clearInterval(pollingRef.current);
          clearInterval(messageIntervalRef.current);
          if (onFailure) {
            onFailure(result.message);
          } else {
            navigate(-1, { state: { error: result.message || 'AI Analysis failed' } });
          }
        } else {
          clearInterval(pollingRef.current);
          clearInterval(messageIntervalRef.current);
          if (onFailure) {
            onFailure(result.message);
          } else {
            navigate(-1, { state: { error: result.message || 'AI Analysis failed' } });
          }
        }
      }
    }, 4000);

    return () => clearInterval(pollingRef.current);
  }, []);

  // Guarantee that both the SVG rotation and the stream rect restart
  // from exactly 0% on every fresh mount, regardless of the document
  // clock offset.  Without this, CSS animations start at
  // (documentTime mod duration) which can be mid-cycle on the first
  // render.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const stream = svg.querySelector('.pr-sand-stream-rect');
    const targets = [svg, stream].filter(Boolean);

    // Clear animation names on both elements simultaneously.
    targets.forEach(el => { el.style.animationName = 'none'; });

    // Single reflow commits the cleared state to the browser before
    // we restore, so both animations restart from t=0 together.
    void svg.offsetHeight;

    // Restore — browser re-reads the class-based animation-name and
    // starts both animations from 0% at this exact paint frame.
    targets.forEach(el => { el.style.animationName = ''; });

    // Reset SMIL timeline to perfectly sync sand levels with CSS rotation
    if (svg.setCurrentTime) {
      svg.setCurrentTime(0);
    }
  }, []);

  const handleStop = () => {
    clearInterval(pollingRef.current);
    clearInterval(messageIntervalRef.current);
    hasNavigated.current = true;
    if (onStop) {
      onStop();
    } else {
      navigate(-1);
    }
  };

  /*
    ══════════════════════════════════════════════════════════════════
    HOURGLASS — True continuous rotating system
    ══════════════════════════════════════════════════════════════════

    CORE CONCEPT
    ─────────────────────────────────────────────────────────────────
    The hourglass rotates 360° over 8 seconds.

    This is modelled as TWO naturally-linked half-cycles:

      Phase 1 (t = 0s → 4s, rotation 0° → 180°):
        Chamber A is physically above  → source (drains)
        Chamber B is physically below  → destination (fills)

      Phase 2 (t = 4s → 8s, rotation 180° → 360°/0°):
        Chamber B is now physically above → source (drains)
        Chamber A is now physically below → destination (fills)

      At t=8s the cycle repeats identically.

    There is NO fake crossfade, NO opacity snap, NO reset.
    The two half-cycles are the complementary mirror of each other.
    The sum of sand in both chambers is always constant = 39 SVG units.

    THE ANIMATION MECHANISM — SVG SMIL on clipPath rects
    ─────────────────────────────────────────────────────────────────
    Each chamber has two stacked clips:
      Outer clip  — static chamber wall shape (curved bezier path)
      Inner clip  — animated rectangular level mask (SMIL <animate>)

    Sand is only visible where BOTH clips agree → always inside glass.

    SVG coordinate space (viewBox 0 0 80 100):
      Chamber A interior: y = 11 (top cap underside) → y = 50 (waist)
        Height = 39 SVG units
      Chamber B interior: y = 50 (waist) → y = 89 (bottom cap topside)
        Height = 39 SVG units

    CHAMBER A LEVEL CLIP  (pr-clip-a-level)
    ─────────────────────────────────────────────────────────────────
    clipRect: x=8, y=11 (fixed), width=64

      height animates: 39 → 0 → 39  over 8s

      Phase 1 (0 → 0.5): height 39 → 0
        Visible area: y=11 to y=(11+height)
        Bottom edge (sand free-surface): rises from y=50 toward y=11
        → upper sand drains; free surface ascends toward the cap ✓

      Phase 2 (0.5 → 1): height 0 → 39
        Visible area: y=11 to y=(11+height)
        Bottom edge descends from y=11 back toward y=50
        At this point the SVG has rotated past 180° so A is now below.
        The sand fills from the physical bottom (y=11, cap) upward
        toward the waist (y=50), which is physically above it ✓

      At 50%: height = 0 → nothing visible → any coord snap is invisible ✓
      At 100%/0%: same height=39 → perfectly continuous loop ✓

    CHAMBER B LEVEL CLIP  (pr-clip-b-level)
    ─────────────────────────────────────────────────────────────────
    clipRect: x=8, width=64
    BOTH y AND height animate simultaneously so that y + height = 89
    is always constant (bottom edge stays fixed at y=89 cap).

      Phase 1 (0 → 0.5): y 89 → 50,  height 0 → 39
        Bottom edge = y+height = 89 (constant, cap end) ✓
        Top edge (y) rises from y=89 (nothing) toward y=50 (full)
        → B fills from the cap upward toward the waist ✓
        Physics: sand falls from waist, accumulates at physical bottom (y=89)

      Phase 2 (0.5 → 1): y 50 → 89,  height 39 → 0
        Bottom edge = y+height = 89 (constant) ✓
        Top edge (y) descends from y=50 (full) toward y=89 (empty)
        → B drains; sand nearest the waist (y=50) exits first;
           sand at y=89 (physical top) is last to fall ✓
        Physics: hourglass inverted, B is above, sand flows through waist

      At 50%: height = 39 (full), y = 50 — valid full state ✓
      At 100%/0%: y=89, height=0 → nothing visible → invisible snap ✓

    IMPORTANT: At exactly 0% and 100%, A=full (h=39) and B=empty (h=0).
               At exactly 50%, A=empty (h=0) and B=full (h=39).
               The two chambers are always summing to 39 SVG units total.
               No reset. No fake. Just two complementary triangles in time.

    EASING  (calcMode="spline", keySplines ease-in-out per segment)
    ─────────────────────────────────────────────────────────────────
    Sand starts draining slowly (settling after rotation), accelerates
    through the middle, then trickles at the end (last grains).
    Cubic bezier "0.42 0 0.58 1" on each segment gives this profile.

    STREAM
    ─────────────────────────────────────────────────────────────────
    Since one chamber always drains, the stream is always active.
    CSS opacity animation creates a brief gap at each cycle boundary
    (the ~0.5s settling moment right after each 180° flip).

    ROTATION SYNC
    ─────────────────────────────────────────────────────────────────
    CSS rotation: 8s linear (-42° to 318°) → matches SMIL 8s exactly.
    Both start at page load (t=0). 
    At t=0, rotation is -42°, A is the top chamber and begins draining.
    At t=4s (50%), rotation is 138°, B is the top chamber and begins draining.
    The SMIL animations reflect this offset: A drains during 0→50%, B drains
    during 50→100%. The start angle ensures the first visible frame is exactly
    at the start of the pouring window (-42°). ✓
    ══════════════════════════════════════════════════════════════════
  */

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="processing-reports-page">
        <div className="background-pattern"></div>

        <div className="ai-waves">
          <div className="wave"></div>
          <div className="wave"></div>
          <div className="wave"></div>
        </div>

        <div className="pr-particles" aria-hidden="true">
          <span className="pr-particle"></span>
          <span className="pr-particle"></span>
          <span className="pr-particle"></span>
          <span className="pr-particle"></span>
          <span className="pr-particle"></span>
          <span className="pr-particle"></span>
        </div>

        <div className="loading-container">

          <div className="hourglass-scene">
            <div className="hourglass-glow"></div>
            <div className="hourglass-ring"></div>

            {/*
              ══ Single rotating SVG — the entire hourglass ══
              Frame, clips, sand, stream — all inside this one SVG.
              CSS `pr-hg-rotate` (8s) spins the whole element.
              The SMIL sand animations also run at 8s, synced.
              Sand is geometrically inside the glass — cannot escape.
            */}
            <svg
              ref={svgRef}
              className="hourglass-svg"
              viewBox="0 0 80 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>

                {/* ── STATIC CHAMBER SHAPE CLIPS ──────────────────────────────
                    These trace the exact curved interior walls of each chamber.
                    Any sand rendered inside these clips is physically contained
                    by the glass walls — cannot spill outside the hourglass. */}

                {/* Upper chamber interior wall shape */}
                <clipPath id="pr-clip-upper-shape">
                  <path d="M 8,11 C 8,47 40,48 40,50 C 40,48 72,47 72,11 Z" />
                </clipPath>

                {/* Lower chamber interior wall shape */}
                <clipPath id="pr-clip-lower-shape">
                  <path d="M 8,89 C 8,53 40,52 40,50 C 40,52 72,53 72,89 Z" />
                </clipPath>

                {/* Stream throat — narrow band at the waist pinch point */}
                <clipPath id="pr-clip-stream">
                  <rect x="37" y="43" width="6" height="14" />
                </clipPath>

                {/* ── ANIMATED LEVEL CLIPS (SMIL) ─────────────────────────────
                    These rectangular clips control how much of each chamber's
                    sand rect is visible at any moment in time.
                    Combined with the shape clips above, sand is constrained by
                    BOTH the glass walls AND the current fill level. */}

                {/*
                  Chamber A level clip.
                  INVARIANT: y + height = 50 always (neck/waist is the fixed bottom anchor).

                  Both y (top edge) and height animate together to maintain this invariant:
                    bottom = y + height = (11+39·f) + (39·(1-f)) = 50  [phase 1 drain] ✓
                    bottom = y + height = (50-39·g) + (39·g)      = 50  [phase 2 fill]  ✓

                  Phase 1 (0→0.5 = A source, drain): y 11→50, height 39→0
                    The TOP edge (y = free surface) descends from cap (11) toward neck (50).
                    The BOTTOM edge (neck, 50) is fixed — sand always reaches the neck.
                    → Upper chamber empties; free surface drops toward the waist. ✓

                  Phase 2 (0.5→1 = A destination, fill): y 50→11, height 0→39
                    The BOTTOM edge stays at 50 (neck). The TOP edge ascends from neck
                    toward cap as the sand pile grows below the incoming stream.
                    → Sand arrives at neck, piles downward (physically) toward cap. ✓

                  Loop boundary (100%→0%): A is full (y=11, h=39) — seamless repeat. ✓
                */}
                <clipPath id="pr-clip-a-level">
                  <rect x="8" y="11" width="64" height="39">
                    <animate
                      attributeName="y"
                      values="11;50;11"
                      keyTimes="0;0.5;1"
                      dur="8s"
                      repeatCount="indefinite"
                      calcMode="spline"
                      keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
                    />
                    <animate
                      attributeName="height"
                      values="39;0;39"
                      keyTimes="0;0.5;1"
                      dur="8s"
                      repeatCount="indefinite"
                      calcMode="spline"
                      keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
                    />
                  </rect>
                </clipPath>

                {/*
                  Chamber B level clip.

                  Phase 1 (0→0.5 = B destination, fill): y=50 FIXED, height 0→39
                    The TOP edge is fixed at y=50 (the neck — where sand enters from above).
                    The BOTTOM edge grows from y=50 toward y=89 (sand piles below the neck).
                    → Sand arrives at neck, accumulates DOWNWARD into lower chamber. ✓
                    → No upward-from-cap growth. The pile origin is always the neck. ✓

                  Phase 2 (0.5→1 = B source, drain): y 50→89, height 39→0
                    INVARIANT: y + height = 89 (cap is the fixed bottom anchor during drain).
                      bottom = (50+39t) + (39-39t) = 89 ✓
                    The TOP edge (y) retreats from neck toward cap.
                    Sand near the neck (y=50) exits first; cap (y=89) is last. ✓

                  Transition at 50%: y=50, height=39 → full (fill end = drain start). ✓
                  Loop boundary (100%→0%): y snaps 89→50 but height=0 → invisible. ✓
                */}
                <clipPath id="pr-clip-b-level">
                  <rect x="8" y="50" width="64" height="0">
                    <animate
                      attributeName="y"
                      values="50;50;89"
                      keyTimes="0;0.5;1"
                      dur="8s"
                      repeatCount="indefinite"
                      calcMode="spline"
                      keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
                    />
                    <animate
                      attributeName="height"
                      values="0;39;0"
                      keyTimes="0;0.5;1"
                      dur="8s"
                      repeatCount="indefinite"
                      calcMode="spline"
                      keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
                    />
                  </rect>
                </clipPath>

                {/* ── GRADIENTS ────────────────────────────────────────────── */}

                {/* Chamber A sand: transparent at cap (y=11), DENSE at waist/neck (y=50).
                   Dense at neck = last visible sand always hugs the neck = clearly drains TOWARD neck. */}
                <linearGradient id="pr-grad-upper" x1="0" y1="0" x2="0" y2="1"
                  gradientUnits="objectBoundingBox">
                  <stop offset="0%"   stopColor="#7AA8FF" stopOpacity="0.08" />
                  <stop offset="40%"  stopColor="#4B82FF" stopOpacity="0.46" />
                  <stop offset="100%" stopColor="#2A66FF" stopOpacity="0.80" />
                </linearGradient>

                {/* Chamber B sand: DENSE at waist/neck (y=50), transparent at cap (y=89).
                   Dense at neck = FIRST visible sand hugs the neck = clearly arrives FROM neck. */}
                <linearGradient id="pr-grad-lower" x1="0" y1="0" x2="0" y2="1"
                  gradientUnits="objectBoundingBox">
                  <stop offset="0%"   stopColor="#2A66FF" stopOpacity="0.80" />
                  <stop offset="60%"  stopColor="#4B82FF" stopOpacity="0.46" />
                  <stop offset="100%" stopColor="#7AA8FF" stopOpacity="0.08" />
                </linearGradient>

              </defs>

              {/* ════════════════════════════════════════════════════════
                  SAND — rendered BELOW the glass frame
                  Double-clipped: chamber wall shape + animated level mask
                  ════════════════════════════════════════════════════════ */}

              {/* Chamber A sand */}
              <g clipPath="url(#pr-clip-upper-shape)">
                <g clipPath="url(#pr-clip-a-level)">
                  {/* Full-size rect covering chamber A — level clip controls visibility */}
                  <rect x="8" y="11" width="64" height="39" fill="url(#pr-grad-upper)" />
                </g>
              </g>

              {/* Chamber B sand */}
              <g clipPath="url(#pr-clip-lower-shape)">
                <g clipPath="url(#pr-clip-b-level)">
                  {/* Full-size rect covering chamber B — level clip controls visibility */}
                  <rect x="8" y="50" width="64" height="39" fill="url(#pr-grad-lower)" />
                </g>
              </g>

              {/* Falling stream — at the waist throat, always active, CSS-pulsed */}
              <g clipPath="url(#pr-clip-stream)">
                <rect
                  className="pr-sand-stream-rect"
                  x="38.5" y="43" width="3" height="14"
                  rx="1.5"
                  fill="#5090FF"
                  fillOpacity="0.65"
                />
              </g>

              {/* ════════════════════════════════════════════════════════
                  GLASS FRAME — rendered ABOVE sand (paints on top)
                  ════════════════════════════════════════════════════════ */}

              {/* Top cap */}
              <rect x="4" y="0" width="72" height="11" rx="5.5" fill="#2A66FF" />

              {/* Bottom cap */}
              <rect x="4" y="89" width="72" height="11" rx="5.5" fill="#2A66FF" />

              {/* Glass body — translucent fill + blue stroke */}
              <path
                d="
                  M 8,11
                  C 8,47   40,48  40,50
                  C 40,48  72,47  72,11
                  Z
                  M 8,89
                  C 8,53   40,52  40,50
                  C 40,52  72,53  72,89
                  Z
                "
                fill="rgba(42,102,255,0.04)"
                stroke="#2A66FF"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Inner glass highlight sheen — left wall of each chamber */}
              <path
                d="M 12,14 C 11,36 34,47 37,50"
                fill="none"
                stroke="rgba(255,255,255,0.38)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M 12,86 C 11,64 34,53 37,50"
                fill="none"
                stroke="rgba(255,255,255,0.38)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

            </svg>
          </div>

          {/* Text */}
          <h1 className="loading-title">Processing Reports</h1>
          <p className="loading-subtitle">AI is analyzing your patient data&hellip;</p>

          {/* Progress */}
          <div className="progress-container">
            <div 
              className="progress-bar" 
              style={{ width: `${progressWidth}%` }}
            ></div>
          </div>
          <div className="status-message">Preparing diagnostic insights</div>

          {/* Step checklist */}
          <div className="loading-steps">
            <div className="loading-step">
              <div className="step-icon">
                {stepStates[0] ? (
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <div className="step-spinner"></div>
                )}
              </div>
              <span className="step-text">Uploading medical files</span>
            </div>
            <div className="loading-step">
              <div className="step-icon">
                {stepStates[1] ? (
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <div className="step-spinner"></div>
                )}
              </div>
              <span className="step-text">Analyzing lab results</span>
            </div>
            <div className="loading-step">
              <div className="step-icon">
                {stepStates[2] ? (
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <div className="step-spinner"></div>
                )}
              </div>
              <span className="step-text">Generating patient profile</span>
            </div>

            {/* Rotating Insights */}
            <div className="pr-insight-container">
              <p className={`pr-insight-text ${fadeClass}`}>
                {INSIGHT_MESSAGES[messageIndex]}
              </p>
            </div>
          </div>

          {/* Stop Processing */}
          <button className="pr-stop-btn" onClick={handleStop} type="button">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Stop Processing
          </button>

        </div>
      </div>
    </>
  );
}