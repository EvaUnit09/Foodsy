"use client";

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
  Fragment,
} from "react";

import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Progress } from "@/components/progress";
import { Avatar, AvatarFallback } from "@/components/avatar";

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
        const photos: string[] = await fetch(
          `${API_BASE_URL}/restaurants/${restaurant.providerId}/photos?limit=${IMAGES_LIMIT}`,
        ).then((pr) => pr.json());
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

  /* --------------------- component state ------------------------ */
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurantIdx, setCurrentRestaurantIdx] = useState(0);
  const [participants, setParticipants] = useState<{ userId: string }[]>([]);
  const [likedRestaurants, setLikedRestaurants] = usePersistedState<
    Restaurant[]
  >(`likes-${sessionId}`, []);
  const [loading, setLoading] = useState(true);

  /* ---- gallery (photo) state – resets when restaurant changes ---- */
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  /* ---------------------- countdown timer ----------------------- */
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIMER);
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.minutes === 0 && prev.seconds === 0) return prev;
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        return { minutes: prev.minutes - 1, seconds: 59 };
      });
    }, 1000);

    return () => clearInterval(t);
  }, []);

  /* ---------------- voting helpers (unchanged) ------------------ */
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

  /* -------------- initial fetch (restaurants + participants) ---- */
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const [enriched, fetchedParticipants] = await Promise.all([
        fetchRestaurantsWithPhotos(sessionId),
        fetchParticipants(sessionId),
      ]);
      setRestaurants(enriched);
      setParticipants(fetchedParticipants);
      setCurrentRestaurantIdx(0);
      setCurrentPhotoIdx(0);
      setLoading(false);
    })();
  }, [sessionId]);

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
                <span className="text-lg font-mono text-red-600">
                  {String(timeLeft.minutes).padStart(2, "0")}:
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
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
        {/* participants & voting progress */}
        <section className="flex items-center justify-between">
          {/* participants */}
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Participants
            </h2>
            <div className="flex items-center space-x-3">
              {participants.map((p) => (
                <Fragment key={p.userId}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-orange-100 text-orange-800 text-sm">
                      {p.userId?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">{p.userId}</span>
                </Fragment>
              ))}
            </div>
          </div>

          {/* progress */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Voting Progress</span>
            <div className="flex items-center space-x-2">
              <Progress value={likeProgressPct} className="w-28" />
              <span className="text-sm font-medium text-gray-900">
                {likedRestaurants.length}/{restaurants.length}
              </span>
            </div>
          </div>
        </section>

        {/* current restaurant card */}
        {currentRestaurant && (
          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* left – restaurant info + vote buttons */}
                <div className="p-8 bg-white flex flex-col">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {currentRestaurant.name}
                    </h1>
                    <p className="text-lg text-orange-600 mb-1">
                      {currentRestaurant.category}
                    </p>
                    <p className="text-gray-600">{currentRestaurant.address}</p>
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
                      disabled={alreadyVoted}
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
                      disabled={alreadyVoted}
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

        {/* navigation between restaurants */}
        <div className="flex justify-between">
          <Button
            onClick={toPrevRestaurant}
            disabled={currentRestaurantIdx === 0}
            variant="outline"
          >
            ← Prev Restaurant
          </Button>
          <Button
            onClick={toNextRestaurant}
            disabled={currentRestaurantIdx === restaurants.length - 1}
            variant="outline"
          >
            Next Restaurant →
          </Button>
        </div>
      </main>
    </div>
  );
}
