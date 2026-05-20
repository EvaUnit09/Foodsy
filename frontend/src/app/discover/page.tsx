"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  DiscoveryApi,
  DiscoveryRestaurant,
  Borough,
  SwipeAction,
  DAILY_CAP,
} from "@/api/discoveryApi";
import { LibraryApi } from "@/api/libraryApi";
import { AppHeader } from "@/components/AppHeader";
import { DiscoveryHeader } from "@/components/discovery/DiscoveryHeader";
import { DiscoveryCard } from "@/components/discovery/DiscoveryCard";
import { AreaPicker } from "@/components/discovery/AreaPicker";
import { ActionButtons } from "@/components/discovery/ActionButtons";
import { CompletionScreen } from "@/components/discovery/CompletionScreen";

const BOROUGH_LABELS: Record<Borough, string> = {
  manhattan: "Manhattan",
  brooklyn: "Brooklyn",
  queens: "Queens",
};

export default function DiscoverPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ── State ────────────────────────────────────────────────────────────────────
  const [deck, setDeck] = useState<DiscoveryRestaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [exitAction, setExitAction] = useState<SwipeAction | null>(null);

  const [selectedBorough, setSelectedBorough] = useState<Borough>("manhattan");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const [sessionFavorites, setSessionFavorites] = useState(0);
  const [sessionWatchlist, setSessionWatchlist] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Load deck ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    let aborted = false;

    async function loadDeck() {
      setIsLoading(true);
      setFetchError(false);
      setIsDone(false);

      const ids = DiscoveryApi.getSeenIds();
      const currentStreak = DiscoveryApi.getStreak();

      if (aborted) return;
      setSeenIds(ids);
      setStreak(currentStreak);

      if (ids.size >= DAILY_CAP) {
        if (!aborted) { setIsDone(true); setIsLoading(false); }
        return;
      }

      try {
        const restaurants = await DiscoveryApi.fetchRestaurants(selectedBorough, selectedNeighborhood);
        if (aborted) return;
        const filtered = restaurants
          .filter((r) => !ids.has(r.id))
          .slice(0, DAILY_CAP - ids.size);

        setDeck(filtered);
        setCurrentIndex(0);

        if (filtered.length === 0) {
          setIsDone(true);
        }
      } catch {
        if (!aborted) setFetchError(true);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }

    loadDeck();
    return () => { aborted = true; };
  }, [selectedBorough, selectedNeighborhood, isAuthenticated, retryKey]);

  // ── Action handler ───────────────────────────────────────────────────────────
  async function handleAction(action: SwipeAction) {
    if (exitAction !== null) return;
    const r = deck[currentIndex];
    if (!r) return;

    setExitAction(action);

    if (action === "favorite") {
      DiscoveryApi.trackFavorite(r.id); // analytics — best-effort, not awaited
      LibraryApi.addFavorite(r.id)
        .then(() => setSessionFavorites((n) => n + 1))
        .catch(() => {}); // don't block the swipe on network errors
    }
    if (action === "watchlist") {
      LibraryApi.addToWatchlist(r.id)
        .then(() => setSessionWatchlist((n) => n + 1))
        .catch(() => {});
    }
    DiscoveryApi.addSeenId(r.id);

    const next = new Set([...seenIds, r.id]);
    setSeenIds(next);

    setTimeout(() => {
      setExitAction(null);
      const nextIdx = currentIndex + 1;
      if (nextIdx >= deck.length || next.size >= DAILY_CAP) {
        DiscoveryApi.recordCompletion();
        setStreak(DiscoveryApi.getStreak());
        setIsDone(true);
      } else {
        setCurrentIndex(nextIdx);
      }
    }, 380);
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const seenCount = seenIds.size;

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (authLoading || (!isAuthenticated && !authLoading)) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf9" }}>
      <AppHeader badge="Discover" />
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
      <DiscoveryHeader
        seenCount={seenCount}
        dailyCap={DAILY_CAP}
        streak={streak}
        selectedBorough={selectedBorough}
        selectedNeighborhood={selectedNeighborhood}
        onAreaPickerOpen={() => setShowAreaPicker(true)}
      />

      {/* Area selector trigger */}
      <button
        onClick={() => setShowAreaPicker(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "#555",
          maxWidth: "100%",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "calc(100vw - 80px)",
          }}
        >
          {BOROUGH_LABELS[selectedBorough]}
          {selectedNeighborhood ? ` · ${selectedNeighborhood}` : ""}
        </span>
        <span style={{ fontSize: 10, color: "#888", flexShrink: 0 }}>▾</span>
      </button>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 16px 24px",
          gap: 20,
        }}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              height: "clamp(350px, calc(100vh - 320px), 520px)",
              borderRadius: 20,
              background: "#f5f5f4",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }`}</style>
          </div>
        )}

        {/* Error state */}
        {!isLoading && fetchError && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              paddingTop: 80,
              textAlign: "center",
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f5f5f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={12} cy={12} r={10} /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1={9} y1={9} x2={9.01} y2={9} /><line x1={15} y1={9} x2={15.01} y2={9} />
              </svg>
            </div>
            <p style={{ fontSize: 15, color: "#555", margin: 0 }}>
              Couldn&apos;t load restaurants right now.
            </p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              style={{
                background: "#1c1917",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                borderRadius: 10,
                padding: "10px 24px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Card deck */}
        {!isLoading && !fetchError && !isDone && deck.length > 0 && (
          <>
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 420,
                height: "clamp(350px, calc(100vh - 320px), 520px)",
              }}
            >
              {deck[currentIndex + 2] && (
                <DiscoveryCard
                  restaurant={deck[currentIndex + 2]}
                  isGhost
                  ghostDepth={2}
                  exitAction={null}
                />
              )}
              {deck[currentIndex + 1] && (
                <DiscoveryCard
                  restaurant={deck[currentIndex + 1]}
                  isGhost
                  ghostDepth={1}
                  exitAction={null}
                />
              )}
              {deck[currentIndex] && (
                <DiscoveryCard
                  restaurant={deck[currentIndex]}
                  exitAction={exitAction}
                />
              )}
            </div>

            <ActionButtons
              onPass={() => handleAction("pass")}
              onWatchlist={() => handleAction("watchlist")}
              onFavorite={() => handleAction("favorite")}
              disabled={exitAction !== null}
            />
          </>
        )}
      </div>

      {/* Area picker */}
      {showAreaPicker && (
        <AreaPicker
          selectedBorough={selectedBorough}
          selectedNeighborhood={selectedNeighborhood}
          onBoroughChange={(b) => {
            setSelectedBorough(b);
          }}
          onNeighborhoodChange={setSelectedNeighborhood}
          onClose={() => setShowAreaPicker(false)}
        />
      )}

      {/* Completion screen */}
      {isDone && (
        <CompletionScreen
          favoriteCount={sessionFavorites}
          watchlistCount={sessionWatchlist}
          seenCount={seenCount}
          streak={streak}
          onChangeArea={() => setShowAreaPicker(true)}
          onGoHome={() => router.push("/")}
        />
      )}
      </div>
    </div>
  );
}
