"use client";

export function FinalCTA({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section className="px-8 pb-16">
      <div
        className="max-w-[860px] mx-auto text-center"
        style={{
          background: "linear-gradient(135deg, #e8531a 0%, #c94010 100%)",
          borderRadius: 20,
          padding: "48px 40px",
          boxShadow: "0 12px 40px rgba(232,83,26,0.25)",
        }}
      >
        <h2
          className="text-white mb-2"
          style={{ fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}
        >
          Stop Debating. Start Eating.
        </h2>
        <p
          className="mb-7"
          style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, margin: "0 0 28px", lineHeight: 1.6 }}
        >
          Join thousands of groups who&apos;ve ended the dinner debate for good.
        </p>
        <button
          className="font-bold cursor-pointer"
          style={{
            background: "#fff",
            color: "#e8531a",
            border: "none",
            borderRadius: 10,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 700,
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          onClick={onSignUp}
        >
          + Sign Up with Google — It&apos;s Free
        </button>
      </div>
    </section>
  );
}
