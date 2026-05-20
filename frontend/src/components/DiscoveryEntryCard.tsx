"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DiscoveryApi, DAILY_CAP } from "@/api/discoveryApi";

export function DiscoveryEntryCard() {
  const router = useRouter();
  const [seenCount, setSeenCount] = useState(0);

  useEffect(() => {
    setSeenCount(DiscoveryApi.getTodaySeenCount());
  }, []);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        padding: 24,
        margin: "0 32px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <h2
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#1a1a1a",
            margin: 0,
            marginBottom: 6,
          }}
        >
          Discover Today&apos;s Spots
        </h2>
        <p style={{ fontSize: 13, color: "#888888", margin: 0, marginBottom: 16 }}>
          Explore restaurants and build your list
        </p>
        <button
          onClick={() => router.push("/discover")}
          style={{
            background: "#1c1917",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#292524")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1c1917")}
        >
          Start Discovering
        </button>
      </div>

      {/* Progress ring */}
      <div style={{ flexShrink: 0 }}>
        <svg width={72} height={72} viewBox="0 0 72 72">
          <circle
            cx={36}
            cy={36}
            r={30}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={6}
          />
          <circle
            cx={36}
            cy={36}
            r={30}
            fill="none"
            stroke="#1c1917"
            strokeWidth={6}
            strokeDasharray={`${(seenCount / DAILY_CAP) * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
          />
          <text
            x={36}
            y={36}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: 13, fontWeight: 700, fill: "#1a1a1a" }}
          >
            {seenCount}/{DAILY_CAP}
          </text>
        </svg>
      </div>
    </div>
  );
}
