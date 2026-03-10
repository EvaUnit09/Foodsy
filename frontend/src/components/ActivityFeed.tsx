"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

const MESSAGES = [
  "A group in Brooklyn just voted on 6 restaurants",
  "12 sessions happening in NYC right now",
  "A crew in Manhattan narrowed it down to 2 spots",
  "Friends in Queens just started a session",
  "A group just agreed on ramen in the East Village",
  "8 people voted — the winner was Thai food",
  "Someone in Williamsburg just created a session",
];

export function ActivityFeed() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-white border-t border-[#e5e5e5] py-8 px-8">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide">Live activity</span>
        </div>
        <p
          className={`text-sm text-[#666666] text-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        >
          <MapPin className="inline w-3.5 h-3.5 text-[#e8531a] mr-1 -mt-0.5" />
          {MESSAGES[index]}
        </p>
      </div>
    </section>
  );
}
