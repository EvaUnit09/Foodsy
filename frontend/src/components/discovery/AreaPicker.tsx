"use client";

import { useEffect, useRef } from "react";
import { Borough, BOROUGH_NEIGHBORHOODS } from "@/api/discoveryApi";

interface AreaPickerProps {
  selectedBorough: Borough;
  selectedNeighborhood: string | null;
  onBoroughChange: (b: Borough) => void;
  onNeighborhoodChange: (n: string | null) => void;
  onClose: () => void;
}

const BOROUGHS: { key: Borough; label: string }[] = [
  { key: "manhattan", label: "Manhattan" },
  { key: "brooklyn", label: "Brooklyn" },
  { key: "queens", label: "Queens" },
];

export function AreaPicker({
  selectedBorough,
  selectedNeighborhood,
  onBoroughChange,
  onNeighborhoodChange,
  onClose,
}: AreaPickerProps) {
  const boroughLabel =
    BOROUGHS.find((b) => b.key === selectedBorough)?.label ?? "Area";

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop — not focusable */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="area-picker-title"
        tabIndex={-1}
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          zIndex: 50,
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "24px 20px",
          animation: "slideUp 0.25s ease",
          outline: "none",
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

        <div
          id="area-picker-title"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: 16,
            fontFamily: "'Georgia', serif",
          }}
        >
          Choose your area
        </div>

        {/* Borough tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {BOROUGHS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key !== selectedBorough) {
                  onBoroughChange(key);
                  onNeighborhoodChange(null);
                }
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 20,
                border: "1.5px solid",
                borderColor: key === selectedBorough ? "#e8531a" : "#e0e0e0",
                background:
                  key === selectedBorough ? "#e8531a" : "transparent",
                color: key === selectedBorough ? "#fff" : "#555",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Neighborhood chips */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            scrollbarWidth: "none",
          }}
        >
          {/* "Any" chip */}
          <button
            onClick={() => onNeighborhoodChange(null)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: 20,
              border: "1.5px solid",
              borderColor:
                selectedNeighborhood === null ? "#e8531a" : "#e0e0e0",
              background:
                selectedNeighborhood === null ? "#e8531a" : "transparent",
              color: selectedNeighborhood === null ? "#fff" : "#555",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Any {boroughLabel}
          </button>

          {BOROUGH_NEIGHBORHOODS[selectedBorough].map((n) => (
            <button
              key={n}
              onClick={() => onNeighborhoodChange(n)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 20,
                border: "1.5px solid",
                borderColor:
                  selectedNeighborhood === n ? "#e8531a" : "#e0e0e0",
                background:
                  selectedNeighborhood === n ? "#e8531a" : "transparent",
                color: selectedNeighborhood === n ? "#fff" : "#555",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Done button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "13px 0",
            background: "#e8531a",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </>
  );
}
