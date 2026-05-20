"use client";

import { Trophy, Loader2, CheckCircle2, Info, Hourglass } from "lucide-react";
import { Restaurant } from "./RestaurantCard";

interface VotingStatus {
  allVotesIn: boolean;
  totalParticipants: number;
  participantsWithNoVotesLeft: number;
}

interface SessionStatusBannersProps {
  sessionComplete: boolean;
  winner: Restaurant | null;
  roundTransitioning: boolean;
  currentRound: number;
  sessionStarted: boolean;
  votingStatus: VotingStatus;
  isHost: boolean;
  likesPerUser: number;
}

export function SessionStatusBanners({
  sessionComplete,
  winner,
  roundTransitioning,
  currentRound,
  sessionStarted,
  votingStatus,
  isHost,
  likesPerUser,
}: SessionStatusBannersProps) {
  return (
    <div className="space-y-3">
      {/* Winner */}
      {sessionComplete && winner && (
        <div className="flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
          <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-stone-900">
              {winner.name} wins
            </p>
            <p className="text-xs text-stone-500">
              {winner.voteCount || winner.likeCount || 0} votes · {winner.address}
            </p>
          </div>
        </div>
      )}

      {/* Round transition */}
      {roundTransitioning && !sessionComplete && (
        <div className="flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl">
          <Loader2 className="w-4 h-4 text-stone-400 animate-spin shrink-0" />
          <p className="text-sm text-stone-600">
            Moving to {currentRound === 1 ? "Round 2" : "results"}…
          </p>
        </div>
      )}

      {/* All votes in — host prompt */}
      {sessionStarted && !sessionComplete && !roundTransitioning && votingStatus.allVotesIn && isHost && (
        <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-200 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-stone-900">All votes are in</p>
            <p className="text-xs text-stone-500">
              {votingStatus.participantsWithNoVotesLeft}/{votingStatus.totalParticipants} participants done ·{" "}
              Ready to move to {currentRound === 1 ? "Round 2" : "results"}
            </p>
          </div>
        </div>
      )}

      {/* Round instructions */}
      {sessionStarted && !sessionComplete && !roundTransitioning && !votingStatus.allVotesIn && (
        <div className="flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl">
          <Info className="w-4 h-4 text-stone-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-stone-900">
              {currentRound === 1
                ? "Round 1 — vote for your favorites"
                : "Round 2 — your final pick"}
            </p>
            <p className="text-xs text-stone-500">
              {currentRound === 1
                ? `${likesPerUser} like${likesPerUser !== 1 ? "s" : ""} per person`
                : "1 vote only"}{" "}
              · {votingStatus.participantsWithNoVotesLeft}/{votingStatus.totalParticipants} done
            </p>
          </div>
        </div>
      )}

      {/* Non-host waiting */}
      {!sessionStarted && !sessionComplete && !isHost && (
        <div className="flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl">
          <Hourglass className="w-4 h-4 text-stone-400 shrink-0" />
          <p className="text-sm text-stone-600">Waiting for the host to start</p>
        </div>
      )}
    </div>
  );
}
