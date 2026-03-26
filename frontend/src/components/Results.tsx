import React, { useEffect, useState, useRef } from "react";
import type {
  EstimateResponse,
  FeedItem,
  FeedResponse,
  UserProfile,
} from "../types";
import styles from "./Results.module.css";

/* ── colour helpers ── */

const RISK_COLOR: Record<string, string> = {
  critical: "var(--red)",
  high: "var(--orange)",
  moderate: "var(--yellow)",
  low: "var(--green)",
};

const RISK_RGB: Record<string, string> = {
  "var(--red)": "255,23,68",
  "var(--orange)": "255,145,0",
  "var(--yellow)": "255,214,0",
  "var(--green)": "0,230,118",
};

function factorColor(name: string, value: number): string {
  if (name === "Task Repeatability")
    return value > 60
      ? "var(--orange)"
      : value > 35
      ? "var(--yellow)"
      : "var(--green)";
  return value > 60
    ? "var(--green)"
    : value > 35
    ? "var(--yellow)"
    : "var(--red)";
}

/* ── component ── */

interface Props {
  profile: UserProfile;
  estimate: EstimateResponse;
  feed: FeedResponse | null;
  feedLoading: boolean;
  onRestart: () => void;
}

const Results: React.FC<Props> = ({
  profile,
  estimate,
  feed,
  feedLoading,
  onRestart,
}) => {
  const [displayYears, setDisplayYears] = useState(0);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [feedFilter, setFeedFilter] = useState<
    "all" | "news" | "social" | "research"
  >("all");
  const [calState, setCalState] = useState<"idle" | "adding" | "done">("idle");
  const ringRef = useRef<SVGCircleElement>(null);

  // Live countdown state
  const [countdown, setCountdown] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const color = RISK_COLOR[estimate.risk.toLowerCase()] || "var(--yellow)";
  const rgb = RISK_RGB[color] || "255,214,0";
  const circumference = 2 * Math.PI * 106;
  const progress = Math.min(estimate.years / 30, 1);

  // Count-up animation
  useEffect(() => {
    let c = 0;
    const iv = setInterval(() => {
      c++;
      setDisplayYears(c);
      if (c >= estimate.years) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [estimate.years]);

  // Ring animation
  useEffect(() => {
    const t = setTimeout(() => {
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(
          circumference - progress * circumference
        );
      }
    }, 200);
    return () => clearTimeout(t);
  }, [circumference, progress]);

  // Bar animations
  useEffect(() => {
    const t = setTimeout(() => setBarsAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Live countdown — ticks every second using calendar-date arithmetic
  useEffect(() => {
    const now = new Date();
    const target = new Date(
      now.getFullYear() + estimate.years,
      now.getMonth(),
      now.getDate()
    );

    const tick = () => {
      const remaining = target.getTime() - Date.now();
      if (remaining <= 0) {
        setCountdown({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const totalSec = Math.floor(remaining / 1000);
      const s = totalSec % 60;
      const totalMin = Math.floor(totalSec / 60);
      const m = totalMin % 60;
      const totalHrs = Math.floor(totalMin / 60);
      const h = totalHrs % 24;
      const totalDays = Math.floor(totalHrs / 24);
      const y = Math.floor(totalDays / 365);
      const afterYears = totalDays % 365;
      const mo = Math.floor(afterYears / 30);
      const d = afterYears % 30;
      setCountdown({ years: y, months: mo, days: d, hours: h, minutes: m, seconds: s });
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [estimate.years]);

  // Calendar
  const handleCalendar = () => {
    setCalState("adding");
    const start = new Date(
      new Date().getFullYear() + 1,
      new Date().getMonth(),
      new Date().getDate()
    );
    const ds = start.toISOString().slice(0, 10).replace(/-/g, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${ds}`,
      `DTEND;VALUE=DATE:${ds}`,
      "RRULE:FREQ=YEARLY;COUNT=5",
      `SUMMARY:AI Job Countdown Check-in: ${profile.role}`,
      `DESCRIPTION:Annual reminder to reassess AI disruption risk for ${profile.role} in ${profile.location}. Original estimate: ${estimate.years} years.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.href = url;
    a.download = "ai-checkin.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCalState("done");
  };

  // Share
  const handleShare = () => {
    const txt = `The AI Job Countdown says my role as a ${profile.role} has ~${estimate.years} years left before major disruption. How about yours?`;
    if (navigator.share) {
      navigator.share({ title: "AI Job Countdown", text: txt });
    } else {
      navigator.clipboard.writeText(txt);
    }
  };

  // Feed filtering
  const filteredFeed = feed
    ? feedFilter === "all"
      ? feed.items
      : feed.items.filter((i) => i.type === feedFilter)
    : [];

  const co = profile.companyName || profile.companySize;

  return (
    <div style={{ animation: "fadeUp 0.7s ease-out" }}>
      {/* ── Clock Card ── */}
      <div className={styles.clockCard}>
        <div className={styles.gradient} />
        <div className={styles.clockLayout}>
          {/* Left: SVG ring */}
          <div className={styles.clockLeft}>
            <div className={styles.clockContainer}>
              <svg viewBox="0 0 240 240" width={240} height={240}>
                <circle
                  cx={120}
                  cy={120}
                  r={106}
                  fill="none"
                  stroke="var(--surface-2)"
                  strokeWidth={6}
                />
                <circle
                  ref={ringRef}
                  cx={120}
                  cy={120}
                  r={106}
                  fill="none"
                  stroke={color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference}
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "center",
                    transition:
                      "stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease",
                  }}
                />
              </svg>
              <div className={styles.clockCenter}>
                <div className={styles.countdownNum} style={{ color }}>
                  {displayYears}
                </div>
                <div className={styles.countdownUnit}>years left</div>
              </div>
            </div>
          </div>

          {/* Right: meta + live countdown + description */}
          <div className={styles.clockRight}>
            <div className={styles.jobTitle}>
              Threat assessment: {profile.role}
            </div>
            <div className={styles.jobContext}>
              {profile.location}
              {co ? ` · ${co}` : ""} · {profile.tasks.length} task types analyzed
            </div>

            {/* Live countdown */}
            <div className={styles.liveCountdown}>
              {(
                [
                  { label: "yrs", value: countdown.years },
                  { label: "mo", value: countdown.months },
                  { label: "d", value: countdown.days },
                  { label: "h", value: countdown.hours },
                  { label: "m", value: countdown.minutes },
                  { label: "s", value: countdown.seconds },
                ] as const
              ).map(({ label, value }) => (
                <div key={label} className={styles.liveUnit}>
                  <span className={styles.liveVal} style={{ color }}>
                    {String(value).padStart(2, "0")}
                  </span>
                  <span className={styles.liveLabel}>{label}</span>
                </div>
              ))}
            </div>
            <div className={styles.yearsMonths} style={{ color }}>
              {countdown.years} {countdown.years === 1 ? "year" : "years"}
              {countdown.months > 0
                ? ` ${countdown.months} ${countdown.months === 1 ? "month" : "months"}`
                : ""}
            </div>

            <div
              className={styles.riskBadge}
              style={{ background: `rgba(${rgb}, 0.1)` }}
            >
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
          <p>
            Add a yearly reminder to reassess your risk. First check-in: 1 year
            from now. Countdown target:{" "}
            {new Date().getFullYear() + estimate.years}.
          </p>
        </div>
        <button
          className={`${styles.calBtn} ${
            calState === "done" ? styles.calDone : ""
          }`}
          disabled={calState !== "idle"}
          onClick={handleCalendar}
        >
          {calState === "idle"
            ? "Add to Calendar"
            : calState === "adding"
            ? "Adding..."
            : "Downloaded .ics"}
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
                  <span className={styles.factorVal} style={{ color: fc }}>
                    {f.value}%
                  </span>
                </div>
                <div className={styles.factorTrack}>
                  <div
                    className={styles.factorFill}
                    style={{
                      background: fc,
                      width: barsAnimated ? `${f.value}%` : 0,
                    }}
                  />
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
              <div className={styles.tipBody}>
                <strong>{t.title}.</strong> {t.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feed ── */}
      <div className={styles.feedCard}>
        <div className={styles.cardTitle}>What's Already Happening</div>
        <div className={styles.feedTabs}>
          {(["all", "news", "social", "research"] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.feedTab} ${
                feedFilter === tab ? styles.feedTabActive : ""
              }`}
              onClick={() => setFeedFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {feedLoading ? (
          <div className={styles.feedLoading}>
            <div className={styles.miniSpin} />
            Loading related articles and posts...
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className={styles.feedEmpty}>No items found.</div>
        ) : (
          <div className={styles.feedList}>
            {filteredFeed.map((item, i) => (
              <FeedItemRow key={i} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* ── Share / Restart ── */}
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <button className={styles.shareBtn} onClick={handleShare}>
          Share your fate with the world
        </button>
        <br />
        <span className={styles.restartLink} onClick={onRestart}>
          Try another job
        </span>
      </div>

      <div className={styles.disclaimer}>
        This is a creative thought experiment, not a prophecy.
        <br />
        Built for fun. Not financial, career, or existential advice.
        <br />
        <span style={{ fontSize: 9, opacity: 0.6 }}>
          *one AI may have been mildly consulted
        </span>
      </div>
    </div>
  );
};

/* ── Feed item row ── */

const ICON_MAP: Record<string, { cls: string; emoji: string }> = {
  news: { cls: "news", emoji: "📰" },
  social: { cls: "tweet", emoji: "𝕏" },
  research: { cls: "research", emoji: "🔬" },
};

const FeedItemRow: React.FC<{ item: FeedItem }> = ({ item }) => {
  const { cls, emoji } = ICON_MAP[item.type] || ICON_MAP.news;
  const Tag = item.url ? "a" : "div";
  const linkProps = item.url
    ? { href: item.url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Tag className={styles.feedItem} {...linkProps}>
      <div className={`${styles.feedItemIcon} ${styles[cls]}`}>{emoji}</div>
      <div className={styles.feedItemBody}>
        <div className={styles.feedItemTitle}>{item.title}</div>
        <div className={styles.feedItemMeta}>
          <span className={styles.source}>{item.source}</span>
          <span>{item.time}</span>
          <span className={styles.feedItemTag}>{item.tag}</span>
        </div>
      </div>
    </Tag>
  );
};

export default Results;
