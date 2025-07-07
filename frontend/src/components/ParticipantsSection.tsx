"use client";

import { Button } from "@/components/button";
import { Progress } from "@/components/progress";
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
  startPressed: boolean;
  currentRound: number;
  roundTransitioning: boolean;
  sessionComplete: boolean;
  onStartSession: () => void;
  onCompleteRound1: () => void;
  onCompleteRound2: () => void;
}

export function ParticipantsSection({
  participants,
  likeProgressPct,
  // likedRestaurants,
  // restaurants,
  votingStatus,
  isHost,
  sessionStarted,
  startPressed,
  currentRound,
  roundTransitioning,
  sessionComplete,
  onStartSession,
  onCompleteRound1,
  onCompleteRound2,
}: ParticipantsSectionProps) {
  return (
    <section className="flex items-center justify-between">
      {/* Participants */}
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Participants
        </h2>
        <ul>
          {participants.map((p) => (
            <li key={p.userId}>
              {p.userId}
              {p.isHost && (
                <span className="ml-2 text-orange-600 font-semibold">(Host)</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Progress and Host Control Buttons */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">Voting Progress</span>
        <div className="flex items-center space-x-2">
          <Progress value={likeProgressPct} className="w-28" />
          <span className="text-sm font-medium text-gray-900">
            {votingStatus.totalVotesCast}/{votingStatus.totalPossibleVotes}
          </span>
        </div>
        
        {/* Host Control Buttons */}
        {isHost && (
          <>
            {/* Start Session Button */}
            {!sessionStarted && !startPressed && (
              <Button
                onClick={onStartSession}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
              >
                Start Voting Session
              </Button>
            )}

            {/* Complete Round 1 Button */}
            {sessionStarted && currentRound === 1 && !roundTransitioning && (
              <Button
                onClick={onCompleteRound1}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
              >
                Complete Round 1
              </Button>
            )}

            {/* Complete Round 2 Button */}
            {sessionStarted && currentRound === 2 && !roundTransitioning && !sessionComplete && (
              <Button
                onClick={onCompleteRound2}
                className="bg-gradient-to-r from-purple-500 to-green-500 text-white"
              >
                Finish Voting
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}