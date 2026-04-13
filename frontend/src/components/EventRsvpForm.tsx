"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle, XCircle, HelpCircle, Send, Star } from "lucide-react";
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

  const rsvpOptions: {
    value: RsvpChoice;
    label: string;
    icon: React.ReactNode;
    color: string;
    selectedColor: string;
  }[] = [
    {
      value: "GOING",
      label: "Going",
      icon: <CheckCircle className="w-5 h-5" />,
      color: "border-gray-200 hover:border-green-300",
      selectedColor: "border-green-500 bg-green-50",
    },
    {
      value: "MAYBE",
      label: "Maybe",
      icon: <HelpCircle className="w-5 h-5" />,
      color: "border-gray-200 hover:border-yellow-300",
      selectedColor: "border-yellow-500 bg-yellow-50",
    },
    {
      value: "NOT_GOING",
      label: "Not Going",
      icon: <XCircle className="w-5 h-5" />,
      color: "border-gray-200 hover:border-red-300",
      selectedColor: "border-red-500 bg-red-50",
    },
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
              onClick={() => {
                setRsvp(opt.value);
                if (opt.value === "NOT_GOING") setPreferredId(null);
              }}
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
      {(rsvp === "GOING" || rsvp === "MAYBE") && restaurants.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Which restaurant do you prefer?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {restaurants.map((r) => {
              const isSelected = preferredId === r.providerId;
              const photo = r.photos?.[0];
              return (
                <button
                  key={r.providerId}
                  type="button"
                  onClick={() => setPreferredId(isSelected ? null : r.providerId)}
                  className={`text-left rounded-2xl border-2 overflow-hidden transition-all shadow-sm hover:shadow-md ${
                    isSelected
                      ? "border-orange-500 ring-2 ring-orange-200"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  {/* Photo */}
                  <div className="relative w-full aspect-video bg-gray-100">
                    {photo ? (
                      <Image
                        src={photo}
                        alt={r.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-400 text-sm">No photo</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 leading-tight">{r.name}</p>
                    {r.category && (
                      <p className="text-xs text-orange-600 font-medium mt-0.5">{r.category}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.address}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {r.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-700">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {r.rating.toFixed(1)}
                        </span>
                      )}
                      {r.priceLevel && (
                        <span className="text-xs text-gray-400">{r.priceLevel}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
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
