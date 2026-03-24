"use client";

import { useState } from "react";
import { Heart, MapPin } from "lucide-react";

interface ActionButtonsProps {
  onPass: () => void;
  onWatchlist: () => void;
  onFavorite: () => void;
  disabled?: boolean;
}

function CircleButton({
  onClick,
  size,
  bg,
  children,
  label,
  ringColor,
  disabled,
}: {
  onClick: () => void;
  size: number;
  bg: string;
  children: React.ReactNode;
  label: string;
  ringColor: string;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <button
        onClick={onClick}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        disabled={disabled}
        aria-label={label}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: bg,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.45 : 1,
          transform: pressed ? "scale(0.94)" : "scale(1)",
          boxShadow: pressed ? `0 0 0 4px ${ringColor}22` : "none",
          transition: "transform 0.12s ease, box-shadow 0.12s ease",
        }}
      >
        {children}
      </button>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: bg === "#f3f4f6" ? "#9ca3af" : bg,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function ActionButtons({
  onPass,
  onWatchlist,
  onFavorite,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 20 }}
      >
        <CircleButton
          onClick={onPass}
          size={52}
          bg="#f3f4f6"
          label="Pass"
          ringColor="#9ca3af"
          disabled={disabled}
        >
          <svg aria-hidden="true" width={20} height={20} viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </CircleButton>

        <CircleButton
          onClick={onWatchlist}
          size={64}
          bg="#3b82f6"
          label="Wanna Go"
          ringColor="#3b82f6"
          disabled={disabled}
        >
          <MapPin size={24} fill="white" color="white" />
        </CircleButton>

        <CircleButton
          onClick={onFavorite}
          size={52}
          bg="#e8531a"
          label="Been Here"
          ringColor="#e8531a"
          disabled={disabled}
        >
          <Heart size={20} fill="white" color="white" />
        </CircleButton>
      </div>

      <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
        ← Pass &nbsp;&nbsp; Wanna Go ↑ &nbsp;&nbsp; Been Here →
      </div>
    </div>
  );
}
