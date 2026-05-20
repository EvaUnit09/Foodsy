"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation2 } from "lucide-react";
import { ApiClient, RecommendationResult } from "@/api/client";

interface GroupRecommendationsPanelProps {
  sessionId: string;
}

export function GroupRecommendationsPanel({ sessionId }: GroupRecommendationsPanelProps) {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.sessions.getRecommended(sessionId)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className="flex items-center gap-2 text-stone-400 text-sm">
          <div className="w-3.5 h-3.5 rounded-full border border-stone-300 border-t-stone-600 animate-spin" />
          <span>Finding nearby options…</span>
        </div>
      </div>
    );
  }

  if (!result || result.restaurants.length === 0) {
    if (result && result.participantsWithLocation === 0) {
      return (
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <div className="flex items-center gap-2 text-stone-500 text-sm">
            <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
            <span>
              {result.totalParticipants > 1
                ? "No participants have set their home location yet."
                : "Set your home location in your profile for location-based recommendations."}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
        <Navigation2 className="w-3.5 h-3.5 text-stone-500" />
        <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Easy to get to</span>
        <span className="text-xs text-stone-400 ml-auto">
          {result.participantsWithLocation}/{result.totalParticipants} locations
        </span>
      </div>
      <div className="divide-y divide-stone-100">
        {result.restaurants.map((r, i) => (
          <div
            key={r.providerId}
            className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-stone-400 w-4 shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{r.name}</p>
                <p className="text-xs text-stone-400">
                  {r.category}{r.priceLevel ? ` · ${r.priceLevel}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              {r.rating && (
                <p className="text-sm font-medium text-stone-700">{r.rating.toFixed(1)}</p>
              )}
              <p className="text-xs text-stone-400">{r.distanceFromCentroidKm} km</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
