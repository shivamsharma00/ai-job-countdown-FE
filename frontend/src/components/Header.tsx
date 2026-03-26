import React from "react";

const Header: React.FC = () => (
  <header
    style={{
      textAlign: "center",
      marginBottom: 48,
      animation: "fadeUp 0.8s ease-out",
    }}
  >
    <h1
      style={{
        fontFamily: "'Instrument Serif', serif",
        fontSize: "clamp(40px, 7vw, 78px)",
        fontWeight: 400,
        lineHeight: 0.95,
        letterSpacing: -1.5,
        marginBottom: 16,
      }}
    >
      When will AI
      <br />
      take <span style={{ fontStyle: "italic", color: "var(--accent)" }}>
        your
      </span>{" "}
      job?
    </h1>
    <p
      style={{
        fontSize: 15,
        color: "var(--text-dim)",
        maxWidth: 440,
        margin: "0 auto",
        lineHeight: 1.7,
      }}
    >
      Answer a few quick questions and we'll estimate your timeline, then show
      you what's already happening in your field.
    </p>
  </header>
);

export default Header;
