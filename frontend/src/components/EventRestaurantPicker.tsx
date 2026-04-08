"use client";

import { useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { Button } from "@/components/button";
import { ApiClient, RestaurantSearchResult } from "@/api/client";

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
  picked: PickedRestaurant[];
  onAdded: (r: PickedRestaurant) => void;
  onRemoved: (providerId: string) => void;
}

export function EventRestaurantPicker({ sessionId, picked, onAdded, onRemoved }: EventRestaurantPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RestaurantSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await ApiClient.restaurants.search(query.trim(), 5);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (r: RestaurantSearchResult) => {
    try {
      await ApiClient.eventSessions.addRestaurant(sessionId, {
        providerId: r.providerId,
        name: r.name,
        address: r.address,
        category: r.category,
        priceLevel: r.priceLevel,
        rating: r.rating,
      });
      onAdded({
        providerId: r.providerId,
        name: r.name,
        address: r.address,
        category: r.category,
        priceLevel: r.priceLevel,
        rating: r.rating,
      });
      setResults((prev) => prev.filter((x) => x.providerId !== r.providerId));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add restaurant");
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

  const pickedIds = new Set(picked.map((p) => p.providerId));

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search restaurants..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-300 outline-none text-gray-900"
        />
        <Button onClick={handleSearch} disabled={searching} size="sm" className="px-4">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.filter((r) => !pickedIds.has(r.providerId)).map((r) => (
            <div key={r.providerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate">{r.address}</p>
              </div>
              <Button
                onClick={() => handleAdd(r)}
                size="sm"
                disabled={picked.length >= 6}
                className="ml-2 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Picked restaurants */}
      {picked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Selected ({picked.length}/6)</p>
          {picked.map((r) => (
            <div key={r.providerId} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate">{r.address}</p>
              </div>
              <button onClick={() => handleRemove(r.providerId)} className="ml-2 text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {picked.length < 2 && (
        <p className="text-xs text-gray-400">Add at least 2 restaurants (max 6).</p>
      )}
    </div>
  );
}
