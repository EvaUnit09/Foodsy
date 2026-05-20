"use client";

import { Flame } from "lucide-react";
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
        background: "#fafaf9",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Left: logo + title + subtitle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "#1c1917",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>F</span>
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

      {/* Right: area trigger + optional streak pill + progress ring */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {streak > 0 && (
          <span
            style={{
              background: "#f5f5f4",
              borderRadius: 20,
              padding: "5px 10px",
              fontSize: 13,
              color: "#1c1917",
              fontWeight: 700,
            }}
          >
            <Flame style={{ width: 13, height: 13 }} /> {streak}
          </span>
        )}
        <button
          onClick={onAreaPickerOpen}
          aria-label="Change area"
          style={{
            background: "#f5f5f4",
            border: "none",
            borderRadius: 20,
            padding: "5px 10px",
            fontSize: 12,
            color: "#555",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ▾ Area
        </button>

        {/* 44px progress ring */}
        <div style={{ width: 44, height: 44, flexShrink: 0 }}>
          <svg width={44} height={44} viewBox="0 0 44 44">
            <circle
              cx={22}
              cy={22}
              r={18}
              fill="none"
              stroke="#e7e5e4"
              strokeWidth={4}
            />
            <circle
              cx={22}
              cy={22}
              r={18}
              fill="none"
              stroke="#1c1917"
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
