"use client";
import Link from "next/link";
import { useSessionWebSocket } from "@/hooks/useWebSockethook";
import { useParams, useRouter } from "next/navigation";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";

import { useSessionVoting } from "@/hooks/useSessionVoting";
import { useAuth } from "@/contexts/AuthContext";
import { RestaurantCard, Restaurant } from "@/components/RestaurantCard";
import { SessionHeader } from "@/components/SessionHeader";
import { SessionStatusBanners } from "@/components/SessionStatusBanners";
import { ParticipantsSection } from "@/components/ParticipantsSection";
import { RestaurantNavigation } from "@/components/RestaurantNavigation";
import { FinalResultsScreen } from "@/components/FinalResultsScreen";
import { GroupRecommendationsPanel } from "@/components/GroupRecommendationsPanel";
import { OfflineVotingPanel } from "@/components/OfflineVotingPanel";
import { VotingProgressSummary } from "@/components/VotingProgressSummary";
import { EventRsvpForm } from "@/components/EventRsvpForm";
import { EventResultsPage } from "@/components/EventResultsPage";
import { EventRestaurantPicker } from "@/components/EventRestaurantPicker";
import { ApiClient, EventRestaurantDto } from "@/api/client";
import { VoteType } from "@/api/voteApi";

/* -------------------- types & constants ----------------------- */

const API_BASE_URL = "/api";
const IMAGES_LIMIT = 6;
const INITIAL_TIMER = { minutes: 0, seconds: 0 };

