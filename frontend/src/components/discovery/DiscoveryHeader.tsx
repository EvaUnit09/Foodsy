"use client";

import { Borough } from "@/api/discoveryApi";

interface DiscoveryHeaderProps {
  seenCount: number;
  dailyCap: number;
  streak: number;
  selectedBorough: Borough;
  selectedNeighborhood: string | null;
  onAreaPickerOpen: () => void;
}

export function DiscoveryHeader({
  seenCount,
  dailyCap,
  streak,
  onAreaPickerOpen,
}: DiscoveryHeaderProps) {
  const circumference = 113.1; // 2 * π * 18
  const filled = (seenCount / dailyCap) * circumference;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        background: "#fdf6f0",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Left: logo + title + subtitle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "#e8531a",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#fff", fontSize: 16 }}>🍽</span>
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: 14,
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.2,
            }}
          >
            Foodsy
          </div>
          <div style={{ fontSize: 11, color: "#888", lineHeight: 1.2 }}>
            {dailyCap - seenCount} left today
          </div>
        </div>
      </div>

      {/* Right: streak pill + progress ring */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {streak > 0 && (
          <button
            onClick={onAreaPickerOpen}
            style={{
              background: "#fff3ee",
              border: "none",
              borderRadius: 20,
              padding: "5px 10px",
              fontSize: 13,
              color: "#e8531a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔥 {streak}
          </button>
        )}

        {/* 44px progress ring */}
        <div style={{ width: 44, height: 44, flexShrink: 0 }}>
          <svg width={44} height={44} viewBox="0 0 44 44">
            <circle
              cx={22}
              cy={22}
              r={18}
              fill="none"
              stroke="#f0e8e0"
              strokeWidth={4}
            />
            <circle
              cx={22}
              cy={22}
              r={18}
              fill="none"
              stroke="#e8531a"
              strokeWidth={4}
              strokeDasharray={`${filled} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
            />
            <text
              x={22}
              y={22}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: 9, fontWeight: 700, fill: "#1a1a1a" }}
            >
              {seenCount}/{dailyCap}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
