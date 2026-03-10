"use client";

import { useRouter } from "next/navigation";

interface ActiveSessionBannerProps {
  sessionId: string;
  participantCount: number;
  restaurantCount: number;
  elapsedMinutes: number;
}

export function ActiveSessionBanner({
  sessionId,
  participantCount,
  restaurantCount,
  elapsedMinutes,
}: ActiveSessionBannerProps) {
  const router = useRouter();

  return (
    <div
      style={{
        background: "#fff",
        borderLeft: "4px solid #e8531a",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        padding: "16px 20px",
        margin: "0 32px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          className="animate-pulse"
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#e8531a",
            flexShrink: 0,
          }}
        />
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>
            Session In Progress
          </span>
          <span style={{ fontSize: 13, color: "#888", marginLeft: 10 }}>
            {participantCount} participant{participantCount !== 1 ? "s" : ""} &middot; {restaurantCount} restaurant{restaurantCount !== 1 ? "s" : ""} &middot; {elapsedMinutes}m elapsed
          </span>
        </div>
      </div>
      <button
        onClick={() => router.push(`/sessions/${sessionId}`)}
        style={{
          background: "#e8531a",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
      >
        Rejoin Session
      </button>
    </div>
  );
}