/* ----------------------- api helpers ----------------------------- */
const getAuthHeaders = (): HeadersInit => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const fetchRestaurantsWithPhotos = async (
  sessionId: number,
): Promise<Restaurant[]> => {
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}/restaurants`,
    { credentials: "include", headers: { ...getAuthHeaders() } }
  );
  
  if (!response.ok) {
    // Don't throw on 500 errors to prevent cascading failures
    if (response.status >= 500) {
      console.error(`Server error fetching restaurants: ${response.status}`);
      return []; // Return empty array instead of throwing
    }
    throw new Error(`Failed to fetch restaurants: ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`Expected JSON but got: ${text.substring(0, 100)}`);
    return []; // Return empty array instead of throwing
  }
  
  const base: Restaurant[] = await response.json();

  return Promise.all(
    base.map(async (restaurant) => {
      try {
        const photoResponse = await fetch(
          `${API_BASE_URL}/restaurants/${restaurant.providerId}/photos?limit=${IMAGES_LIMIT}`,
          { credentials: "include", headers: { ...getAuthHeaders() } }
        );
        
        if (!photoResponse.ok) {
          return { ...restaurant, photos: [] };
        }
        
        const photoIds: string[] = await photoResponse.json();
        
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

const fetchParticipants = async (sessionId: number) => {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/participants`, {
    credentials: "include",
    headers: { ...getAuthHeaders() }
  });
  
  if (!response.ok) {
    // Don't throw on 500 errors to prevent cascading failures
    if (response.status >= 500) {
      console.error(`Server error fetching participants: ${response.status}`);
      return []; // Return empty array instead of throwing
    }
    throw new Error(`Failed to fetch participants: ${response.status}`);
  }
  
  return response.json();
};

const fetchSession = async (sessionId: number) => {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    credentials: 'include',
    headers: { ...getAuthHeaders() }
  });
  
  if (!response.ok) {
    // Don't throw on 500 errors to prevent cascading failures
    if (response.status >= 500) {
      console.error(`Server error fetching session: ${response.status}`);
      return null; // Return null instead of throwing
    }
    throw new Error(`Failed to fetch session: ${response.status}`);
  }
  
  return response.json();
};


/* --------------------------- component --------------------------- */
export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const sessionId = id ? Number(id) : 0;

  // All hooks at the top!
  const [session, setSession] = useState<{ creatorId: string; round: number; likesPerUser: number; roundTime?: number; status: string; isHost?: boolean; diningBorough?: string; diningNeighborhood?: string; sessionType?: string; expectedParticipants?: number; votingDeadline?: string } | null>(null);
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

  // Fallback fetch when round flips to 2 but WS didn’t deliver restaurants yet
  useEffect(() => {
    if (!sessionId) return;
    if (currentRound === 2 && restaurants.length === 0 && !roundTransitioning) {
      (async () => {
        setRoundTransitioning(true);
        try {
          const enriched = await fetchRestaurantsWithPhotos(sessionId);
          setRestaurants(enriched);
          setCurrentRestaurantIdx(0);
        } catch (e) {
          console.error('Round 2 fallback fetch failed:', e);
        } finally {
          setRoundTransitioning(false);
        }
      })();
    }
  }, [currentRound, restaurants.length, roundTransitioning, sessionId]);

  // Track if session has started
  const [sessionStarted, setSessionStarted] = useState(false);
  // Track if the host has pressed start (for instant feedback)
  const [startPressed, setStartPressed] = useState(false);
  // Track if at least one timerUpdate has been received (prevents false TIME'S UP on load)
  const [timerReceived, setTimerReceived] = useState(false);
  // Sync point from last server timerUpdate; local interval interpolates from this
  const timerSyncRef = useRef<{ millisLeft: number; receivedAt: number } | null>(null);
  // Stable ref so WS effect can read roundTime without adding session to its deps
  const roundTimeRef = useRef<number>(5);

  // Data fetching effect
  useEffect(() => {
    if (!sessionId || authLoading) return; // Wait for auth to load
    
    (async () => {
      try {
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
          roundTimeRef.current = sessionObj.roundTime ?? 5;
          setCurrentRound(sessionObj.round || 1);
          
          // Sync session started state based on backend status
          // Session is considered started if status is not 'open' (i.e., 'voting', 'round1', 'round2', etc.)
          const isStarted = sessionObj.status && sessionObj.status.toLowerCase() !== 'open';
          setSessionStarted(isStarted);
          
          console.log(`Session sync: status="${sessionObj.status}", round=${sessionObj.round}, started=${isStarted}`);
        }
        
        setCurrentRestaurantIdx(0);
        setLoading(false);
      } catch (error) {
        console.error('Error loading session data:', error);
        // Still stop loading to show whatever data we have or an error state
        setLoading(false);
      }
    })();
  }, [sessionId, authLoading]);

  // Fallback: if session is already ended on load (or becomes ended) and winner
  // was never set via WebSocket, derive it from the loaded restaurant list.
  useEffect(() => {
    const isEnded =
      session?.status === "ENDED" ||
      session?.status === "ended" ||
      sessionComplete;
    if (!isEnded || winner || restaurants.length === 0) return;
    const top = [...restaurants].sort((a, b) => b.likeCount - a.likeCount)[0];
    if (top) setWinner(top);
  }, [session?.status, sessionComplete, winner, restaurants]);

  // Voting status polling effect with circuit breaker
  const votingPollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const votingPollActiveRef = useRef(false);
  useEffect(() => {
    const stopPolling = () => {
      if (votingPollTimeoutRef.current) {
        clearTimeout(votingPollTimeoutRef.current);
        votingPollTimeoutRef.current = null;
      }
      votingPollActiveRef.current = false;
    };

    if (!sessionId || !sessionStarted || sessionComplete || roundTransitioning) {
      stopPolling();
      return;
    }

    if (votingPollActiveRef.current) {
      return; // already polling; don't start another loop
    }
    votingPollActiveRef.current = true;

    let errorCount = 0;
    let currentInterval = 5000;
    const maxErrors = 3;

    const fetchVotingStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/voting-status`, {
          credentials: 'include',
          headers: { ...getAuthHeaders() }
        });

        if (response.ok) {
          const data = await response.json();
          setVotingStatus(data);
          errorCount = 0;
          currentInterval = 5000;
        } else {
          errorCount++;
          if (errorCount >= maxErrors) {
            stopPolling();
            return;
          }
          currentInterval = Math.min(currentInterval * 2, 30000);
        }
      } catch {
        errorCount++;
        if (errorCount >= maxErrors) {
          stopPolling();
          return;
        }
        currentInterval = Math.min(currentInterval * 2, 30000);
      }

      if (votingPollActiveRef.current) {
        votingPollTimeoutRef.current = setTimeout(fetchVotingStatus, currentInterval);
      }
    };

    // kick off
    fetchVotingStatus();

    return () => {
      stopPolling();
    };
  }, [sessionId, sessionStarted, sessionComplete, roundTransitioning]);

  // WebSocket event effect
  useEffect(() => {
    if (!event || !event.payload) return;
    switch (event.type) {
      case 'session_expired':
        // Handle session expiration
        console.log('Session has expired:', event.payload);
        setSessionComplete(true);
        // You could also redirect to a "session expired" page
        // router.push('/sessions/expired');
        break;
      case "sessionStarted":
        setSessionStarted(true);
        // Seed timer immediately so participants don't wait for first timerUpdate
        if (!timerSyncRef.current) {
          timerSyncRef.current = {
            millisLeft: roundTimeRef.current * 60_000,
            receivedAt: Date.now(),
          };
        }
        // Ensure UI shows full round time on start instead of 00:00
        setTimeLeft({
          minutes: Math.floor(roundTimeRef.current),
          seconds: 0,
        });
        setTimerReceived(true);
        break;
      case "timerUpdate": {
        const millisLeft = event.payload.millisLeft as number;
        const serverTime = event.payload.serverTime as number | undefined;
        const networkDelay = serverTime ? Math.max(0, Date.now() - serverTime) : 0;
        timerSyncRef.current = { millisLeft: Math.max(0, millisLeft - networkDelay), receivedAt: Date.now() };
        setTimerReceived(true);
        break;
      }
      case "roundTransition":
        const newRound = event.payload.newRound as number;
        setCurrentRound(newRound);
        setRoundTransitioning(true);
        // Refetch restaurants for new round without page reload
        if (newRound === 2) {
          setTimeout(async () => {
            try {
              const enriched = await fetchRestaurantsWithPhotos(sessionId);
              setRestaurants(enriched);
              setCurrentRestaurantIdx(0);
            } catch (error) {
              console.error('Failed to load round 2 restaurants:', error);
            } finally {
              setRoundTransitioning(false);
            }
          }, 1000);
        }
        break;
      case "sessionComplete":
        setSessionComplete(true);
        setWinner(event.payload.winner as Restaurant);
        break;
      case "roundStatus": {
        setCurrentRound(event.payload.currentRound as number);
        const roundStatusStr = event.payload.status as string;
        if (roundStatusStr && roundStatusStr.toLowerCase() !== 'open') {
          setSessionStarted(true);
        }
        break;
      }
      case 'session_update': {
        const statusStr = event.payload.status as string;
        if (statusStr && statusStr.toLowerCase() !== 'open') {
          setSessionStarted(true);
        }
        break;
      }
      case 'sessionClosed':
        router.push('/');
        break;
      case 'participantJoined': {
        const userId = event.payload.userId as string;
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === userId)) return prev;
          return [...prev, { userId, isHost: false }];
        });
        break;
      }
      default:
        break;
    }
  }, [event, sessionId]);

  // Force a clean reload if the browser restores this page from bfcache (back button).
  // Without this, the page comes back with a torn-down WebSocket that looks active.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.replace(`/sessions/${sessionId}`);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [sessionId]);

  // Smooth countdown: ticks every 500ms using local math, corrected by server sync points
  useEffect(() => {
    if (!sessionStarted) return;
    const id = setInterval(() => {
      if (!timerSyncRef.current) return;
      const { millisLeft, receivedAt } = timerSyncRef.current;
      const adjusted = Math.max(0, millisLeft - (Date.now() - receivedAt));
      setTimeLeft({
        minutes: Math.floor(adjusted / 60000),
        seconds: Math.floor((adjusted % 60000) / 1000),
      });
    }, 500);
    return () => clearInterval(id);
  }, [sessionStarted]);

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
    setSessionStarted(true);
    // Seed timer immediately so host doesn't wait for first timerUpdate
    timerSyncRef.current = {
      millisLeft: roundTimeRef.current * 60_000,
      receivedAt: Date.now(),
    };
    // Ensure UI shows full round time on start instead of 00:00
    setTimeLeft({
      minutes: Math.floor(roundTimeRef.current),
      seconds: 0,
    });
    setTimerReceived(true);
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
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <div className="text-xl font-semibold text-gray-700">Loading session...</div>
          <div className="text-sm text-gray-500">
            {!sessionId ? "Invalid session ID" : "Connecting to session and loading restaurants"}
          </div>
        </div>
      </div>
    );
  }

  // Show final results screen when session is complete
  if (sessionComplete && winner) {
    return <FinalResultsScreen winner={winner} sessionId={sessionId} />;
  }

  // Offline session view
  if (session?.sessionType === "OFFLINE") {
    const isEnded = session.status === "ENDED" || session.status === "ended";
    // Check if current user already submitted by checking their participant status
    // We approximate this: if session is ended, show results; otherwise show voting panel
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <header className="bg-white/80 backdrop-blur-md border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">F</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">Foodsy</span>
                </Link>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Offline</span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {session.diningBorough && (
            <div className="text-sm text-gray-600 bg-white rounded-lg px-4 py-2 border border-gray-100 inline-block">
              Eating in: <span className="font-medium text-gray-900">{session.diningNeighborhood ? `${session.diningNeighborhood}, ` : ""}{session.diningBorough}</span>
            </div>
          )}

          {isEnded && winner ? (
            <FinalResultsScreen winner={winner} sessionId={sessionId} />
          ) : isEnded ? (
            <div className="text-center py-8 text-gray-600">Session completed. Loading results...</div>
          ) : (
            <>
              <OfflineVotingPanel
                sessionId={String(sessionId)}
                restaurants={restaurants.map((r) => ({
                  id: Number(r.id) || 0,
                  providerId: r.providerId,
                  name: r.name,
                  category: r.category || "",
                  address: r.address || "",
                  rating: r.rating ?? undefined,
                  priceLevel: r.priceLevel ?? undefined,
                  priceRange: r.priceRange ?? undefined,
                  userRatingCount: r.userRatingCount ?? undefined,
                  currentOpeningHours: r.currentOpeningHours ?? undefined,
                  generativeSummary: r.generativeSummary ?? undefined,
                  reviewSummary: r.reviewSummary ?? undefined,
                  photos: r.photos,
                }))}
                hasSubmitted={false}
                onSubmitted={() => window.location.reload()}
                deadline={session.votingDeadline}
              />
              <VotingProgressSummary
                sessionId={String(sessionId)}
                isHost={isHost}
                onCompleted={() => window.location.reload()}
              />
            </>
          )}
        </main>
      </div>
    );
  }

  // Event session view
  if (session?.sessionType === "EVENT") {
    const isEnded = session.status === "ENDED" || session.status === "ended";
    return <EventSessionView sessionId={sessionId} isHost={isHost} isEnded={isEnded} diningBorough={session.diningBorough} diningNeighborhood={session.diningNeighborhood} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <SessionHeader
        sessionId={sessionId}
        currentRound={currentRound}
        timeLeft={timeLeft}
        sessionStarted={sessionStarted}
        timerReceived={timerReceived}
        isHost={isHost}
        startPressed={startPressed}
        onStartSession={handleStartSession}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {session?.diningBorough && (
          <div className="text-sm text-gray-600 bg-white rounded-lg px-4 py-2 border border-gray-100 inline-block">
            Eating in: <span className="font-medium text-gray-900">{session.diningNeighborhood ? `${session.diningNeighborhood}, ` : ""}{session.diningBorough}</span>
          </div>
        )}

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

        {!sessionStarted && !sessionComplete && (
          <GroupRecommendationsPanel sessionId={String(sessionId)} />
        )}

        <ParticipantsSection
          participants={participants}
          likeProgressPct={likeProgressPct}
          likedRestaurants={likedRestaurants}
          restaurants={restaurants}
          votingStatus={votingStatus}
          isHost={isHost}
          sessionStarted={sessionStarted}
          currentRound={currentRound}
          roundTransitioning={roundTransitioning}
          sessionComplete={sessionComplete}
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

function EventSessionView({ sessionId, isHost, isEnded, diningBorough, diningNeighborhood }: {
  sessionId: number;
  isHost: boolean;
  isEnded: boolean;
  diningBorough?: string;
  diningNeighborhood?: string;
}) {
  const [eventRestaurants, setEventRestaurants] = useState<EventRestaurantDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.eventSessions.getRestaurants(String(sessionId))
      .then(setEventRestaurants)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Foodsy</span>
              </Link>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Event</span>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {diningBorough && (
          <div className="text-sm text-gray-600 bg-white rounded-lg px-4 py-2 border border-gray-100 inline-block">
            Eating in: <span className="font-medium text-gray-900">{diningNeighborhood ? `${diningNeighborhood}, ` : ""}{diningBorough}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : isEnded ? (
          <EventResultsPage sessionId={String(sessionId)} />
        ) : isHost ? (
          <>
            {/* Host: manage the restaurant list then monitor progress */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Restaurant Options</h2>
                <p className="text-sm text-gray-500 mt-0.5">Add 2–6 restaurants for your guests to vote on.</p>
              </div>
              <EventRestaurantPicker
                sessionId={String(sessionId)}
                picked={eventRestaurants.map((r) => ({
                  providerId: r.providerId,
                  name: r.name,
                  address: r.address,
                  category: r.category,
                  priceLevel: r.priceLevel ?? null,
                  rating: r.rating ?? null,
                }))}
                onAdded={(r) =>
                  setEventRestaurants((prev) => [
                    ...prev,
                    { id: 0, sessionId, providerId: r.providerId, name: r.name, address: r.address,
                      category: r.category, priceLevel: r.priceLevel ?? "", rating: r.rating ?? 0,
                      displayOrder: prev.length + 1 },
                  ])
                }
                onRemoved={(providerId) =>
                  setEventRestaurants((prev) => prev.filter((r) => r.providerId !== providerId))
                }
              />
            </div>
            <VotingProgressSummary
              sessionId={String(sessionId)}
              isHost={isHost}
              onCompleted={() => window.location.reload()}
            />
          </>
        ) : (
          <>
            {/* Participant: RSVP + restaurant preference */}
            <EventRsvpForm
              sessionId={String(sessionId)}
              restaurants={eventRestaurants}
              onSubmitted={() => window.location.reload()}
            />
            <VotingProgressSummary
              sessionId={String(sessionId)}
              isHost={false}
              onCompleted={() => window.location.reload()}
            />
          </>
        )}
      </main>
    </div>
  );
}
