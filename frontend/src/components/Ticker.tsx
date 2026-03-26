import React from "react";

const ITEMS = [
  { label: "COPYWRITER", safe: false, pct: "-12% survival" },
  { label: "PLUMBER", safe: true, pct: "+94% safe" },
  { label: "DATA ENTRY", safe: false, pct: "-3% survival" },
  { label: "SURGEON", safe: true, pct: "+88% safe" },
  { label: "TRANSLATOR", safe: false, pct: "-22% survival" },
  { label: "THERAPIST", safe: true, pct: "+91% safe" },
  { label: "BOOKKEEPER", safe: false, pct: "-5% survival" },
  { label: "ELECTRICIAN", safe: true, pct: "+93% safe" },
];

const row = ITEMS.map(
  (i) =>
    `<span style="color:${i.safe ? "var(--green)" : "var(--red)"}">${
      i.label
    }</span> ${i.pct}`
).join(" &nbsp;\u2022&nbsp; ");

const Ticker: React.FC = () => (
  <div
    style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      overflow: "hidden",
      height: 34,
      display: "flex",
      alignItems: "center",
      zIndex: 100,
    }}
  >
    <div
      style={{
        display: "flex",
        gap: 40,
        animation: "tickerAnim 35s linear infinite",
        whiteSpace: "nowrap",
        fontFamily: "'Space Mono', monospace",
        fontSize: 10,
        color: "var(--text-dim)",
      }}
      dangerouslySetInnerHTML={{
        __html: row + " &nbsp;\u2022&nbsp; " + row,
      }}
    />
  </div>
);

export default Ticker;
