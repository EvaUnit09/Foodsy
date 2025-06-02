"use client";
import { useParams } from "next/navigation";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useSessionVoting } from "@/hooks/useSessionVoting";
import { useUserId } from "@/hooks/useUserId";

/* ----------------------- types & constants ----------------------- */
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [participants, setParticipants] = useState<{ userId: string }[]>([]);
  const [likedRestaurants, setLikedRestaurants] = usePersistedState<
    Restaurant[]
  >(`likes-${sessionId}`, []);
  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------- */
  /* add just before the `useSessionVoting` invocation   */
  /* --------------------------------------------------- */

  const bumpLikeLocally = useCallback(
    ({ providerId }: { providerId: string }) => {
      // increment like count in `restaurants`
      setRestaurants((prev) =>
        prev.map((r) =>
          r.providerId === providerId
            ? { ...r, likeCount: r.likeCount + 1 }
            : r,
        ),
      );

      // add to liked list if not there yet
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
      // decrement like count
      setRestaurants((prev) =>
        prev.map((r) =>
          r.providerId === providerId
            ? { ...r, likeCount: Math.max(r.likeCount - 1, 0) }
            : r,
        ),
      );

      // remove from liked list
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
      setCurrentIndex(0);
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
  const currentRestaurant = restaurants[currentIndex];
  const alreadyVoted = useMemo(
    () => (currentRestaurant ? hasVoted(currentRestaurant.providerId) : false),
    [currentRestaurant, hasVoted],
  );

  /* -------------------- navigation helpers ---------------------- */
  const toNext = useCallback(
    () => setCurrentIndex((i) => Math.min(i + 1, restaurants.length - 1)),
    [restaurants.length],
  );
  const toPrev = useCallback(
    () => setCurrentIndex((i) => Math.max(i - 1, 0)),
    [],
  );

  /* --------------------------- UI ------------------------------- */
  if (loading) return <div>Loading...</div>;

  return (
    <main className="max-w-screen-xl mx-auto p-6 space-y-6">
      {/* header */}
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-semibold">foodiefriends</h1>
        <div className="flex items-center gap-6">
          <nav className="flex gap-4 text-sm">
            <a href="#">home</a>
            <a href="#">favorites</a>
            <a href="#">profile</a>
          </nav>
          <Image
            src="/public/globe.svg"
            alt="user avatar"
            width={32}
            height={32}
            className="w-10 h-10 rounded-full"
          />
        </div>
      </div>

      {/* participants and timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ul>
            {participants.map((p) => (
              <li key={p.userId}>{p.userId}</li>
            ))}
          </ul>
          <span className="ml-4 text-sm pb-4 text-red-500">
            session id: {sessionId}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">05</div>
            <div className="text-sm text-gray-500">minutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">00</div>
            <div className="text-sm text-gray-500">seconds</div>
          </div>
        </div>
      </div>

      {/* progress bar */}
      <section>
        <h3 className="font-semibold mb-2">voting progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${likeProgressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {likedRestaurants.length}/{restaurants.length} likes used
          </span>
        </div>
      </section>
      {/* liked list */}
      <section>
        <h2 className="text-xl font-bold mb-4">Most Liked Restaurants</h2>

        <ul className="space-y-4">
          {[...likedRestaurants] // clone to avoid mutating state
            .sort((a, b) => b.likeCount - a.likeCount) // highest likes first
            .slice(0, 3) // top 3 only
            .map((r) => (
              <li
                key={r.providerId}
                className="border rounded-xl px-4 py-4 shadow-sm"
              >
                <h2 className="text-lg font-medium mb-1">{r.name}</h2>

                <div className="relative bg-gray-400 rounded h-4">
                  <div
                    className="bg-green-500 h-4 rounded"
                    style={{ width: `${Math.min(r.likeCount * 10, 100)}%` }}
                  />
                  <span className="absolute right-2 top-0 text-xs text-white leading-4">
                    {r.likeCount} 👍
                  </span>
                </div>
              </li>
            ))}
        </ul>
      </section>

      {/* current restaurant card */}
      <div className="border-amber-200 border-4 rounded-2xl p-4">
        {currentRestaurant && (
          <section>
            <h2 className="text-xl font-bold">{currentRestaurant.name}</h2>
            <p className="text-sm text-gray-600">
              {currentRestaurant.category}
            </p>
            <p className="text-sm text-gray-400">{currentRestaurant.address}</p>

            {/* ─── new photo grid ─── */}
            {currentRestaurant.photos &&
              currentRestaurant.photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2 my-4">
                  {currentRestaurant.photos.map((url) => (
                    <Image
                      width={600}
                      height={600}
                      key={url}
                      src={url}
                      alt={currentRestaurant.name}
                      className="h-48 w-full object-cover rounded"
                    />
                  ))}
                </div>
              )}

            {/* navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={toPrev}
                disabled={currentIndex === 0}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                ← Prev
              </button>

              <button
                onClick={toNext}
                disabled={currentIndex === restaurants.length - 1}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Next →
              </button>
            </div>

            {/* like / vote action */}
            <button
              onClick={() =>
                handleVote({
                  providerId: currentRestaurant.providerId,
                  type: "like",
                  currentRestaurantObj: {
                    providerId: currentRestaurant.providerId,
                  },
                })
              }
              disabled={alreadyVoted}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
            >
              {alreadyVoted ? "Already voted" : "Like"}
            </button>
            <button
              onClick={() =>
                handleVote({
                  providerId: currentRestaurant.providerId,
                  type: "dislike",
                  currentRestaurantObj: {
                    providerId: currentRestaurant.providerId,
                  },
                })
              }
              disabled={alreadyVoted}
              className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-40"
            >
              {alreadyVoted ? "Already voted" : "Dislike"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
