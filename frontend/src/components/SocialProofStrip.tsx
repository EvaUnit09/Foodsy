"use client";

export function SocialProofStrip() {
  const stats = [
    { value: "2,400+", label: "Sessions Started" },
    { value: "18,000+", label: "Votes Cast" },
    { value: "340+", label: "Restaurants Discovered" },
    { value: "12", label: "Active Sessions Now" },
  ];
  return (
    <section className="bg-white border-y border-[#eee]" style={{ padding: "28px 32px" }}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-4">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div
              className="font-extrabold text-stone-900"
              style={{ fontSize: 40, letterSpacing: "-0.5px" }}
            >
              {s.value}
            </div>
            <div className="text-[#888888] mt-1" style={{ fontSize: 15 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
