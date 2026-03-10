"use client";

import { DAILY_CAP } from "@/api/discoveryApi";

interface CompletionScreenProps {
  favoriteCount: number;
  watchlistCount: number;
  seenCount: number;
  streak: number;
  onChangeArea: () => void;
  onGoHome: () => void;
}

export function CompletionScreen({
  favoriteCount,
  watchlistCount,
  seenCount,
  streak,
  onChangeArea,
  onGoHome,
}: CompletionScreenProps) {
  const hitDailyCap = seenCount >= DAILY_CAP;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#fdf6f0",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 32px",
        gap: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48 }}>🎉</div>

      <div>
        <h2
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 26,
            fontWeight: 800,
            color: "#1a1a1a",
            margin: 0,
            marginBottom: 8,
          }}
        >
          You&apos;re all caught up!
        </h2>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>
          {hitDailyCap
            ? "Come back tomorrow for more spots"
            : "No more restaurants in this area"}
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          width: "100%",
          maxWidth: 360,
        }}
      >
        {[
          { value: seenCount, label: "Explored" },
          { value: favoriteCount, label: "Liked" },
          { value: watchlistCount, label: "Saved" },
        ].map(({ value, label }) => (
          <div
            key={label}
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              padding: "16px 12px",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#1a1a1a",
                fontFamily: "'Georgia', serif",
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Streak card */}
      {streak > 0 && (
        <div
          style={{
            background: "#fff3ee",
            borderRadius: 16,
            padding: "16px 24px",
            width: "100%",
            maxWidth: 360,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#e8531a",
              marginBottom: 4,
            }}
          >
            🔥 {streak}-day streak
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            Keep discovering daily
          </div>
        </div>
      )}

      {/* CTA buttons */}
      <div
        style={{
          display: "flex",
          gap: 12,
          width: "100%",
          maxWidth: 360,
        }}
      >
        <button
          onClick={onChangeArea}
          style={{
            flex: 1,
            padding: "13px 0",
            background: "transparent",
            color: "#e8531a",
            fontWeight: 700,
            fontSize: 14,
            border: "2px solid #e8531a",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Explore Another Area
        </button>
        <button
          onClick={onGoHome}
          style={{
            flex: 1,
            padding: "13px 0",
            background: "#e8531a",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
