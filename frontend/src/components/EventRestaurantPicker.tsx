"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { ApiClient } from "@/api/client";
import { LibraryApi } from "@/api/libraryApi";
import { DiscoveryApi, DiscoveryRestaurant } from "@/api/discoveryApi";
import { DiscoveryCard } from "@/components/discovery/DiscoveryCard";

interface PickedRestaurant {
  providerId: string;
  name: string;
  address: string;
  category: string;
  priceLevel: string | null;
  rating: number | null;
}

interface EventRestaurantPickerProps {
  sessionId: string;
  diningBorough?: string;
  diningNeighborhood?: string;
  picked: PickedRestaurant[];
  onAdded: (r: PickedRestaurant) => void;
  onRemoved: (providerId: string) => void;
}

export function EventRestaurantPicker({
  sessionId,
  diningBorough,
  diningNeighborhood,
  picked,
  onAdded,
  onRemoved,
}: EventRestaurantPickerProps) {
  const [deck, setDeck] = useState<DiscoveryRestaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitAction, setExitAction] = useState<"pass" | "favorite" | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [wlIds, setWlIds] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);

  const pickedIds = new Set(picked.map((p) => p.providerId));

  // Load deck once on mount
  useEffect(() => {
    async function loadDeck() {
      const borough = diningBorough?.toLowerCase() as Parameters<typeof DiscoveryApi.fetchRestaurants>[0] | undefined;
      const [wl, nr] = await Promise.allSettled([
        LibraryApi.getWatchlist(),
        borough
          ? DiscoveryApi.fetchRestaurants(borough, diningNeighborhood, 30)
          : Promise.resolve<DiscoveryRestaurant[]>([]),
      ]);
      const wlItems = wl.status === "fulfilled" ? wl.value : [];
      const nrItems = nr.status === "fulfilled" ? nr.value : [];
      const wlIdSet = new Set(wlItems.map((r) => r.id));
      const combined = [
        ...wlItems,
        ...nrItems.filter((r) => !wlIdSet.has(r.id)),
      ].filter((r) => !pickedIds.has(r.id));
      setWlIds(wlIdSet);
      setDeck(combined);
      setLoadingDeck(false);
    }
    loadDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerAction = useCallback(
    async (action: "pass" | "favorite") => {
      if (exitAction !== null || currentIndex >= deck.length) return;
      setAddError(null);
      setExitAction(action);

      if (action === "favorite") {
        const r = deck[currentIndex];
        try {
          await ApiClient.eventSessions.addRestaurant(sessionId, {
            providerId: r.id,
            name: r.name,
            address: r.address,
            category: r.category,
            priceLevel: r.priceLevel != null ? String(r.priceLevel) : null,
            rating: r.rating,
          });
          onAdded({
            providerId: r.id,
            name: r.name,
            address: r.address,
            category: r.category,
            priceLevel: r.priceLevel != null ? String(r.priceLevel) : null,
            rating: r.rating,
          });
        } catch (err) {
          setAddError(err instanceof Error ? err.message : "Failed to add restaurant");
        }
      }

      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setExitAction(null);
      }, 360);
    },
    [exitAction, currentIndex, deck, sessionId, onAdded]
  );

  const handleRemove = async (providerId: string) => {
    try {
      await ApiClient.eventSessions.removeRestaurant(sessionId, providerId);
      onRemoved(providerId);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to remove restaurant");
    }
  };

  const currentRestaurant = deck[currentIndex];
  const isFromWatchlist = currentRestaurant ? wlIds.has(currentRestaurant.id) : false;
  const atMax = picked.length >= 6;
  const busy = exitAction !== null;

  return (
    <div className="space-y-4">
      {/* Selected list */}
      {picked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Selected ({picked.length}/6)
          </p>
          {picked.map((r) => (
            <div
              key={r.providerId}
              className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl border border-orange-200"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate">{r.address}</p>
              </div>
              <button
                onClick={() => handleRemove(r.providerId)}
                className="ml-2 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {picked.length < 2 && (
        <p className="text-xs text-gray-400">Add at least 2 restaurants (max 6).</p>
      )}

      {addError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
          {addError}
        </div>
      )}

      {/* Card stack */}
      {loadingDeck ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : !currentRestaurant ? (
        <p className="text-sm text-center text-gray-400 py-12">
          {deck.length === 0
            ? "No restaurants to browse for this area."
            : "You've seen all available restaurants."}
        </p>
      ) : (
        <>
          {/* "From your list" badge */}
          <div className="h-6 flex items-center">
            {isFromWatchlist && (
              <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-semibold">
                ★ From your Want to Go list
              </span>
            )}
          </div>

          {/* Card stack */}
          <div style={{ position: "relative", height: 460 }}>
            {[currentIndex + 2, currentIndex + 1, currentIndex].map((idx, pos) => {
              if (!deck[idx]) return null;
              const isActive = idx === currentIndex;
              return (
                <DiscoveryCard
                  key={deck[idx].id}
                  restaurant={deck[idx]}
                  exitAction={isActive ? exitAction : null}
                  isGhost={!isActive}
                  ghostDepth={pos === 0 ? 2 : pos === 1 ? 1 : undefined}
                  actionOverrides={{
                    favorite: { label: "+ Added!", color: "#e8531a" },
                  }}
                />
              );
            })}
          </div>

          {/* Progress */}
          <p className="text-xs text-center text-gray-400">
            {currentIndex + 1} of {deck.length}
          </p>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 48,
              paddingTop: 8,
            }}
          >
            {/* Skip */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => triggerAction("pass")}
                disabled={busy}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: busy ? "#f9fafb" : "#f3f4f6",
                  border: "none",
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: busy ? 0.45 : 1,
                  transition: "transform 0.1s, opacity 0.15s",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <X style={{ width: 22, height: 22, color: "#6b7280" }} />
              </button>
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
                Skip
              </span>
            </div>

            {/* Add to Event */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => triggerAction("favorite")}
                disabled={busy || atMax}
                title={atMax ? "Maximum 6 restaurants selected" : "Add to event"}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: busy || atMax ? "#fed7aa" : "#e8531a",
                  border: "none",
                  cursor: busy || atMax ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: busy || atMax ? 0.45 : 1,
                  transition: "transform 0.1s, opacity 0.15s",
                  boxShadow: busy || atMax ? "none" : "0 4px 14px rgba(232,83,26,0.4)",
                }}
                onMouseDown={(e) => { if (!busy && !atMax) e.currentTarget.style.transform = "scale(0.94)"; }}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Plus style={{ width: 26, height: 26, color: "#fff" }} />
              </button>
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
                Add
              </span>
            </div>
          </div>
          {atMax && (
            <p className="text-xs text-center text-orange-500">
              Maximum 6 restaurants reached. Remove one to add another.
            </p>
          )}
        </>
      )}
    </div>
  );
}
