"use client";

import { PlusCircle, ThumbsUp, UtensilsCrossed } from "lucide-react";

const STEPS = [
  { icon: PlusCircle, step: "01", title: "Create a Session", desc: "Pick a neighborhood and invite your crew with a code." },
  { icon: ThumbsUp, step: "02", title: "Everyone Votes", desc: "Swipe through restaurants. Likes are tallied in real time." },
  { icon: UtensilsCrossed, step: "03", title: "Eat Together", desc: "The winner is revealed. No arguments, just dinner." },
];

export function HowItWorks({ onStartSession }: { onStartSession: () => void }) {
  return (
    <section className="max-w-7xl mx-auto" style={{ padding: "64px 32px" }}>
      <div className="text-center" style={{ marginBottom: 48 }}>
        <h2
          className="font-extrabold text-[#1a1a1a]"
          style={{ fontFamily: "'Georgia', serif", fontSize: 32, fontWeight: 800, margin: "0 0 10px" }}
        >
          How It Works
        </h2>
        <p className="text-[#888888]" style={{ fontSize: 15, margin: 0 }}>
          Three steps to your next great meal together
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        {STEPS.map(({ icon: Icon, step, title, desc }) => (
          <div
            key={step}
            className="relative overflow-hidden bg-white"
            style={{
              borderRadius: 16,
              padding: "28px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
          >
            {/* Step number watermark */}
            <span
              className="absolute top-4 right-4 font-black text-[#e8531a] select-none leading-none"
              style={{ fontSize: 40, opacity: 0.06 }}
              aria-hidden="true"
            >
              {step}
            </span>
            <div
              className="flex items-center justify-center mb-4"
              style={{ width: 40, height: 40, background: "#fff3ee", borderRadius: 10 }}
            >
              <Icon className="w-5 h-5 text-[#e8531a]" />
            </div>
            <h3 className="font-bold text-[#1a1a1a] mb-2" style={{ fontSize: 16 }}>{title}</h3>
            <p className="text-[#777777] m-0" style={{ fontSize: 13, lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          className="text-white font-bold cursor-pointer"
          style={{
            background: "#e8531a",
            borderRadius: 10,
            padding: "14px 32px",
            fontSize: 15,
            border: "none",
            boxShadow: "0 4px 14px rgba(232,83,26,0.35)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
          onClick={onStartSession}
        >
          Start a Session
        </button>
      </div>
    </section>
  );
}
