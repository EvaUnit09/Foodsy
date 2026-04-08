"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, HelpCircle, Send } from "lucide-react";
import { Button } from "@/components/button";
import { ApiClient, EventRestaurantDto } from "@/api/client";

interface EventRsvpFormProps {
  sessionId: string;
  restaurants: EventRestaurantDto[];
  onSubmitted: () => void;
}

type RsvpChoice = "GOING" | "NOT_GOING" | "MAYBE" | null;

export function EventRsvpForm({ sessionId, restaurants, onSubmitted }: EventRsvpFormProps) {
  const [rsvp, setRsvp] = useState<RsvpChoice>(null);
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rsvp) return;
    setSubmitting(true);
    try {
      await ApiClient.eventSessions.submitRsvp(sessionId, rsvp, preferredId);
      setSubmitted(true);
      onSubmitted();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center">
        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-green-800">RSVP Submitted!</h3>
        <p className="text-sm text-green-600 mt-1">Check back later to see the final result.</p>
      </div>
    );
  }

  const rsvpOptions: { value: RsvpChoice; label: string; icon: React.ReactNode; color: string; selectedColor: string }[] = [
    { value: "GOING", label: "Going", icon: <CheckCircle className="w-5 h-5" />, color: "border-gray-200 hover:border-green-300", selectedColor: "border-green-500 bg-green-50" },
    { value: "MAYBE", label: "Maybe", icon: <HelpCircle className="w-5 h-5" />, color: "border-gray-200 hover:border-yellow-300", selectedColor: "border-yellow-500 bg-yellow-50" },
    { value: "NOT_GOING", label: "Not Going", icon: <XCircle className="w-5 h-5" />, color: "border-gray-200 hover:border-red-300", selectedColor: "border-red-500 bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      {/* RSVP buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Are you going?</label>
        <div className="grid grid-cols-3 gap-2">
          {rsvpOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setRsvp(opt.value); if (opt.value === "NOT_GOING") setPreferredId(null); }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                rsvp === opt.value ? opt.selectedColor : opt.color
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                {opt.icon}
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant preference (only for Going/Maybe) */}
      {(rsvp === "GOING" || rsvp === "MAYBE") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Which restaurant do you prefer?</label>
          <div className="space-y-2">
            {restaurants.map((r) => (
              <button
                key={r.providerId}
                type="button"
                onClick={() => setPreferredId(r.providerId)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  preferredId === r.providerId
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-500">{r.address}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {r.rating > 0 && <span className="text-xs text-gray-600">{r.rating.toFixed(1)}</span>}
                  {r.priceLevel && <span className="text-xs text-gray-400">{r.priceLevel}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!rsvp || submitting}
        className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
      >
        <Send className="w-4 h-4 mr-2" />
        {submitting ? "Submitting..." : "Submit RSVP"}
      </Button>
    </div>
  );
}
