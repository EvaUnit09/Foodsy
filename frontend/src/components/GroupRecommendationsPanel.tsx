"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation } from "lucide-react";
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
      <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.06)] mb-4">
        <div className="flex items-center space-x-2 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
          <span>Finding nearby restaurants...</span>
        </div>
      </div>
    );
  }

  if (!result || result.restaurants.length === 0) {
    if (result && result.participantsWithLocation < 2) {
      return (
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200 mb-4">
          <div className="flex items-center space-x-2 text-orange-700 text-sm">
            <MapPin className="w-4 h-4" />
            <span>
              {result.participantsWithLocation === 0
                ? "No participants have set their home location yet."
                : `Only ${result.participantsWithLocation} of ${result.totalParticipants} participants have a location set.`}
              {" "}Set your location in your profile for group recommendations.
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[rgba(0,0,0,0.06)] mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <Navigation className="w-4 h-4 text-orange-600" />
        <h3 className="text-sm font-semibold text-gray-900">Easy to Get To</h3>
        <span className="text-xs text-gray-400">
          Based on {result.participantsWithLocation} of {result.totalParticipants} locations
        </span>
      </div>
      <div className="space-y-2">
        {result.restaurants.map((r, i) => (
          <div
            key={r.providerId}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-orange-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-orange-600 w-5">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-500">{r.category}{r.priceLevel ? ` · ${r.priceLevel}` : ""}</p>
              </div>
            </div>
            <div className="text-right">
              {r.rating && (
                <span className="text-xs font-medium text-gray-700">{r.rating.toFixed(1)}</span>
              )}
              <p className="text-xs text-gray-400">{r.distanceFromCentroidKm} km</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
