"use client";

import { useState, useEffect } from "react";
import { Trophy, Users, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
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
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 rounded-full border border-stone-300 border-t-stone-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Winner */}
      {summary.winnerName && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-stone-900">{summary.winnerName}</h2>
          <p className="text-sm text-stone-400 mt-1">The group has decided</p>
        </div>
      )}

      {/* Attendance */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
          <Users className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Attendance</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-stone-100 px-5 py-4">
          <div className="text-center pr-4">
            <p className="text-2xl font-semibold text-stone-900">{summary.goingCount}</p>
            <p className="text-xs text-stone-400 mt-0.5">Going</p>
          </div>
          <div className="text-center px-4">
            <p className="text-2xl font-semibold text-stone-900">{summary.maybeCount}</p>
            <p className="text-xs text-stone-400 mt-0.5">Maybe</p>
          </div>
          <div className="text-center pl-4">
            <p className="text-2xl font-semibold text-stone-900">{summary.notGoingCount}</p>
            <p className="text-xs text-stone-400 mt-0.5">Not going</p>
          </div>
        </div>
      </div>

      {/* Restaurant votes */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="px-5 py-3.5 border-b border-stone-100">
          <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Restaurant preferences</span>
        </div>
        <div className="divide-y divide-stone-100">
          {summary.restaurantVotes
            .sort((a, b) => b.votes - a.votes)
            .map((r, i) => (
              <div key={r.providerId} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-stone-900">{r.name}</span>
                </div>
                <span className="text-sm text-stone-500 tabular-nums">
                  {r.votes} vote{r.votes !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* RSVP details */}
      <div className="bg-white rounded-xl border border-stone-200">
        <div className="px-5 py-3.5 border-b border-stone-100">
          <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Responses</span>
        </div>
        <div className="divide-y divide-stone-100">
          {summary.rsvps.map((r) => (
            <div key={r.userId} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2.5">
                {r.rsvpStatus === "GOING" && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                {r.rsvpStatus === "MAYBE" && <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                {r.rsvpStatus === "NOT_GOING" && <XCircle className="w-4 h-4 text-stone-400 shrink-0" />}
                <span className="text-sm text-stone-700">{r.userId}</span>
              </div>
              {r.preferredRestaurantName && (
                <span className="text-xs text-stone-400">{r.preferredRestaurantName}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
