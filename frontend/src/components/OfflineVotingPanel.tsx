"use client";

import { useState } from "react";
import { Heart, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/button";
import { ApiClient } from "@/api/client";

interface OfflineRestaurant {
  id: number;
  providerId: string;
  name: string;
  category: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  priceRange?: string;
}

interface OfflineVotingPanelProps {
  sessionId: string;
  restaurants: OfflineRestaurant[];
  hasSubmitted: boolean;
  onSubmitted: () => void;
  deadline?: string;
}

export function OfflineVotingPanel({ sessionId, restaurants, hasSubmitted, onSubmitted, deadline }: OfflineVotingPanelProps) {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggleLike = (providerId: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (liked.size === 0) return;
    setSubmitting(true);
    try {
      await ApiClient.sessions.submitOfflineVotes(sessionId, Array.from(liked));
      onSubmitted();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to submit votes");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center">
        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-green-800">Votes Submitted!</h3>
        <p className="text-sm text-green-600 mt-1">Check back later to see the results.</p>
      </div>
    );
  }

  const deadlineDate = deadline ? new Date(deadline) : null;
  const isPastDeadline = deadlineDate ? new Date() > deadlineDate : false;

  if (isPastDeadline) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 text-center">
        <p className="text-gray-600">The voting deadline has passed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deadlineDate && (
        <div className="bg-orange-50 rounded-lg px-4 py-2 text-sm text-orange-700 text-center">
          Vote by: {deadlineDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} at {deadlineDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
      )}

      <div className="grid gap-3">
        {restaurants.map((r) => (
          <button
            key={r.providerId}
            onClick={() => toggleLike(r.providerId)}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
              liked.has(r.providerId)
                ? "border-red-400 bg-red-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{r.name}</p>
              <p className="text-xs text-gray-500 truncate">{r.address}</p>
              <div className="flex items-center space-x-2 mt-1">
                {r.rating && <span className="text-xs text-gray-600">{r.rating.toFixed(1)}</span>}
                {r.priceRange && <span className="text-xs text-gray-400">{r.priceRange}</span>}
                {r.category && <span className="text-xs text-gray-400">{r.category}</span>}
              </div>
            </div>
            <Heart
              className={`w-6 h-6 ml-3 flex-shrink-0 transition-colors ${
                liked.has(r.providerId)
                  ? "text-red-500 fill-red-500"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={liked.size === 0 || submitting}
        className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
      >
        <Send className="w-4 h-4 mr-2" />
        {submitting ? "Submitting..." : `Submit My Votes (${liked.size} liked)`}
      </Button>
    </div>
  );
}
