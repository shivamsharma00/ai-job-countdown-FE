import React, { useState, useEffect, useRef } from "react";
import type { UserProfile } from "../types";
import {
  fetchGeo,
  fetchRoleSuggestions,
  fetchCitySuggestions,
  fetchTaskSuggestions,
  sanitizeText,
} from "../api/client";
import styles from "./IntakeForm.module.css";

// Static fallback tasks shown if AI task suggestions fail
const TASK_OPTIONS = [
  "Writing / documentation",
  "Data analysis",
  "Coding / technical work",
  "Client / customer calls",
  "Creative / design work",
  "Physical / hands-on work",
  "Managing people",
  "Sales / negotiation",
  "Research",
  "Teaching / training",
  "Strategy / planning",
  "Operations / logistics",
];

const COMPANY_SIZES = [
  { value: "1-50", label: "Startup", desc: "< 50 people" },
  { value: "50-500", label: "Small–Mid", desc: "50 – 500 people" },
  { value: "500-5000", label: "Enterprise", desc: "500 – 5,000 people" },
  { value: "5000+", label: "Large Corp", desc: "5,000+ people" },
];

interface Props {
  onEnterSummary: (profile: UserProfile) => void;
  estimateLoading: boolean;
  estimateError: string | null;
  onRetry: () => void;
  onStepChange: (step: number) => void;
}

