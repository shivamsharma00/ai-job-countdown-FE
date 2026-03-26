import React from "react";

const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps,
}) => (
  <div
    style={{
      display: "flex",
      gap: 6,
      marginBottom: 32,
    }}
  >
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: i <= currentStep ? "var(--accent)" : "var(--surface-2)",
          opacity: i <= currentStep ? 1 : 0.4,
          transition: "background 0.3s ease, opacity 0.3s ease",
        }}
      />
    ))}
  </div>
);

export default ProgressBar;
