"use client";

interface GreetingHeaderProps {
  firstName: string;
  onStartSession: () => void;
  onJoinSession: () => void;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function GreetingHeader({ firstName, onStartSession, onJoinSession }: GreetingHeaderProps) {
  const timeOfDay = getTimeOfDay();
  const name = firstName || "there";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "40px 32px 24px",
        background: "#fdf6f0",
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 28,
            fontWeight: 800,
            color: "#1a1a1a",
            margin: 0,
            marginBottom: 4,
          }}
        >
          Good {timeOfDay}, {name}
        </h1>
        <p style={{ fontSize: 14, color: "#888888", margin: 0 }}>
          Ready to find your next great meal?
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onStartSession}
          style={{
            background: "#e8531a",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(232,83,26,0.30)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
        >
          + Start a Session
        </button>
        <button
          onClick={onJoinSession}
          style={{
            background: "none",
            border: "none",
            color: "#e8531a",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            padding: "10px 4px",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          Join a Session
        </button>
      </div>
    </div>
  );
}
