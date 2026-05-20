"use client";

import { useState, useEffect } from "react";
import { Users, CheckCircle2, Clock } from "lucide-react";
import { ApiClient, VotingProgress } from "@/api/client";
import { Button } from "@/components/button";

interface VotingProgressSummaryProps {
  sessionId: string;
  isHost: boolean;
  onCompleted?: () => void;
}

export function VotingProgressSummary({ sessionId, isHost, onCompleted }: VotingProgressSummaryProps) {
  const [progress, setProgress] = useState<VotingProgress | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const load = () => {
      ApiClient.sessions.getVotingProgress(sessionId).then(setProgress).catch(() => {});
    };
    load();
  }, [sessionId]);

  const handleForceComplete = async () => {
    if (!confirm("Complete the session now? This will finalize results even if not everyone has voted.")) return;
    setCompleting(true);
    try {
      await ApiClient.sessions.forceComplete(sessionId);
      onCompleted?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to complete session");
    } finally {
      setCompleting(false);
    }
  };

  if (!progress) return null;

  const pct = progress.joinedCount > 0
    ? Math.round((progress.submittedCount / progress.joinedCount) * 100)
    : 0;

  const deadlineDate = progress.votingDeadline ? new Date(progress.votingDeadline) : null;

  return (
    <div className="bg-white rounded-xl border border-stone-200">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
        <Users className="w-3.5 h-3.5 text-stone-500" />
        <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Voting progress</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Count + bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-stone-900 tabular-nums">
              {progress.submittedCount}
              <span className="text-base font-normal text-stone-400"> / {progress.joinedCount}</span>
            </span>
            <span className="text-xs text-stone-400">{pct}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5">
            <div
              className="bg-stone-900 rounded-full h-1.5 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Deadline */}
        {deadlineDate && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <Clock className="w-3 h-3" />
            <span>
              Deadline:{" "}
              {deadlineDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
              at {deadlineDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
        )}

        {/* Participant list */}
        <div className="space-y-1.5">
          {progress.participants.map((p) => (
            <div key={p.userId} className="flex items-center justify-between">
              <span className="text-sm text-stone-600 truncate">{p.userId}</span>
              {p.votingStatus === "SUBMITTED" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <span className="text-xs text-stone-300">pending</span>
              )}
            </div>
          ))}
        </div>

        {/* Host action */}
        {isHost && (
          <Button
            onClick={handleForceComplete}
            disabled={completing}
            size="sm"
            className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs"
          >
            {completing ? "Completing…" : "Complete Session Now"}
          </Button>
        )}
      </div>
    </div>
  );
}
