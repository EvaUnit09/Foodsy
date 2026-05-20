"use client";

import { useRouter } from "next/navigation";

interface ActiveSessionBannerProps {
  sessionId: string;
  participantCount: number;
  restaurantCount: number;
  elapsedMinutes: number;
  isHost: boolean;
  onClose: () => void;
}

export function ActiveSessionBanner({
  sessionId,
  participantCount,
  restaurantCount,
  elapsedMinutes,
  isHost,
  onClose,
}: ActiveSessionBannerProps) {
  const router = useRouter();

  return (
    <div
      style={{
        background: "#fff",
        borderLeft: "4px solid #1c1917",
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
            background: "#1c1917",
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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {isHost && (
          <button
            onClick={() => {
              if (window.confirm("Close this session? All participants will be disconnected.")) {
                onClose();
              }
            }}
            style={{
              background: "transparent",
              color: "#9ca3af",
              fontWeight: 600,
              fontSize: 13,
              border: "1.5px solid #e5e7eb",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ef4444";
              e.currentTarget.style.borderColor = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9ca3af";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            Close Session
          </button>
        )}
        <button
          onClick={() => router.push(`/sessions/${sessionId}`)}
          style={{
            background: "#1c1917",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#292524")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1c1917")}
        >
          Rejoin Session
        </button>
      </div>
    </div>
  );
}
