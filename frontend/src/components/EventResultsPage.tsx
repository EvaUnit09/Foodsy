"use client";

import { useState, useEffect } from "react";
import { Trophy, Users, CheckCircle, HelpCircle, XCircle } from "lucide-react";
import { ApiClient, EventSummary } from "@/api/client";

interface EventResultsPageProps {
  sessionId: string;
}

export function EventResultsPage({ sessionId }: EventResultsPageProps) {
  const [summary, setSummary] = useState<EventSummary | null>(null);

  useEffect(() => {
    ApiClient.eventSessions.getSummary(sessionId).then(setSummary).catch(() => {});
  }, [sessionId]);

  if (!summary) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Winner */}
      {summary.winnerName && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white text-center">
          <Trophy className="w-10 h-10 mx-auto mb-2" />
          <h2 className="text-2xl font-bold">{summary.winnerName}</h2>
          <p className="text-orange-100 mt-1">The group has decided!</p>
        </div>
      )}

      {/* Attendance */}
      <div className="bg-white rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-gray-900">Attendance</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-700">{summary.goingCount}</p>
            <p className="text-xs text-green-600">Going</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-yellow-700">{summary.maybeCount}</p>
            <p className="text-xs text-yellow-600">Maybe</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-700">{summary.notGoingCount}</p>
            <p className="text-xs text-red-600">Not Going</p>
          </div>
        </div>
      </div>

      {/* Restaurant votes */}
      <div className="bg-white rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Restaurant Preferences</h3>
        <div className="space-y-2">
          {summary.restaurantVotes.sort((a, b) => b.votes - a.votes).map((r, i) => (
            <div key={r.providerId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-orange-600 w-5">{i + 1}</span>
                <span className="text-sm font-medium text-gray-900">{r.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-700">{r.votes} vote{r.votes !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RSVP details */}
      <div className="bg-white rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Responses</h3>
        <div className="space-y-2">
          {summary.rsvps.map((r) => (
            <div key={r.userId} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                {r.rsvpStatus === "GOING" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {r.rsvpStatus === "MAYBE" && <HelpCircle className="w-4 h-4 text-yellow-500" />}
                {r.rsvpStatus === "NOT_GOING" && <XCircle className="w-4 h-4 text-red-500" />}
                <span className="text-sm text-gray-700">{r.userId}</span>
              </div>
              {r.preferredRestaurantName && (
                <span className="text-xs text-gray-500">{r.preferredRestaurantName}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
