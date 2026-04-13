"use client";

import { useState, useEffect } from "react";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/button";
import { ApiClient } from "@/api/client";
import { LibraryApi } from "@/api/libraryApi";
import { DiscoveryApi, DiscoveryRestaurant } from "@/api/discoveryApi";

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

type Tab = "watchlist" | "nearby";

function BrowseCard({
  restaurant,
  isAdded,
  disabled,
  onAdd,
}: {
  restaurant: DiscoveryRestaurant;
  isAdded: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  const photo = restaurant.photos?.[0];
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🍽</div>
        )}
        {isAdded && (
          <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
            <div className="bg-orange-500 rounded-full p-2">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{restaurant.name}</p>
        <p className="text-xs text-gray-500 line-clamp-1">{restaurant.category}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            {restaurant.rating != null && (
              <span className="text-xs font-medium text-gray-700">
                <span className="text-amber-400">★</span> {restaurant.rating.toFixed(1)}
              </span>
            )}
            {restaurant.priceRange && (
              <span className="text-xs text-gray-400">{restaurant.priceRange}</span>
            )}
          </div>
          <button
            onClick={onAdd}
            disabled={isAdded || disabled}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isAdded
                ? "bg-orange-100 text-orange-600 cursor-default"
                : disabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3 h-3" /> Added
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" /> Add
              </>
            )}
          </button>
        </div>
        {restaurant.vibeTags && restaurant.vibeTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {restaurant.vibeTags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function EventRestaurantPicker({
  sessionId,
  diningBorough,
  diningNeighborhood,
  picked,
  onAdded,
  onRemoved,
}: EventRestaurantPickerProps) {
  const [tab, setTab] = useState<Tab>("watchlist");
  const [watchlist, setWatchlist] = useState<DiscoveryRestaurant[]>([]);
  const [nearby, setNearby] = useState<DiscoveryRestaurant[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const pickedIds = new Set(picked.map((p) => p.providerId));

  // Load watchlist on mount
  useEffect(() => {
    LibraryApi.getWatchlist()
      .then(setWatchlist)
      .catch(() => setWatchlist([]))
      .finally(() => setLoadingWatchlist(false));
  }, []);

  // Load nearby when tab switches to nearby (lazy)
  useEffect(() => {
    if (tab !== "nearby" || nearby.length > 0) return;
    if (!diningBorough) return;
    setLoadingNearby(true);
    const borough = diningBorough.toLowerCase() as Parameters<typeof DiscoveryApi.fetchRestaurants>[0];
    DiscoveryApi.fetchRestaurants(borough, diningNeighborhood, 20)
      .then(setNearby)
      .catch(() => setNearby([]))
      .finally(() => setLoadingNearby(false));
  }, [tab, diningBorough, diningNeighborhood, nearby.length]);

  const handleAdd = async (r: DiscoveryRestaurant) => {
    if (picked.length >= 6 || pickedIds.has(r.id)) return;
    setAdding(r.id);
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
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add restaurant");
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (providerId: string) => {
    try {
      await ApiClient.eventSessions.removeRestaurant(sessionId, providerId);
      onRemoved(providerId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to remove restaurant");
    }
  };

  const browsing = tab === "watchlist" ? watchlist : nearby;
  const isLoading = tab === "watchlist" ? loadingWatchlist : loadingNearby;

  return (
    <div className="space-y-5">
      {/* Selected restaurants */}
      {picked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Selected ({picked.length}/6)
          </p>
          {picked.map((r) => (
            <div
              key={r.providerId}
              className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate">{r.address}</p>
              </div>
              <button
                onClick={() => handleRemove(r.providerId)}
                className="ml-2 text-red-400 hover:text-red-600 transition-colors"
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

      {/* Browse tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-1">
        <button
          onClick={() => setTab("watchlist")}
          className={`text-sm font-semibold pb-2 px-1 border-b-2 transition-colors ${
            tab === "watchlist"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Want to Go
        </button>
        {diningBorough && (
          <button
            onClick={() => setTab("nearby")}
            className={`text-sm font-semibold pb-2 px-1 border-b-2 transition-colors ${
              tab === "nearby"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Nearby{diningNeighborhood ? ` · ${diningNeighborhood}` : ""}
          </button>
        )}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
        </div>
      ) : browsing.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {tab === "watchlist"
            ? "Your Want to Go list is empty. Switch to Nearby to browse restaurants."
            : "No nearby restaurants found."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {browsing.map((r) => (
            <BrowseCard
              key={r.id}
              restaurant={r}
              isAdded={pickedIds.has(r.id)}
              disabled={(picked.length >= 6 && !pickedIds.has(r.id)) || adding === r.id}
              onAdd={() => handleAdd(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
