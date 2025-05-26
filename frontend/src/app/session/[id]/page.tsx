"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import Button from "@mui/material/Button";
import Image from "next/image";

type Restaurant = {
  id: number;
  providerId: string;
  name: string;
  category: string;
  address: string;
  likeCount: number;
  round: number;
  photos?: string[];
};
export default function SessionPage() {
  const { id } = useParams();
  const sessionId = id as string;

  /* ----------------------- component state --------------------- */
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // "liked"" list per restaurant
  const [likedRestaurants, setLikedRestaurants] = useState<Restaurant[]>([]);

  // keeps track of every restaurant the user has already voted on
  const [votedMap, setVotedMap] = useState<Record<string, "like" | "dislike">>(
    {},
  );

  /* ---------- fetch restaurants + their photos ---------- */
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      /* 1. base restaurant info */
      const base = await fetch(
        `http://localhost:8080/api/sessions/${sessionId}/restaurants`,
      ).then((r) => r.json());

      /* 2. enrich each with 5 photos */
      const enriched: Restaurant[] = await Promise.all(
        base.map(async (r: Restaurant) => {
          try {
            const photos: string[] = await fetch(
              `http://localhost:8080/api/restaurants/${r.providerId}/photos?limit=5`,
            ).then((pr) => pr.json());

            return { ...r, photos };
          } catch {
            return { ...r, photos: [] };
          }
        }),
      );

      setRestaurants(enriched);
      setCurrentIndex(0);
    })();
  }, [sessionId]);

  /* ---------------------- Local - Storage persistence --------- */
  const votesKey = useMemo(() => `votes_${sessionId}`, [sessionId]);
  const likesKey = useMemo(() => `likes_${sessionId}`, [sessionId]);
  useEffect(() => {
    const savedVotes = localStorage.getItem(votesKey);
    const savedLikes = localStorage.getItem(likesKey);

    setVotedMap(savedVotes ? JSON.parse(savedVotes) : {});
    setLikedRestaurants(savedLikes ? JSON.parse(savedLikes) : []);
  }, [votesKey, likesKey]);

  /* persist on every change */
  useEffect(() => {
    localStorage.setItem(votesKey, JSON.stringify(votedMap));
  }, [votedMap, votesKey]);
  useEffect(() => {
    localStorage.setItem(likesKey, JSON.stringify(likedRestaurants));
  }, [likedRestaurants, likesKey]);

  /*--------------------- helpers------------------------------- */
  const totalRestaurants = restaurants.length;
  const likesUsed = likedRestaurants.length;
  const likeProgressPct = totalRestaurants
    ? (likesUsed / totalRestaurants) * 100
    : 0;

  const current = restaurants[currentIndex];
  const alreadyVoted = current ? current.providerId in votedMap : false;

  /* ------------------ fetch once ----------------------------*/
  const getRestaurants = async (sessionId: string) => {
    const apiUrl = `http://localhost:8080/api/sessions/${sessionId}/restaurants`;
    const res = await fetch(apiUrl);
    return await res.json();
  };

  const handleFetchRestaurants = useCallback(async () => {
    if (!sessionId) return;
    const restaurants = await getRestaurants(sessionId);
    setRestaurants(restaurants);
    setCurrentIndex(0);
  }, [sessionId]);

  useEffect(() => {
    void handleFetchRestaurants();
  }, [handleFetchRestaurants]);

  /* ------------------ voting logic ----------------------------*/
  const handleVote = async (type: "like" | "dislike") => {
    if (!current || current.providerId in votedMap) return;

    setVotedMap((prev) => ({ ...prev, [current.providerId]: type }));

    if (type === "like") bumpLikeLocally(current);

    try {
      await fetch("http://localhost:8080/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: Number(sessionId),
          providerId: current.providerId,
          userId: "guest",
          voteType: type,
        }),
      });
    } catch (err) {
      console.error("Vote failed:", err);
      setVotedMap((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [current.providerId]: _ignored, ...rest } = prev;
        return rest;
      });
      if (type === "like") undoLikeLocally(current);
    }
  };

  /* ---- helper to increment local likeCount & liked list without duplicates ---*/
  const bumpLikeLocally = (target: Restaurant) => {
    setRestaurants((prev) =>
      prev.map((r) =>
        r.providerId === target.providerId
          ? { ...r, likeCount: r.likeCount + 1 }
          : r,
      ),
    );
    setLikedRestaurants((prev) => {
      const exists = prev.some((r) => r.providerId === target.providerId);
      return exists
        ? prev.map((r) =>
            r.providerId === target.providerId
              ? { ...r, likeCount: r.likeCount + 1 }
              : r,
          )
        : [...prev, { ...target, likeCount: target.likeCount + 1 }];
    });
  };

  const undoLikeLocally = (target: Restaurant) => {
    setRestaurants((prev) =>
      prev.map((r) =>
        r.providerId === target.providerId
          ? { ...r, likeCount: r.likeCount - 1 }
          : r,
      ),
    );
    setLikedRestaurants((prev) =>
      prev
        .map((r) =>
          r.providerId === target.providerId
            ? { ...r, likeCount: r.likeCount - 1 }
            : r,
        )
        .filter((r) => r.likeCount > 0),
    );
  };

  /* ----------------- navigation ----------------- */
  const toNext = () =>
    setCurrentIndex((i) => Math.min(i + 1, restaurants.length - 1));
  const toPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  /* ----- UI --------- */
  return (
    <main className="max-w-screen-xl mx-auto p-6 space-y-6">
      {/* progress bar */}
      <section>
        <h3 className="font-semibold mb-2">Voting Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${likeProgressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {likesUsed}/{totalRestaurants} likes used
          </span>
          <span>{Math.round(likeProgressPct)} %</span>
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
        {current && (
          <section>
            <h2 className="text-xl font-bold">{current.name}</h2>
            <p className="text-sm text-gray-600">{current.category}</p>
            <p className="text-sm text-gray-400">{current.address}</p>

            {/* ─── new photo grid ─── */}
            {current.photos && current.photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2 my-4">
                {current.photos.map((url) => (
                  <Image
                    key={url}
                    src={url}
                    alt={current.name}
                    width={96}
                    height={96}
                    className="h-24 w-full object-cover rounded"
                  />
                ))}
              </div>
            )}

            <div className="flex justify-between mt-4 px-4">
              <Button onClick={toPrev} disabled={currentIndex === 0}>
                Prev
              </Button>

              <div>
                <Button
                  onClick={() => handleVote("dislike")}
                  disabled={alreadyVoted}
                >
                  Dislike
                </Button>
                <Button
                  onClick={() => handleVote("like")}
                  disabled={alreadyVoted}
                >
                  Like
                </Button>
              </div>

              <Button
                onClick={toNext}
                disabled={currentIndex === restaurants.length - 1}
              >
                Next
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
