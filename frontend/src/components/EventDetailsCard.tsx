"use client";

import { useState } from "react";
import { Copy, Check, Link2, Crown, MapPin, Clock } from "lucide-react";

interface EventDetailsCardProps {
  sessionId: string;
  eventName?: string;
  eventDescription?: string;
  creatorId?: string;
  diningBorough?: string;
  diningNeighborhood?: string;
  votingDeadline?: string;
  joinCode?: string;
  isHost: boolean;
}

function formatDeadline(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function EventDetailsCard({
  sessionId,
  eventName,
  eventDescription,
  creatorId,
  diningBorough,
  diningNeighborhood,
  votingDeadline,
  joinCode,
}: EventDetailsCardProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareLink = typeof window !== "undefined"
    ? `${window.location.origin}/sessions/${sessionId}`
    : `/sessions/${sessionId}`;

  const copyCode = async () => {
    if (!joinCode) return;
    await navigator.clipboard.writeText(joinCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const deadline = formatDeadline(votingDeadline);
  const location = [diningNeighborhood, diningBorough].filter(Boolean).join(", ");

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 border-b border-stone-100">
        <h1 className="text-xl font-semibold text-stone-900 leading-snug">
          {eventName || "Food Event"}
        </h1>
        {eventDescription && (
          <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">{eventDescription}</p>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Details */}
        <div className="space-y-2.5">
          {creatorId && (
            <div className="flex items-center gap-2.5 text-sm text-stone-600">
              <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Hosted by <span className="font-medium text-stone-900">@{creatorId}</span></span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2.5 text-sm text-stone-600">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>Eating in <span className="font-medium text-stone-900">{location}</span></span>
            </div>
          )}
          {deadline && (
            <div className="flex items-center gap-2.5 text-sm text-stone-600">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>Vote by <span className="font-medium text-stone-900">{deadline}</span></span>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100" />

        {/* Share section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Share</p>
          {joinCode && (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-stone-50 rounded-xl px-4 py-2.5 border border-stone-100">
                <span className="text-xs text-stone-400 block leading-none mb-0.5">Join Code</span>
                <span className="text-lg font-bold tracking-widest text-stone-900 font-mono">{joinCode}</span>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-700 transition-colors"
              >
                {codeCopied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                {codeCopied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-medium text-stone-600 transition-colors"
          >
            {linkCopied ? <Check className="w-4 h-4 text-emerald-700" /> : <Link2 className="w-4 h-4" />}
            {linkCopied ? "Link copied" : "Copy invite link"}
          </button>
        </div>
      </div>
    </div>
  );
}
