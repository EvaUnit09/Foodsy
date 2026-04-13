"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold leading-tight">
          {eventName || "Food Event"}
        </h1>
        {eventDescription && (
          <p className="mt-2 text-purple-100 text-sm leading-relaxed">
            {eventDescription}
          </p>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Details row */}
        <div className="space-y-2 text-sm">
          {creatorId && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-base">👑</span>
              <span>Hosted by <span className="font-semibold">@{creatorId}</span></span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-base">📍</span>
              <span>Eating in <span className="font-semibold">{location}</span></span>
            </div>
          )}
          {deadline && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-base">⏰</span>
              <span>Vote by <span className="font-semibold">{deadline}</span></span>
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Share section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Share</p>
          {joinCode && (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
                <span className="text-xs text-gray-400 block leading-none mb-0.5">Join Code</span>
                <span className="text-lg font-bold tracking-widest text-gray-900">{joinCode}</span>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition"
              >
                {codeCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {codeCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
          >
            {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
            {linkCopied ? "Link copied!" : "Copy invite link"}
          </button>
        </div>
      </div>
    </div>
  );
}
