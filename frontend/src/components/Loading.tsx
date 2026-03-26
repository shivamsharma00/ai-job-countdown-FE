import React, { useEffect, useState } from "react";

const MESSAGES = [
  "Cross-referencing AI research papers...",
  "Analyzing job market data...",
  "Scanning automation risk models...",
  "Consulting Claude for your estimate...",
  "Searching for related news and posts...",
  "Compiling your threat assessment...",
];

const Loading: React.FC = () => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setMsgIdx((i) => (i + 1 < MESSAGES.length ? i + 1 : i)),
      2000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 0",
        animation: "fadeUp 0.4s ease-out",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid var(--surface-2)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 32px",
        }}
      />
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          color: "var(--text-dim)",
          letterSpacing: 1,
        }}
      >
        Analyzing threat level...
        <span
          style={{
            display: "block",
            marginTop: 6,
            animation: "blink 2s infinite",
          }}
        >
          {MESSAGES[msgIdx]}
        </span>
      </div>
    </div>
  );
};

export default Loading;
