"use client";
import { useSessionWebSocket } from "@/hooks/useWebSockethook";
import {
  ArrowLeft,
  User,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Progress } from "@/components/progress";

import { useSessionVoting } from "@/hooks/useSessionVoting";
import { useUserId } from "@/hooks/useUserId";

/* ----------------란드 types & constants ----------------------- */
export type Restaurant = {
  id: number;
  providerId: string;
  name: string;
  category: string;
  address: string;
  likeCount: number;
  round: number;
  photos?: string[];
  priceLevel?: string | null;
  priceRange?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  currentOpeningHours?: string | null;
  generativeSummary?: string | null;
  reviewSummary?: string | null;
};

const API_BASE_URL = "http://localhost:8080/api";
const IMAGES_LIMIT = 6;
const INITIAL_TIMER = { minutes: 5, seconds: 0 };

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

const fetchSession = (sessionId: number) =>
  fetch(`${API_BASE_URL}/sessions/${sessionId}`).then((res) => res.json());

/* -------------------- local-storage helper ------------------------ */
function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) setState(JSON.parse(saved));
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

/* --------------------------- component --------------------------- */
export default function SessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);

  // All hooks at the top!
  const [session, setSession] = useState<{ creatorId: string; round: number; likesPerUser: number; status: string } | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurantIdx, setCurrentRestaurantIdx] = useState(0);
  const [participants, setParticipants] = useState<{ userId: string; isHost: boolean }[]>([]);
  const [likedRestaurants, setLikedRestaurants] = usePersistedState<Restaurant[]>(`likes-${sessionId}`, []);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIMER);
  
  // Round management state
  const [currentRound, setCurrentRound] = useState(1);
  const [remainingLikes, setRemainingLikes] = useState(0);
  const [roundTransitioning, setRoundTransitioning] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [winner, setWinner] = useState<Restaurant | null>(null);

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

  const userId = useUserId();
  const { hasVoted, handleVote } = useSessionVoting({
    sessionId,
    userId,
    bumpLikeLocally,
    undoLikeLocally,
  });

  // Track if session has started
  const [sessionStarted, setSessionStarted] = useState(false);
  // Track if the host has pressed start (for instant feedback)
  const [startPressed, setStartPressed] = useState(false);

  // Data fetching effect
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const [enriched, fetchedParticipants, sessionObj] = await Promise.all([
        fetchRestaurantsWithPhotos(sessionId),
        fetchParticipants(sessionId),
        fetchSession(sessionId),
      ]);
      setRestaurants(enriched);
      setParticipants(Array.isArray(fetchedParticipants) ? fetchedParticipants : []);
      setSession(sessionObj);
      setCurrentRestaurantIdx(0);
      setCurrentPhotoIdx(0);
      setLoading(false);
    })();
  }, [sessionId]);

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
        // Refetch restaurants for new round
        if (event.payload.newRound === 2) {
          setTimeout(() => {
            window.location.reload(); // Simple approach to reload round 2 restaurants
          }, 2000);
        }
        break;
      case "sessionComplete":
        setSessionComplete(true);
        setWinner(event.payload.winner);
        break;
      case "roundStatus":
        setCurrentRound(event.payload.currentRound);
        setRemainingLikes(event.payload.remainingLikes || 0);
        break;
      default:
        break;
    }
  }, [event]);

  /* -------------------- derived state --------------------------- */
  const likeProgressPct = useMemo(
    () =>
      restaurants.length
        ? (likedRestaurants.length / restaurants.length) * 100
        : 0,
    [restaurants.length, likedRestaurants.length],
  );

  const currentRestaurant = restaurants[currentRestaurantIdx];

  const alreadyVoted = useMemo(
    () => (currentRestaurant ? hasVoted(currentRestaurant.providerId) : false),
    [currentRestaurant, hasVoted],
  );

  // Normalize host check
  console.log('creatorId:', session?.creatorId, 'userId:', userId);
  const isHost = useMemo(() => {
    return (
      session?.creatorId?.trim().toLowerCase() === userId?.trim().toLowerCase()
    );
  }, [session?.creatorId, userId]);

  // Handler for host to start session
  const handleStartSession = () => {
    send(`/app/session/${sessionId}/start`, {});
    setStartPressed(true);
    setSessionStarted(true); // Optimistically update for host
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

  /* reset gallery index when restaurant changes */
  useEffect(() => setCurrentPhotoIdx(0), [currentRestaurantIdx]);

  const nextPhoto = () =>
    setCurrentPhotoIdx(
      (p) => (p + 1) % (currentRestaurant?.photos?.length || 1),
    );
  const prevPhoto = () =>
    setCurrentPhotoIdx(
      (p) =>
        (p - 1 + (currentRestaurant?.photos?.length || 1)) %
        (currentRestaurant?.photos?.length || 1),
    );

  /* Helper functions for formatting */
  function formatHours(hours: string | null | undefined) {
    if (!hours) return null;
    // Try to extract weekdayDescriptions array
    try {
      const match = hours.match(/weekdayDescriptions=\[(.*?)\]/);
      if (match) {
        const days = match[1].split(',').map(s => s.trim());
        // Google returns days in order: Monday, Tuesday, ...
        const jsDay = new Date().getDay(); // 0=Sunday, 1=Monday, ...
        // Map JS day to Google day (Monday=0, ..., Sunday=6)
        const googleDayIdx = jsDay === 0 ? 6 : jsDay - 1;
        return days[googleDayIdx] || days[0];
      }
    } catch {}
    return "See details";
  }

  function extractSummaryText(summary: string | null | undefined) {
    if (!summary) return null;
    const match = summary.match(/text=([^,{}}\]]+)/);
    return match ? match[1] : summary;
  }

  function formatPriceRange(priceRange: string | null | undefined) {
    if (!priceRange) return null;
    // Try to extract start and end price in USD from the string
    const startMatch = priceRange.match(/startPrice=\{currencyCode=USD, units=(\d+)\}/);
    const endMatch = priceRange.match(/endPrice=\{currencyCode=USD, units=(\d+)\}/);
    if (startMatch && endMatch) {
      return `$${startMatch[1]} - $${endMatch[1]}`;
    }
    return priceRange;
  }

  /* --------------------------- UI ------------------------------- */
  if (loading) return <div className="p-10">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* ───────────────── header ───────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* left-most: back link + brand */}
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Exit Session</span>
              </Link>

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  foodiefriends
                </span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  NY
                </span>
              </div>
            </div>

            {/* right: session id, timer, profile */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Session:</span>
                <span className="text-sm font-mono bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  #{sessionId}
                </span>
              </div>

              <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4 text-red-600" />
                {timeLeft.minutes === 0 && timeLeft.seconds === 0 ? (
                  <span className="text-lg font-bold text-red-600 animate-pulse">
                    TIME&apos;S UP!
                  </span>
                ) : (
                  <span className="text-lg font-mono text-red-600">
                    {String(timeLeft.minutes).padStart(2, "0")}:
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                )}
              </div>

              <Button variant="ghost" size="sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ───────────────── content ───────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Voting started banner */}
        {sessionStarted && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-900 rounded-lg text-center text-lg font-semibold shadow">
            Voting has started! Cast your votes now.
          </div>
        )}
        {/* Waiting for host message for non-hosts */}
        {!sessionStarted && !isHost && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-lg text-center text-lg font-semibold shadow">
            Waiting for host to start the session...
          </div>
        )}
        {/* participants & voting progress */}
        <section className="flex items-center justify-between">
          {/* participants */}
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

          {/* progress and Start button for host */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Voting Progress</span>
            <div className="flex items-center space-x-2">
              <Progress value={likeProgressPct} className="w-28" />
              <span className="text-sm font-medium text-gray-900">
                {likedRestaurants.length}/{restaurants.length}
              </span>
            </div>
            {/* Show Start button only for host and only if session hasn't started */}
            {isHost && !sessionStarted && !startPressed && (
              <Button
                onClick={handleStartSession}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
              >
                Start Voting Session
              </Button>
            )}
          </div>
        </section>

        

        {/* current restaurant card */}
        {currentRestaurant && (
          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* left – restaurant info + vote buttons */}
                <div className="p-8 bg-white flex flex-col">
                  <div className="mb-6 p-6 rounded-lg shadow bg-white dark:bg-orange-600">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{currentRestaurant.name}</h1>
                    <div className="text-white-600 font-2xl text-bold mb-1">{currentRestaurant.category}</div>
                    <div className="text-white-600 dark:text-gray-300 mb-2">{currentRestaurant.address}</div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200 mb-2">
                      {currentRestaurant.priceRange && (
                        <span>
                          <b>Price:</b> {formatPriceRange(currentRestaurant.priceRange)}
                        </span>
                      )}
                      {currentRestaurant.rating && (
                        <span>
                          <b>Rating:</b> {currentRestaurant.rating} ★
                          {currentRestaurant.userRatingCount && (
                            <span className="ml-1 text-gray-500">({currentRestaurant.userRatingCount} reviews)</span>
                          )}
                        </span>
                      )}
                      {currentRestaurant.currentOpeningHours && (
                        <span className="text-white-600 font-large text-bold mb-1">
                          <b>Hours:</b> {formatHours(currentRestaurant.currentOpeningHours)}
                        </span>
                      )}
                    </div>

                    {currentRestaurant.generativeSummary && (
                      <div className="mt-2">
                        <b>Summary:</b>
                        <div className="text-gray-800 dark:text-gray-100">{extractSummaryText(currentRestaurant.generativeSummary)}</div>
                      </div>
                    )}

                    {currentRestaurant.reviewSummary && (
                      <div className="mt-2">
                        <b>Review Summary:</b>
                        <div className="text-gray-800 dark:text-gray-100">{extractSummaryText(currentRestaurant.reviewSummary)}</div>
                      </div>
                    )}
                  </div>

                  {/* like / pass */}
                  <div className="flex space-x-4 mt-auto">
                    <Button
                      onClick={() =>
                        handleVote({
                          type: "dislike",
                          providerId: currentRestaurant!.providerId,
                          currentRestaurantObj: currentRestaurant,
                        })
                      }
                      disabled={alreadyVoted || !sessionStarted}
                      variant="outline"
                      size="lg"
                      className="flex-1 h-14 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      <ThumbsDown className="w-5 h-5 mr-2" />
                      Pass
                    </Button>
                    <Button
                      onClick={() =>
                        handleVote({
                          type: "like",
                          providerId: currentRestaurant!.providerId,
                          currentRestaurantObj: currentRestaurant,
                        })
                      }
                      disabled={alreadyVoted || !sessionStarted}
                      size="lg"
                      className="flex-1 h-14 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <ThumbsUp className="w-5 h-5 mr-2" />
                      Like
                    </Button>
                  </div>

                  {alreadyVoted && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800 text-center font-medium">
                        Vote recorded!
                      </p>
                    </div>
                  )}
                </div>

                {/* right – photo gallery */}
                <div className="relative bg-gray-100">
                  {/* main photo */}
                  {currentRestaurant.photos &&
                  currentRestaurant.photos.length > 0 ? (
                    <div className="aspect-square relative overflow-hidden">
                      <Image
                        src={
                          currentRestaurant.photos[currentPhotoIdx] ??
                          "/placeholder.svg"
                        }
                        alt={`${currentRestaurant.name} photo ${
                          currentPhotoIdx + 1
                        }`}
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />

                      {/* photo nav */}
                      <div className="absolute inset-0 flex items-center justify-between p-4">
                        <Button
                          onClick={prevPhoto}
                          variant="outline"
                          size="icon"
                          className="bg-white/80 hover:bg-white border-0 shadow-lg"
                        >
                          <ChevronLeft />
                        </Button>
                        <Button
                          onClick={nextPhoto}
                          variant="outline"
                          size="icon"
                          className="bg-white/80 hover:bg-white border-0 shadow-lg"
                        >
                          <ChevronRight />
                        </Button>
                      </div>

                      {/* counter */}
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {currentPhotoIdx + 1} /{" "}
                        {currentRestaurant.photos.length}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-500">No photos</span>
                    </div>
                  )}

                  {/* thumbnails */}
                  {currentRestaurant.photos &&
                    currentRestaurant.photos.length > 1 && (
                      <div className="p-4 bg-white">
                        <div className="grid grid-cols-6 gap-2">
                          {currentRestaurant.photos.map((url, idx) => (
                            <button
                              key={url}
                              onClick={() => setCurrentPhotoIdx(idx)}
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                idx === currentPhotoIdx
                                  ? "border-orange-500 shadow-md"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <Image
                                src={url}
                                alt={`Thumbnail ${idx + 1}`}
                                width={120}
                                height={120}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* navigation between restaurants - disable if not started */}
        <div className="flex justify-between">
          <Button
            onClick={toPrevRestaurant}
            disabled={currentRestaurantIdx === 0 || !sessionStarted}
            variant="outline"
          >
            ← Prev Restaurant
          </Button>
          <Button
            onClick={toNextRestaurant}
            disabled={currentRestaurantIdx === restaurants.length - 1 || !sessionStarted}
            variant="outline"
          >
            Next Restaurant →
          </Button>
        </div>
      </main>
    </div>
  );
}
