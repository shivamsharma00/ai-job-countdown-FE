import React, { useEffect, useState, useRef } from "react";
import type { EstimateResponse, UserProfile } from "../types";
import styles from "./Results.module.css";

/* ── colour helpers ── */

const RISK_COLOR: Record<string, string> = {
  critical: "var(--red)",
  high:     "var(--orange)",
  moderate: "var(--yellow)",
  low:      "var(--green)",
};

const RISK_RGB: Record<string, string> = {
  "var(--red)":    "255,23,68",
  "var(--orange)": "255,145,0",
  "var(--yellow)": "255,214,0",
  "var(--green)":  "0,230,118",
};

function factorColor(name: string, value: number): string {
  if (name === "Task Repeatability")
    return value > 60 ? "var(--orange)" : value > 35 ? "var(--yellow)" : "var(--green)";
  return value > 60 ? "var(--green)" : value > 35 ? "var(--yellow)" : "var(--red)";
}

function fmtPct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function fmtNum(v: number | null | undefined, decimals = 2) {
  if (v == null) return "N/A";
  return v.toFixed(decimals);
}

function fmtSalary(v: number | null | undefined) {
  if (v == null) return null;
  return "$" + v.toLocaleString("en-US");
}

function fmtEmployment(v: number | null | undefined) {
  if (v == null) return null;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return v.toLocaleString("en-US");
}

/* ── component ── */

interface Props {
  profile:  UserProfile;
  estimate: EstimateResponse;
  onRestart: () => void;
}

