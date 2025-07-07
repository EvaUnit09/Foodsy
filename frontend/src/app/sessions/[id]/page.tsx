"use client";
import { useSessionWebSocket } from "@/hooks/useWebSockethook";
import { useParams } from "next/navigation";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import { useSessionVoting } from "@/hooks/useSessionVoting";
import { useAuth } from "@/contexts/AuthContext";
import { RestaurantCard, Restaurant } from "@/components/RestaurantCard";
import { SessionHeader } from "@/components/SessionHeader";
import { SessionStatusBanners } from "@/components/SessionStatusBanners";
import { ParticipantsSection } from "@/components/ParticipantsSection";
import { RestaurantNavigation } from "@/components/RestaurantNavigation";
import { FinalResultsScreen } from "@/components/FinalResultsScreen";
import { VoteType } from "@/api/voteApi";

/* -------------------- types & constants ----------------------- */

const API_BASE_URL = "http://localhost:8080/api";
const IMAGES_LIMIT = 6;
const INITIAL_TIMER = { minutes: 0, seconds: 0 };

/* ----------------------- api helpers ----------------------------- */
const fetchRestaurantsWithPhotos = async (
  sessionId: number,
): Promise<Restaurant[]> => {
  const base: Restaurant[] = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}/restaurants`,
  ).then((r) => r.json());

  return Promise.all(
    base.map(async (restaurant) => {
      try {
        const photoIds: string[] = await fetch(
          `${API_BASE_URL}/restaurants/${restaurant.providerId}/photos?limit=${IMAGES_LIMIT}`,
        ).then((pr) => pr.json());
        
        // Convert photo IDs to proxy URLs
        const photos = photoIds.map(photoId => 
          `${API_BASE_URL}/restaurants/photos/${restaurant.providerId}/${photoId}?maxHeightPx=800&maxWidthPx=800`
        );
        
        return { ...restaurant, photos };
      } catch {
        return { ...restaurant, photos: [] };
      }
    }),
  );
};

const fetchParticipants = (sessionId: number) =>
  fetch(`${API_BASE_URL}/sessions/${sessionId}/participants`).then((res) =>
    res.json(),
  );

const fetchSession = (sessionId: number) => {
  return fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    credentials: 'include'
  }).then((res) => res.json());
};


/* --------------------------- component --------------------------- */
export default function SessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);

  // All hooks at the top!
  const [session, setSession] = useState<{ creatorId: string; round: number; likesPerUser: number; status: string; isHost?: boolean } | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurantIdx, setCurrentRestaurantIdx] = useState(0);
  const [participants, setParticipants] = useState<{ userId: string; isHost: boolean }[]>([]);
  const [likedRestaurants, setLikedRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIMER);
  
  // Round management state
  const [currentRound, setCurrentRound] = useState(1);
  const [roundTransitioning, setRoundTransitioning] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [votingStatus, setVotingStatus] = useState<{allVotesIn: boolean; totalParticipants: number; participantsWithNoVotesLeft: number; totalVotesCast: number; totalPossibleVotes: number; currentRound: number}>({allVotesIn: false, totalParticipants: 0, participantsWithNoVotesLeft: 0, totalVotesCast: 0, totalPossibleVotes: 0, currentRound: 1});

  const { event, send } = useSessionWebSocket(sessionId);

  const bumpLikeLocally = useCallback(
    ({ providerId }: { providerId: string }) => {
      setRestaurants((prev) =>
        prev.map((r) =>
          r.providerId === providerId
            ? { ...r, likeCount: r.likeCount + 1 }
            : r,
        ),
      );
      setLikedRestaurants((prev) => {
        if (prev.some((r) => r.providerId === providerId)) return prev;
        const target = restaurants.find((r) => r.providerId === providerId);
        return target
          ? [...prev, { ...target, likeCount: target.likeCount + 1 }]
          : prev;
      });
    },
    [restaurants, setLikedRestaurants],
  );

  const undoLikeLocally = useCallback(
    ({ providerId }: { providerId: string }) => {
      setRestaurants((prev) =>
        prev.map((r) =>
          r.providerId === providerId
            ? { ...r, likeCount: Math.max(r.likeCount - 1, 0) }
            : r,
        ),
      );
      setLikedRestaurants((prev) =>
        prev.filter((r) => r.providerId !== providerId),
      );
    },
    [setLikedRestaurants],
  );

  const { isLoading: authLoading } = useAuth();
  const { hasVoted, handleVote, remainingVotes } = useSessionVoting({
    sessionId,
    currentRound,
    bumpLikeLocally,
    undoLikeLocally,
  });

  // Track if session has started
  const [sessionStarted, setSessionStarted] = useState(false);
  // Track if the host has pressed start (for instant feedback)
  const [startPressed, setStartPressed] = useState(false);

  // Data fetching effect
  useEffect(() => {
    if (!sessionId || authLoading) return; // Wait for auth to load
    
    (async () => {
      const [enriched, fetchedParticipants, sessionObj] = await Promise.all([
        fetchRestaurantsWithPhotos(sessionId),
        fetchParticipants(sessionId),
        fetchSession(sessionId),
      ]);
      setRestaurants(enriched);
      setParticipants(Array.isArray(fetchedParticipants) ? fetchedParticipants : []);
      setSession(sessionObj);
      
      // Initialize round state from session
      if (sessionObj) {
        setCurrentRound(sessionObj.round || 1);
      }
      
      setCurrentRestaurantIdx(0);
      setLoading(false);
    })();
  }, [sessionId, authLoading]);

  // Voting status polling effect
  useEffect(() => {
    if (!sessionId || !sessionStarted || sessionComplete || roundTransitioning) return;
    
    const fetchVotingStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/voting-status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setVotingStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch voting status:', error);
      }
    };

    fetchVotingStatus();
    const interval = setInterval(fetchVotingStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [sessionId, sessionStarted, sessionComplete, roundTransitioning, remainingVotes]);

  // WebSocket event effect
  useEffect(() => {
    if (!event) return;
    switch (event.type) {
      case "sessionStarted":
        setSessionStarted(true);
        break;
      case "timerUpdate":
        setTimeLeft({
          minutes: Math.floor(event.payload.millisLeft / 60000),
          seconds: Math.floor((event.payload.millisLeft % 60000) / 1000),
        });
        break;
      case "roundTransition":
        setCurrentRound(event.payload.newRound);
        setRoundTransitioning(true);
        // Refetch restaurants for new round without page reload
        if (event.payload.newRound === 2) {
          setTimeout(async () => {
            try {
              // Refetch restaurants for round 2
              const enriched = await fetchRestaurantsWithPhotos(sessionId);
              setRestaurants(enriched);
              setCurrentRestaurantIdx(0);
              setRoundTransitioning(false);
            } catch (error) {
              console.error('Failed to load round 2 restaurants:', error);
              setRoundTransitioning(false);
            }
          }, 2000);
        }
        break;
      case "sessionComplete":
        setSessionComplete(true);
        setWinner(event.payload.winner);
        break;
      case "roundStatus":
        setCurrentRound(event.payload.currentRound);
        break;
      default:
        break;
    }
  }, [event]);

  /* -------------------- derived state --------------------------- */
  const likeProgressPct = useMemo(
    () =>
      votingStatus.totalPossibleVotes > 0
        ? (votingStatus.totalVotesCast / votingStatus.totalPossibleVotes) * 100
        : 0,
    [votingStatus.totalVotesCast, votingStatus.totalPossibleVotes],
  );

  const currentRestaurant = restaurants[currentRestaurantIdx];

  const alreadyVoted = useMemo(
    () => (currentRestaurant ? hasVoted(currentRestaurant.providerId) : false),
    [currentRestaurant, hasVoted],
  );

  // Check if user can make more LIKE votes
  const canLike = useMemo(() => {
    if (alreadyVoted) return false;
    if (currentRound === 2) return remainingVotes > 0; // Round 2: strict 1 vote limit
    return remainingVotes > 0; // Round 1: uses session's likesPerUser limit
  }, [alreadyVoted, currentRound, remainingVotes]);

  // Normalize host check
  const isHost = Boolean(session?.isHost);

  // Handler for host to start session
  const handleStartSession = () => {
    send(`/app/session/${sessionId}/start`, {});
    setStartPressed(true);
    setSessionStarted(true); // Optimistically update for host
  };

  // Handler for host to complete round 1 and transition to round 2
  const handleCompleteRound1 = () => {
    send(`/app/session/${sessionId}/completeRound1`, {});
    setRoundTransitioning(true);
  };

  // Handler for host to complete round 2 and finish session
  const handleCompleteRound2 = () => {
    send(`/app/session/${sessionId}/completeRound2`, {});
  };

  /* -------------------- navigation helpers ---------------------- */
  const toNextRestaurant = useCallback(
    () =>
      setCurrentRestaurantIdx((i) => Math.min(i + 1, restaurants.length - 1)),
    [restaurants.length],
  );
  const toPrevRestaurant = useCallback(
    () => setCurrentRestaurantIdx((i) => Math.max(i - 1, 0)),
    [],
  );


  const handleVoteWrapper = useCallback((type: VoteType) => {
    if (!currentRestaurant) return;
    
    handleVote({
      type,
      providerId: currentRestaurant.providerId,
      currentRestaurantObj: currentRestaurant,
    });
  }, [currentRestaurant, handleVote]);

  /* --------------------------- UI ------------------------------- */
  if (loading) return <div className="p-10">Loading…</div>;

  // Show final results screen when session is complete
  if (sessionComplete && winner) {
    return <FinalResultsScreen winner={winner} sessionId={sessionId} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <SessionHeader 
        sessionId={sessionId}
        currentRound={currentRound}
        timeLeft={timeLeft}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <SessionStatusBanners
          sessionComplete={sessionComplete}
          winner={winner}
          roundTransitioning={roundTransitioning}
          currentRound={currentRound}
          sessionStarted={sessionStarted}
          votingStatus={votingStatus}
          isHost={isHost}
          likesPerUser={session?.likesPerUser || 0}
        />

        <ParticipantsSection
          participants={participants}
          likeProgressPct={likeProgressPct}
          likedRestaurants={likedRestaurants}
          restaurants={restaurants}
          votingStatus={votingStatus}
          isHost={isHost}
          sessionStarted={sessionStarted}
          startPressed={startPressed}
          currentRound={currentRound}
          roundTransitioning={roundTransitioning}
          sessionComplete={sessionComplete}
          onStartSession={handleStartSession}
          onCompleteRound1={handleCompleteRound1}
          onCompleteRound2={handleCompleteRound2}
        />

        {currentRestaurant && (
          <RestaurantCard
            restaurant={currentRestaurant}
            hasVoted={alreadyVoted}
            canLike={canLike}
            sessionStarted={sessionStarted}
            sessionComplete={sessionComplete}
            roundTransitioning={roundTransitioning}
            remainingVotes={remainingVotes}
            currentRound={currentRound}
            likesPerUser={session?.likesPerUser || 0}
            onVote={handleVoteWrapper}
          />
        )}

        <RestaurantNavigation
          currentRestaurantIdx={currentRestaurantIdx}
          totalRestaurants={restaurants.length}
          sessionStarted={sessionStarted}
          sessionComplete={sessionComplete}
          roundTransitioning={roundTransitioning}
          onPrevious={toPrevRestaurant}
          onNext={toNextRestaurant}
        />
      </main>
    </div>
  );
}