const IntakeForm: React.FC<Props> = ({
  onEnterSummary,
  estimateLoading,
  estimateError,
  onRetry,
  onStepChange,
}) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    role: "",
    location: "",
    companySize: "",
    companyName: "",
    tasks: [],
    aiUsage: 20,
  });

  // Geo + suggestion state
  const [geoLoading, setGeoLoading] = useState(true);
  const [geo, setGeo] = useState<{ city: string; region: string } | null>(null);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityTimedOut, setCityTimedOut] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);

  // AbortController + requestId for task suggestions race-condition handling
  const taskAbortRef = useRef<AbortController | null>(null);
  const taskRequestIdRef = useRef(0);

  // Ref to always have latest profile for useEffect without re-firing on profile changes
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Track whether onEnterSummary has been called for the current step-5 visit
  const enterSummaryFiredRef = useRef(false);

  // Issue 1: call onEnterSummary when step first becomes 5 (on mount of step 5)
  useEffect(() => {
    if (step === 5) {
      if (!enterSummaryFiredRef.current) {
        enterSummaryFiredRef.current = true;
        onEnterSummary(profileRef.current);
      }
    } else {
      // Reset so re-visiting step 5 (e.g. after going back) fires again
      enterSummaryFiredRef.current = false;
    }
  }, [step, onEnterSummary]);

  // On mount: load geo + role suggestions, fire city suggestions in background
  useEffect(() => {
    let cancelled = false;
    let cityTimerId: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const geoData = await fetchGeo();
        if (cancelled) return;
        setGeo({ city: geoData.city, region: geoData.region });

        // Fire city suggestions in background (needed for step 2)
        setCityLoading(true);
        cityTimerId = setTimeout(() => {
          if (!cancelled) setCityTimedOut(true);
        }, 30000);

        fetchCitySuggestions(geoData.city, geoData.region)
          .then((cities) => {
            if (cityTimerId) clearTimeout(cityTimerId);
            cityTimerId = null;
            if (!cancelled) {
              setCitySuggestions(cities);
              setCityLoading(false);
            }
          })
          .catch(() => {
            if (cityTimerId) clearTimeout(cityTimerId);
            cityTimerId = null;
            if (!cancelled) setCityLoading(false);
          });

        // Role suggestions (await — spinner waits for this)
        const roles = await fetchRoleSuggestions(geoData.city, geoData.region);
        if (!cancelled) setRoleSuggestions(roles);
      } catch {
        // Geo failed — degrade to text-input-only, no pills
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (cityTimerId) clearTimeout(cityTimerId);
    };
  }, []);

  // Abort any in-flight task request on unmount
  useEffect(() => {
    return () => {
      taskAbortRef.current?.abort();
    };
  }, []);

  const setStepAndNotify = (newStep: number) => {
    setStep(newStep);
    onStepChange(newStep);
  };

  const next = () => setStepAndNotify(step + 1);
  const back = () => setStepAndNotify(step - 1);

  const update = (patch: Partial<UserProfile>) =>
    setProfile((p) => ({ ...p, ...patch }));

  const toggleTask = (task: string) => {
    setProfile((p) => {
      if (p.tasks.includes(task)) {
        return { ...p, tasks: p.tasks.filter((t) => t !== task) };
      }
      // Issue 4: enforce 6-task max
      if (p.tasks.length >= 6) return p;
      return { ...p, tasks: [...p.tasks, task] };
    });
  };

  // Fire task suggestions when company size is selected (step 1)
  const handleCompanySizeSelect = (size: string) => {
    update({ companySize: size, tasks: [] }); // reset tasks on size change

    // Abort any in-flight task suggestions request
    if (taskAbortRef.current) taskAbortRef.current.abort();
    const controller = new AbortController();
    taskAbortRef.current = controller;
    const requestId = ++taskRequestIdRef.current;

    setTaskLoading(true);
    setTaskSuggestions([]);

    fetchTaskSuggestions(profile.role, size, controller.signal)
      .then((tasks) => {
        // requestId guard: discard stale results
        if (requestId === taskRequestIdRef.current && !controller.signal.aborted) {
          setTaskSuggestions(tasks);
        }
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError" && requestId === taskRequestIdRef.current) {
          setTaskSuggestions([]); // fallback to TASK_OPTIONS will show in render
        }
      })
      .finally(() => {
        if (requestId === taskRequestIdRef.current) setTaskLoading(false);
      });
  };

  const aiLabel =
    profile.aiUsage < 20
      ? "Almost no AI"
      : profile.aiUsage < 40
      ? "Low AI usage"
      : profile.aiUsage < 60
      ? "Moderate AI usage"
      : profile.aiUsage < 80
      ? "Heavy AI usage"
      : "AI-saturated workflow";

  // Issue 3: cap task pills at 10
  const displayedTasks =
    taskSuggestions.length > 0 ? taskSuggestions.slice(0, 10) : TASK_OPTIONS.slice(0, 10);

  // ── Step 0: Role ──
  const stepRole = (
    <div key="role" className={styles.card}>
      <div className={styles.label}>Step 1 of 6</div>
      <div className={styles.question}>What do you do for a living?</div>
      {/* Issue 2: text input always visible; spinner shown alongside it when loading */}
      <div className={styles.hint}>
        Your job title or a short description.
        {geo?.city && (
          <span className={styles.geoNote}>
            {" "}Suggestions based on your approximate location.
          </span>
        )}
      </div>
      <input
        className={styles.input}
        value={profile.role}
        onChange={(e) => update({ role: sanitizeText(e.target.value) })}
        placeholder="e.g. Software Engineer, Nurse, Accountant…"
      />
      {geoLoading ? (
        <div className={styles.pillsLoading}>
          <div className={styles.miniSpin} />
          <span>Loading suggestions…</span>
        </div>
      ) : (
        <>
          {roleSuggestions.length > 0 && (
            <div className={styles.chips}>
              {roleSuggestions.map((c) => (
                <span
                  key={c}
                  className={`${styles.chip} ${profile.role === c ? styles.chipSelected : ""}`}
                  onClick={() => update({ role: c })}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      <div className={styles.nav}>
        <button
          className={styles.btnNext}
          disabled={!profile.role.trim()}
          onClick={next}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step 1: Company Size ──
  const stepCompany = (
    <div key="company" className={styles.card}>
      <div className={styles.label}>Step 2 of 6</div>
      <div className={styles.question}>How big is your company?</div>
      <div className={styles.hint}>
        Larger companies tend to adopt AI faster due to budget and scale.
      </div>
      <div className={styles.optionGrid}>
        {COMPANY_SIZES.map((s) => (
          <button
            key={s.value}
            className={`${styles.optionBtn} ${
              profile.companySize === s.value ? styles.optionSelected : ""
            }`}
            onClick={() => handleCompanySizeSelect(s.value)}
          >
            <span className={styles.optLabel}>{s.label}</span>
            <span className={styles.optDesc}>{s.desc}</span>
          </button>
        ))}
      </div>
      <div className={styles.hint} style={{ marginTop: 12, marginBottom: 0 }}>
        Company name (optional):
      </div>
      <input
        className={styles.input}
        style={{ marginTop: 8 }}
        value={profile.companyName}
        onChange={(e) =>
          update({ companyName: sanitizeText(e.target.value) })
        }
        placeholder="e.g. Google, Deloitte, a local clinic…"
      />
      <div className={styles.nav}>
        <button className={styles.btnBack} onClick={back}>
          Back
        </button>
        <button
          className={styles.btnNext}
          disabled={!profile.companySize}
          onClick={next}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step 2: Location ──
  const stepLocation = (
    <div key="location" className={styles.card}>
      <div className={styles.label}>Step 3 of 6</div>
      <div className={styles.question}>Where are you based?</div>
      <div className={styles.hint}>
        AI adoption speed varies by region — regulations, labor markets, and tech
        infrastructure all play a part.
        {geo?.city && (
          <span className={styles.geoNote}>
            {" "}Suggestions based on your approximate location.
          </span>
        )}
      </div>
      <input
        className={styles.input}
        value={profile.location}
        onChange={(e) => update({ location: sanitizeText(e.target.value) })}
        placeholder="e.g. Austin TX, London, Bangalore…"
      />
      {cityLoading && !cityTimedOut ? (
        <div className={styles.pillsLoading}>
          <div className={styles.miniSpin} />
          <span>Loading city suggestions…</span>
        </div>
      ) : citySuggestions.length > 0 && !cityTimedOut ? (
        <div className={styles.chips}>
          {citySuggestions.map((c) => (
            <span
              key={c}
              className={`${styles.chip} ${profile.location === c ? styles.chipSelected : ""}`}
              onClick={() => update({ location: c })}
            >
              {c}
            </span>
          ))}
        </div>
      ) : null}
      <div className={styles.nav}>
        <button className={styles.btnBack} onClick={back}>
          Back
        </button>
        <button
          className={styles.btnNext}
          disabled={!profile.location.trim()}
          onClick={next}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step 3: Tasks ──
  const stepTasks = (
    <div key="tasks" className={styles.card}>
      <div className={styles.label}>Step 4 of 6</div>
      <div className={styles.question}>What fills most of your day?</div>
      <div className={styles.hint}>
        Select up to 6 that apply. This helps gauge which parts of your work AI can
        realistically handle today.{" "}
        <strong style={{ color: "var(--text)" }}>
          {profile.tasks.length}/6 selected
        </strong>
      </div>
      {taskLoading && (
        <div className={styles.pillsLoading}>
          <div className={styles.miniSpin} />
          <span>Generating suggestions for your role…</span>
        </div>
      )}
      <div className={styles.tagGrid}>
        {displayedTasks.map((t) => (
          <span
            key={t}
            className={`${styles.tagBtn} ${
              profile.tasks.includes(t) ? styles.tagSelected : ""
            }`}
            onClick={() => toggleTask(t)}
          >
            {t}
          </span>
        ))}
      </div>
      <div className={styles.nav}>
        <button className={styles.btnBack} onClick={back}>
          Back
        </button>
        <button className={styles.btnNext} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step 4: AI Usage ──
  const stepAI = (
    <div key="ai" className={styles.card}>
      <div className={styles.label}>Step 5 of 6</div>
      <div className={styles.question}>
        How much AI is in your workflow already?
      </div>
      <div className={styles.hint}>
        This signals how far along the automation curve your field is right now.
      </div>
      <div className={styles.sliderContainer}>
        <div className={styles.sliderLabels}>
          <span>No AI at all</span>
          <span>AI does half my job</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={profile.aiUsage}
          onChange={(e) => update({ aiUsage: parseInt(e.target.value, 10) })}
          className={styles.slider}
        />
        <div className={styles.sliderValue}>
          {aiLabel} ({profile.aiUsage}%)
        </div>
      </div>
      <div className={styles.nav}>
        <button className={styles.btnBack} onClick={back}>
          Back
        </button>
        <button
          className={styles.btnNext}
          onClick={() => setStepAndNotify(5)}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ── Step 5: Summary + Loading ──
  const stepSummary = (
    <div key="summary" className={styles.card} style={{ textAlign: "center" }}>
      <div className={styles.label}>Step 6 of 6</div>
      <div className={styles.question}>
        {estimateLoading
          ? "Analyzing your profile…"
          : estimateError
          ? "Something went wrong"
          : "Ready to see your fate?"}
      </div>

      {/* Summary of selections */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Role</span>
          <span className={styles.summaryValue}>{profile.role}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Company</span>
          <span className={styles.summaryValue}>
            {COMPANY_SIZES.find((s) => s.value === profile.companySize)?.label ?? profile.companySize}
            {profile.companyName ? ` · ${profile.companyName}` : ""}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Location</span>
          <span className={styles.summaryValue}>{profile.location}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Tasks</span>
          <span className={styles.summaryValue}>
            {profile.tasks.length > 0
              ? profile.tasks.join(", ")
              : "None selected"}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>AI Usage</span>
          <span className={styles.summaryValue}>
            {profile.aiUsage}% · {aiLabel}
          </span>
        </div>
      </div>

      {estimateLoading && (
        <div className={styles.summaryLoading}>
          <div className={styles.miniSpin} />
          <span>Running analysis… this takes 10–30 seconds.</span>
        </div>
      )}

      {estimateError && !estimateLoading && (
        <div className={styles.summaryError}>
          <p>{estimateError}</p>
          <button className={styles.btnNext} onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {!estimateLoading && !estimateError && (
        <div style={{ marginTop: 16 }}>
          <button className={styles.linkBtn} onClick={back}>
            Go back and adjust
          </button>
        </div>
      )}
    </div>
  );

  const steps = [stepRole, stepCompany, stepLocation, stepTasks, stepAI, stepSummary];

  return <div style={{ animation: "fadeUp 0.5s ease-out" }}>{steps[step]}</div>;
};

export default IntakeForm;
