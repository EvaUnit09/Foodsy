"use client";

import { Button } from "@/components/button";
import { Progress } from "@/components/progress";
import { Crown } from "lucide-react";
import { Restaurant } from "./RestaurantCard";

interface Participant {
  userId: string;
  isHost: boolean;
}

interface VotingStatus {
  allVotesIn: boolean;
  totalParticipants: number;
  participantsWithNoVotesLeft: number;
  totalVotesCast: number;
  totalPossibleVotes: number;
  currentRound: number;
}

interface ParticipantsSectionProps {
  participants: Participant[];
  likeProgressPct: number;
  likedRestaurants: Restaurant[];
  restaurants: Restaurant[];
  votingStatus: VotingStatus;
  isHost: boolean;
  sessionStarted: boolean;
  currentRound: number;
  roundTransitioning: boolean;
  sessionComplete: boolean;
  onCompleteRound1: () => void;
  onCompleteRound2: () => void;
}

export function ParticipantsSection({
  participants,
  likeProgressPct,
  votingStatus,
  isHost,
  sessionStarted,
  currentRound,
  roundTransitioning,
  sessionComplete,
  onCompleteRound1,
  onCompleteRound2,
}: ParticipantsSectionProps) {
  return (
    <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-stone-200 rounded-xl">
      {/* Participants list */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-stone-400 uppercase tracking-wide mr-1">In session</span>
        {participants.map((p) => (
          <div
            key={p.userId}
            className="flex items-center gap-1 px-2.5 py-1 bg-stone-50 rounded-lg border border-stone-100"
          >
            {p.isHost && <Crown className="w-3 h-3 text-amber-600" />}
            <span className="text-xs font-medium text-stone-700">{p.userId}</span>
          </div>
        ))}
      </div>

      {/* Progress + host controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Progress value={likeProgressPct} className="w-24 h-1.5" />
          <span className="text-xs tabular-nums text-stone-500 whitespace-nowrap">
            {votingStatus.totalVotesCast}/{votingStatus.totalPossibleVotes} votes
          </span>
        </div>

        {isHost && sessionStarted && !roundTransitioning && !sessionComplete && (
          currentRound === 1 ? (
            <Button
              onClick={onCompleteRound1}
              size="sm"
              className="bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs px-3 h-8 whitespace-nowrap"
            >
              End Round 1
            </Button>
          ) : (
            <Button
              onClick={onCompleteRound2}
              size="sm"
              className="bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs px-3 h-8 whitespace-nowrap"
            >
              Finish Voting
            </Button>
          )
        )}
      </div>
    </section>
  );
}
