"use client";

import { useRouter } from "next/navigation";

export default function DiscoverPage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fdf6f0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          background: "#e8531a",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <span style={{ color: "#fff", fontSize: 28 }}>🍽</span>
      </div>
      <h1
        style={{
          fontFamily: "'Georgia', serif",
          fontSize: 28,
          fontWeight: 800,
          color: "#1a1a1a",
          margin: 0,
          marginBottom: 12,
        }}
      >
        Discover
      </h1>
      <p style={{ fontSize: 15, color: "#888", margin: 0, marginBottom: 32, maxWidth: 380 }}>
        Restaurant discovery is coming soon. Explore trending spots and build your favorites list.
      </p>
      <button
        onClick={() => router.push("/")}
        style={{
          background: "#e8531a",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          borderRadius: 10,
          padding: "11px 24px",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
      >
        Back to Home
      </button>
    </div>
  );
}