const Results: React.FC<Props> = ({ profile, estimate, onRestart }) => {
  const [displayYears, setDisplayYears] = useState(0);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [calState, setCalState] = useState<"idle" | "adding" | "done">("idle");
  const ringRef = useRef<SVGCircleElement>(null);

  const [countdown, setCountdown] = useState({
    years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0,
  });

  const color        = RISK_COLOR[estimate.risk.toLowerCase()] || "var(--yellow)";
  const rgb          = RISK_RGB[color] || "255,214,0";
  const circumference = 2 * Math.PI * 106;
  const progress     = Math.min(estimate.years / 30, 1);

  // Count-up
  useEffect(() => {
    let c = 0;
    const iv = setInterval(() => {
      c++;
      setDisplayYears(c);
      if (c >= estimate.years) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [estimate.years]);

  // Ring
  useEffect(() => {
    const t = setTimeout(() => {
      if (ringRef.current)
        ringRef.current.style.strokeDashoffset = String(circumference - progress * circumference);
    }, 200);
    return () => clearTimeout(t);
  }, [circumference, progress]);

  // Bars
  useEffect(() => {
    const t = setTimeout(() => setBarsAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Live countdown
  useEffect(() => {
    const now    = new Date();
    const target = new Date(now.getFullYear() + estimate.years, now.getMonth(), now.getDate());
    const tick = () => {
      const rem = target.getTime() - Date.now();
      if (rem <= 0) { setCountdown({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      const s  = Math.floor(rem / 1000) % 60;
      const m  = Math.floor(rem / 60000) % 60;
      const h  = Math.floor(rem / 3600000) % 24;
      const td = Math.floor(rem / 86400000);
      const y  = Math.floor(td / 365);
      const mo = Math.floor((td % 365) / 30);
      const d  = (td % 365) % 30;
      setCountdown({ years: y, months: mo, days: d, hours: h, minutes: m, seconds: s });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [estimate.years]);

  // Calendar
  const handleCalendar = () => {
    setCalState("adding");
    const start = new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate());
    const ds = start.toISOString().slice(0, 10).replace(/-/g, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${ds}`, `DTEND;VALUE=DATE:${ds}`,
      "RRULE:FREQ=YEARLY;COUNT=5",
      `SUMMARY:AI Job Countdown Check-in: ${profile.role}`,
      `DESCRIPTION:Annual reminder to reassess AI exposure for ${profile.role} in ${profile.location}. Original estimate: ${estimate.years} years.`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\n");
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.href = url; a.download = "ai-checkin.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCalState("done");
  };

  // Share
  const handleShare = () => {
    const txt = `The AI Job Countdown says my role as a ${profile.role} has ~${estimate.years} years before major AI disruption. How about yours?`;
    if (navigator.share) navigator.share({ title: "AI Job Countdown", text: txt });
    else navigator.clipboard.writeText(txt);
  };

  const co = profile.companyName || profile.companySize;
  const ds  = estimate.data_sources;
  const occ = estimate.occupation;

  return (
    <div style={{ animation: "fadeUp 0.7s ease-out" }}>

      {/* ── Clock Card ── */}
      <div className={styles.clockCard}>
        <div className={styles.gradient} />
        <div className={styles.clockLayout}>
          <div className={styles.clockLeft}>
            <div className={styles.clockContainer}>
              <svg viewBox="0 0 240 240" width={240} height={240}>
                <circle cx={120} cy={120} r={106} fill="none" stroke="var(--surface-2)" strokeWidth={6} />
                <circle
                  ref={ringRef} cx={120} cy={120} r={106}
                  fill="none" stroke={color} strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
                />
              </svg>
              <div className={styles.clockCenter}>
                <div className={styles.countdownNum} style={{ color }}>{displayYears}</div>
                <div className={styles.countdownUnit}>years left</div>
              </div>
            </div>
          </div>

          <div className={styles.clockRight}>
            <div className={styles.jobTitle}>Threat assessment: {profile.role}</div>
            <div className={styles.jobContext}>
              {profile.location}{co ? ` · ${co}` : ""} · {profile.tasks.length} task types analyzed
            </div>
            <div className={styles.liveCountdown}>
              {([
                { label: "yrs", value: countdown.years },
                { label: "mo",  value: countdown.months },
                { label: "d",   value: countdown.days },
                { label: "h",   value: countdown.hours },
                { label: "m",   value: countdown.minutes },
                { label: "s",   value: countdown.seconds },
              ] as const).map(({ label, value }) => (
                <div key={label} className={styles.liveUnit}>
                  <span className={styles.liveVal} style={{ color }}>{String(value).padStart(2, "0")}</span>
                  <span className={styles.liveLabel}>{label}</span>
                </div>
              ))}
            </div>
            <div className={styles.yearsMonths} style={{ color }}>
              {countdown.years} {countdown.years === 1 ? "year" : "years"}
              {countdown.months > 0 ? ` ${countdown.months} ${countdown.months === 1 ? "month" : "months"}` : ""}
            </div>
            <div className={styles.riskBadge} style={{ background: `rgba(${rgb}, 0.1)` }}>
              <span className={styles.riskDot} style={{ background: color }} />
              <span style={{ color }}>{estimate.risk} risk</span>
            </div>
            <p className={styles.clockDesc}>{estimate.description}</p>
          </div>
        </div>
      </div>

      {/* ── Calendar CTA ── */}
      <div className={styles.calCta}>
        <div className={styles.calIcon}>📅</div>
        <div className={styles.calInfo}>
          <h3>Set your "AI Check-in" reminder</h3>
          <p>Add a yearly reminder to reassess your risk. First check-in: 1 year from now. Target: {new Date().getFullYear() + estimate.years}.</p>
        </div>
        <button
          className={`${styles.calBtn} ${calState === "done" ? styles.calDone : ""}`}
          disabled={calState !== "idle"} onClick={handleCalendar}
        >
          {calState === "idle" ? "Add to Calendar" : calState === "adding" ? "Adding…" : "Downloaded .ics"}
        </button>
      </div>

      {/* ── Factors + Tips side by side ── */}
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Vulnerability Breakdown</div>
          {estimate.factors.map((f) => {
            const fc = factorColor(f.name, f.value);
            return (
              <div key={f.name} className={styles.factor}>
                <div className={styles.factorHeader}>
                  <span className={styles.factorName}>{f.name}</span>
                  <span className={styles.factorVal} style={{ color: fc }}>{f.value}%</span>
                </div>
                <div className={styles.factorTrack}>
                  <div className={styles.factorFill} style={{ background: fc, width: barsAnimated ? `${f.value}%` : 0 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Survival Guide</div>
          {estimate.tips.map((t, i) => (
            <div key={i} className={styles.tipRow}>
              <div className={styles.tipIco}>{t.icon}</div>
              <div className={styles.tipBody}><strong>{t.title}.</strong> {t.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Data Sources & Methodology ── */}
      {(ds || occ) && (
        <div className={styles.methodCard}>
          <div className={styles.cardTitle}>How This Score Was Computed</div>
          <p className={styles.methodIntro}>
            Scores are calculated deterministically from three published research datasets —
            no AI guesswork for the numbers. Claude only wrote the description and tips above.
          </p>

          {occ && (
            <div className={styles.methodOcc}>
              <span className={styles.methodOccLabel}>Matched occupation</span>
              <span className={styles.methodOccTitle}>{occ.title}</span>
              <span className={styles.methodOccSoc}>SOC {occ.soc_code}</span>
            </div>
          )}

          <div className={styles.methodGrid}>

            {/* Eloundou */}
            <div className={styles.methodItem}>
              <div className={styles.methodItemHeader}>
                <span className={styles.methodSource}>Eloundou et al. 2023</span>
                <span
                  className={styles.methodBadge}
                  style={{ background: ds?.eloundou_available ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.06)", color: ds?.eloundou_available ? "var(--green)" : "var(--text-dim)" }}
                >
                  {ds?.eloundou_available ? "matched" : "fallback"}
                </span>
              </div>
              <div className={styles.methodLabel}>"GPTs are GPTs" GPT-exposure</div>
              <div className={styles.methodValue} style={{ color }}>
                {ds?.eloundou_score != null ? fmtPct(ds.eloundou_score) : "N/A"}
              </div>
              {ds?.eloundou_alpha != null && (
                <div className={styles.methodFormula}>
                  α={fmtNum(ds.eloundou_alpha)} + 0.5×β={fmtNum(ds.eloundou_beta)} = {fmtNum(ds.eloundou_score)}
                </div>
              )}
              <div className={styles.methodDesc}>
                Share of tasks directly automatable (α) or automatable with tooling (β).
                Higher = more exposed.
              </div>
            </div>

            {/* AIOE */}
            <div className={styles.methodItem}>
              <div className={styles.methodItemHeader}>
                <span className={styles.methodSource}>Felten / Raj / Seamans</span>
                <span
                  className={styles.methodBadge}
                  style={{ background: ds?.aioe_available ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.06)", color: ds?.aioe_available ? "var(--green)" : "var(--text-dim)" }}
                >
                  {ds?.aioe_available ? "matched" : "fallback"}
                </span>
              </div>
              <div className={styles.methodLabel}>AI Occupational Exposure (AIOE)</div>
              <div className={styles.methodValue} style={{ color }}>
                {ds?.aioe_raw != null ? ds.aioe_raw.toFixed(2) : "N/A"}
                <span className={styles.methodUnit}> (z-score)</span>
              </div>
              <div className={styles.methodDesc}>
                Composite z-score mapping 10 AI capabilities to O*NET ability requirements.
                Normalized to {ds?.aioe_normalized != null ? fmtPct(ds.aioe_normalized) : "N/A"} for this calculation.
              </div>
            </div>

            {/* O*NET tasks */}
            <div className={styles.methodItem}>
              <div className={styles.methodItemHeader}>
                <span className={styles.methodSource}>O*NET 30.0 + AIOE Penetration</span>
                <span
                  className={styles.methodBadge}
                  style={{ background: ds && ds.tasks_analyzed > 0 ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.06)", color: ds && ds.tasks_analyzed > 0 ? "var(--green)" : "var(--text-dim)" }}
                >
                  {ds && ds.tasks_analyzed > 0 ? `${ds.tasks_analyzed} tasks` : "heuristic"}
                </span>
              </div>
              <div className={styles.methodLabel}>Importance-weighted task exposure</div>
              <div className={styles.methodValue} style={{ color }}>
                {ds?.task_exposure != null ? fmtPct(ds.task_exposure) : "N/A"}
              </div>
              <div className={styles.methodDesc}>
                Each O*NET task weighted by its importance rating (1–5), then scored against
                AIOE task-penetration data.
              </div>
            </div>

            {/* BLS */}
            <div className={styles.methodItem}>
              <div className={styles.methodItemHeader}>
                <span className={styles.methodSource}>BLS OEWS</span>
                <span
                  className={styles.methodBadge}
                  style={{ background: ds?.bls_employment_national ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.06)", color: ds?.bls_employment_national ? "var(--green)" : "var(--text-dim)" }}
                >
                  {ds?.bls_employment_national ? "matched" : "not available"}
                </span>
              </div>
              <div className={styles.methodLabel}>National employment context</div>
              <div className={styles.methodValue} style={{ color: "var(--text)" }}>
                {fmtEmployment(ds?.bls_employment_national) ?? "—"}
              </div>
              {ds?.bls_median_wage_national && (
                <div className={styles.methodFormula}>
                  Median wage: {fmtSalary(ds.bls_median_wage_national)}/yr
                </div>
              )}
              <div className={styles.methodDesc}>
                Bureau of Labor Statistics Occupational Employment & Wage Statistics.
              </div>
            </div>

          </div>

          {/* Final formula */}
          {ds && (
            <div className={styles.methodFormulaBox}>
              <div className={styles.methodFormulaTitle}>Final exposure formula</div>
              <div className={styles.methodFormulaBody}>
                base = 0.40 × {fmtNum(ds.eloundou_score)} (Eloundou)
                {" "}+ 0.30 × {fmtNum(ds.aioe_normalized)} (AIOE)
                {" "}+ 0.30 × {ds.task_exposure != null ? fmtNum(ds.task_exposure) : "0.60"} (tasks)
                <br />
                final = base + company_modifier({ds.company_modifier > 0 ? "+" : ""}{ds.company_modifier.toFixed(3)})
                {" "}+ ai_modifier({ds.ai_usage_modifier > 0 ? "+" : ""}{ds.ai_usage_modifier.toFixed(3)})
                {" "}= <strong style={{ color }}>{fmtNum(ds.final_exposure)}</strong>
                <br />
                years = round(30 × (1 − {fmtNum(ds.final_exposure)})^1.5)
                {" "}= <strong style={{ color }}>{estimate.years}</strong>
              </div>
            </div>
          )}

          <div className={styles.methodCitation}>
            Sources: O*NET 30.0 (U.S. DOL) · Eloundou et al. (2023) "GPTs are GPTs" ·
            Felten/Raj/Seamans AIOE Index · BLS OEWS (2024)
          </div>
        </div>
      )}

      {/* ── Share / Restart ── */}
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <button className={styles.shareBtn} onClick={handleShare}>
          Share your fate with the world
        </button>
        <br />
        <span className={styles.restartLink} onClick={onRestart}>Try another job</span>
      </div>

      {/* ── Disclaimer ── */}
      <div className={styles.disclaimer}>
        <div className={styles.disclaimerTitle}>Important Disclaimer</div>
        <p>
          This tool provides an <strong>educational exposure assessment</strong> based on
          published research datasets (O*NET 30.0, Eloundou et al. 2023, Felten/Raj/Seamans
          AIOE Index, BLS OEWS). Scores reflect estimated task-level AI exposure across an
          occupation — they are <strong>not predictions of individual job loss</strong>.
        </p>
        <p>
          This is <strong>NOT</strong> career advice, financial advice, employment advice, or a
          substitute for professional guidance. Results are probabilistic estimates based on
          occupation-level data and may not reflect your specific role, employer, or circumstances.
          AI capabilities and labor markets change rapidly — reassess regularly.
        </p>
        <p>
          If you are experiencing job-related anxiety or distress, please speak with a qualified
          mental health professional or contact the{" "}
          <strong>SAMHSA helpline: 1-800-662-4357</strong>.
        </p>
        <p className={styles.disclaimerFine}>
          EU users: This tool is informational only and is not used for employment decisions.
          It does not constitute an AI system subject to the EU AI Act's high-risk category
          provisions. · Data vintage: O*NET 30.0, BLS OEWS May 2024, Eloundou et al. 2023.
        </p>
      </div>
    </div>
  );
};

export default Results;
