"use client";

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
    <>
      {/* Session Complete Banner */}
      {sessionComplete && winner && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-100 to-blue-100 border border-green-300 rounded-lg text-center shadow-lg">
          <div className="text-2xl font-bold text-green-800 mb-2">🎉 We Have a Winner! 🎉</div>
          <div className="text-lg text-green-700">
            <strong>{winner.name}</strong> - {winner.address}
          </div>
          <div className="text-sm text-green-600 mt-1">
            Final votes: {winner.likeCount}
          </div>
        </div>
      )}

      {/* Round Transition Banner */}
      {roundTransitioning && !sessionComplete && (
        <div className="mb-6 p-4 bg-purple-100 border border-purple-300 text-purple-900 rounded-lg text-center text-lg font-semibold shadow animate-pulse">
          🔄 Transitioning to Round {currentRound === 1 ? 2 : 'Complete'}...
        </div>
      )}

      {/* All Votes In banner */}
      {sessionStarted && !sessionComplete && !roundTransitioning && votingStatus.allVotesIn && isHost && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-900 rounded-lg text-center text-lg font-semibold shadow animate-pulse">
          🎉 All Votes Are In! ({votingStatus.participantsWithNoVotesLeft}/{votingStatus.totalParticipants} participants done)
          <br />
          <span className="text-sm font-normal">Ready to proceed to {currentRound === 1 ? 'Round 2' : 'Results'}?</span>
        </div>
      )}

      {/* Round-specific banners */}
      {sessionStarted && !sessionComplete && !roundTransitioning && !votingStatus.allVotesIn && (
        <div className={`mb-6 p-4 rounded-lg text-center text-lg font-semibold shadow ${
          currentRound === 1 
            ? 'bg-blue-100 border border-blue-300 text-blue-900'
            : 'bg-purple-100 border border-purple-300 text-purple-900'
        }`}>
          {currentRound === 1 
            ? `Round 1: Vote for your favorites! (${likesPerUser} likes per person)`
            : 'Round 2: Final vote! Choose your top pick (1 vote only)'
          }
          <div className="text-sm font-normal mt-1">
            {votingStatus.participantsWithNoVotesLeft}/{votingStatus.totalParticipants} participants have finished voting
          </div>
        </div>
      )}

      {/* Waiting for host message for non-hosts */}
      {!sessionStarted && !isHost && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-lg text-center text-lg font-semibold shadow">
          Waiting for host to start the session...
        </div>
      )}
    </>
  );
}