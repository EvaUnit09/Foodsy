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

  // Options: null = "Any", then each neighborhood
  const options: (string | null)[] = [null, ...BOROUGH_NEIGHBORHOODS[selectedBorough]];
  const currentIndex = options.indexOf(selectedNeighborhood);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  function prev() {
    if (safeIndex > 0) onNeighborhoodChange(options[safeIndex - 1]);
  }

  function next() {
    if (safeIndex < options.length - 1) onNeighborhoodChange(options[safeIndex + 1]);
  }

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, safeIndex, options.length]);

  const displayLabel = selectedNeighborhood ?? `Any ${boroughLabel}`;

  return (
    <>
      {/* Backdrop */}
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
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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
                background: key === selectedBorough ? "#e8531a" : "transparent",
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

        {/* Neighborhood cycler */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#f9f5f2",
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <button
            onClick={prev}
            disabled={safeIndex === 0}
            aria-label="Previous neighborhood"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1.5px solid #e0e0e0",
              background: safeIndex === 0 ? "#f0f0f0" : "#fff",
              color: safeIndex === 0 ? "#ccc" : "#555",
              fontSize: 18,
              cursor: safeIndex === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ‹
          </button>

          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#1a1a1a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayLabel}
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
              {safeIndex + 1} of {options.length}
            </div>
          </div>

          <button
            onClick={next}
            disabled={safeIndex === options.length - 1}
            aria-label="Next neighborhood"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1.5px solid #e0e0e0",
              background: safeIndex === options.length - 1 ? "#f0f0f0" : "#fff",
              color: safeIndex === options.length - 1 ? "#ccc" : "#555",
              fontSize: 18,
              cursor: safeIndex === options.length - 1 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ›
          </button>
        </div>

        {/* Done button */}
        <button
          onClick={onClose}
          style={{
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
