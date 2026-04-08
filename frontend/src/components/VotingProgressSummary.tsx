"use client";

import { useState, useEffect } from "react";
import { Users, CheckCircle, Clock } from "lucide-react";
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

  const deadlineDate = progress.votingDeadline ? new Date(progress.votingDeadline) : null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-[rgba(0,0,0,0.06)]">
      <div className="flex items-center space-x-2 mb-3">
        <Users className="w-4 h-4 text-orange-600" />
        <h3 className="text-sm font-semibold text-gray-900">Voting Progress</h3>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-gray-900">
          {progress.submittedCount} / {progress.joinedCount}
        </span>
        <span className="text-sm text-gray-500">have voted</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="bg-orange-500 rounded-full h-2 transition-all"
          style={{ width: `${progress.joinedCount > 0 ? (progress.submittedCount / progress.joinedCount) * 100 : 0}%` }}
        />
      </div>

      {deadlineDate && (
        <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
          <Clock className="w-3 h-3" />
          <span>Deadline: {deadlineDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {deadlineDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
        </div>
      )}

      <div className="space-y-1">
        {progress.participants.map((p) => (
          <div key={p.userId} className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-700 truncate">{p.userId}</span>
            {p.votingStatus === "SUBMITTED" ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <span className="text-xs text-gray-400">waiting</span>
            )}
          </div>
        ))}
      </div>

      {isHost && (
        <Button
          onClick={handleForceComplete}
          disabled={completing}
          className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white"
          size="sm"
        >
          {completing ? "Completing..." : "Complete Session Now"}
        </Button>
      )}
    </div>
  );
}
