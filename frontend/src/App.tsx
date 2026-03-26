import React, { useState, useRef, useEffect, useCallback } from "react";
import type { UserProfile, EstimateResponse, FeedResponse } from "./types";
import { fetchEstimate, fetchFeed, fetchHealth } from "./api/client";
import Header from "./components/Header";
import ProgressBar from "./components/ProgressBar";
import IntakeForm from "./components/IntakeForm";
import Results from "./components/Results";
import Ticker from "./components/Ticker";
import styles from "./App.module.css";

const App: React.FC = () => {
  const [view, setView] = useState<"intake" | "results">("intake");
  const [currentStep, setCurrentStep] = useState(0);
  const [backendStatus, setBackendStatus] = useState<"checking" | "ok" | "down">("checking");

  const checkBackend = useCallback(async () => {
    setBackendStatus("checking");
    const ok = await fetchHealth();
    setBackendStatus(ok ? "ok" : "down");
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const timedOutRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runEstimate = async (p: UserProfile) => {
    setProfile(p);
    setEstimateLoading(true);
    setEstimateError(null);
    timedOutRef.current = false;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timedOutRef.current = true;
      setEstimateError(
        "This is taking longer than expected. Please try again."
      );
      setEstimateLoading(false);
    }, 45000);

    try {
      const est = await fetchEstimate({
        role: p.role,
        location: p.location,
        company_size: p.companySize,
        company_name: p.companyName,
        tasks: p.tasks,
        ai_usage: p.aiUsage,
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (timedOutRef.current) return;

      setEstimate(est);
      setView("results");

      setFeedLoading(true);
      fetchFeed({
        role: p.role,
        location: p.location,
        company_size: p.companySize,
        tasks: p.tasks,
      })
        .then((f) => setFeed(f))
        .catch((err) => console.error("Feed error:", err))
        .finally(() => setFeedLoading(false));
    } catch (err: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!timedOutRef.current) {
        setEstimateError(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setEstimateLoading(false);
      }
    }
  };

  const handleRetry = () => {
    if (profile) runEstimate(profile);
  };

  const handleRestart = () => {
    setView("intake");
    setCurrentStep(0);
    setProfile(null);
    setEstimate(null);
    setFeed(null);
    setEstimateError(null);
    setEstimateLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <>
      <div className="grid-bg" />
      <div className="container">
        {view !== "results" && <Header />}

        {view === "intake" && (
          <>
            <ProgressBar currentStep={currentStep} totalSteps={6} />
            <IntakeForm
              onEnterSummary={runEstimate}
              estimateLoading={estimateLoading}
              estimateError={estimateError}
              onRetry={handleRetry}
              onStepChange={setCurrentStep}
            />
          </>
        )}

        {view === "results" && estimate && profile && (
          <Results
            profile={profile}
            estimate={estimate}
            feed={feed}
            feedLoading={feedLoading}
            onRestart={handleRestart}
          />
        )}
      </div>
      <Ticker />

      {/* ── Backend offline gate ── */}
      {backendStatus !== "ok" && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <span className={styles.modalIcon}>
              {backendStatus === "checking" ? "🔌" : "⚠️"}
            </span>
            <div className={styles.modalTitle}>
              {backendStatus === "checking"
                ? "Connecting…"
                : "Backend offline"}
            </div>
            <div className={styles.modalBody}>
              {backendStatus === "checking" ? (
                <>
                  <span className={styles.checkingDot} />
                  Checking server connection…
                </>
              ) : (
                <>
                  The AI Job Countdown API server isn't reachable.
                  <br />
                  Start it locally with:
                  <code className={styles.modalCode}>
                    cd backend && source venv/bin/activate
                    <br />
                    uvicorn app.main:app --reload
                  </code>
                </>
              )}
            </div>
            {backendStatus === "down" && (
              <button className={styles.retryBtn} onClick={checkBackend}>
                Retry connection
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default App;
