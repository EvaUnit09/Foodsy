import { API_BASE_URL } from "./homepageApi";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Borough = "manhattan" | "brooklyn" | "queens";
export type SwipeAction = "favorite" | "watchlist" | "pass";

export interface DiscoveryRestaurant {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  priceLevel: number | null;
  priceRange: string | null;
  photos: string[];
  address: string;
  userRatingCount: number | null;
  generativeSummary: string | null;
}

export const DAILY_CAP = 20;

export const BOROUGH_NEIGHBORHOODS: Record<Borough, string[]> = {
  manhattan: [
    "SoHo",
    "Greenwich Village",
    "Upper East Side",
    "Midtown",
    "Lower East Side",
    "Chelsea",
    "Tribeca",
    "East Village",
    "West Village",
    "Financial District",
  ],
  brooklyn: [
    "Williamsburg",
    "DUMBO",
    "Park Slope",
    "Bushwick",
    "Crown Heights",
    "Red Hook",
    "Sunset Park",
    "Bay Ridge",
    "Prospect Heights",
    "Carroll Gardens",
  ],
  queens: [
    "Astoria",
    "Long Island City",
    "Flushing",
    "Jackson Heights",
    "Forest Hills",
    "Elmhurst",
    "Woodside",
    "Sunnyside",
    "Corona",
    "Ridgewood",
  ],
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

/** Returns a local YYYY-MM-DD string so keys rotate at the user's local midnight, not UTC. */
function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return `discovery_seen_${localDateString()}`;
}

// ─── API class ────────────────────────────────────────────────────────────────

export class DiscoveryApi {
  // Fetch discovery restaurants from backend
  static async fetchRestaurants(
    borough: Borough,
    limit = DAILY_CAP
  ): Promise<DiscoveryRestaurant[]> {
    const res = await fetch(
      `${API_BASE_URL}/restaurants/discover?borough=${borough}&limit=${limit}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error(`Discovery fetch failed: ${res.status}`);
    return res.json();
  }

  // Track a restaurant favorite via the existing analytics endpoint
  static async trackFavorite(restaurantId: string): Promise<void> {
    try {
      const accessToken =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      await fetch(`${API_BASE_URL}/homepage/analytics`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          eventType: "RESTAURANT_LIKE",
          restaurantId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // analytics are best-effort
    }
  }

  // ─── Seen IDs (daily rotation) ──────────────────────────────────────────────

  static getSeenIds(): Set<string> {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(todayKey());
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  static addSeenId(id: string): void {
    if (typeof window === "undefined") return;
    const ids = this.getSeenIds();
    ids.add(id);
    localStorage.setItem(todayKey(), JSON.stringify([...ids]));
  }

  static getTodaySeenCount(): number {
    return Math.min(this.getSeenIds().size, DAILY_CAP);
  }

  // ─── Watchlist (localStorage) ───────────────────────────────────────────────

  static getWatchlist(): DiscoveryRestaurant[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("discovery_watchlist") || "[]");
    } catch {
      return [];
    }
  }

  static addToWatchlist(restaurant: DiscoveryRestaurant): void {
    if (typeof window === "undefined") return;
    const list = this.getWatchlist();
    if (!list.find((r) => r.id === restaurant.id)) {
      list.push(restaurant);
      localStorage.setItem("discovery_watchlist", JSON.stringify(list));
    }
  }

  // ─── Streak ─────────────────────────────────────────────────────────────────

  static getStreak(): number {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem("discovery_streak");
      if (!raw) return 0;
      const { count, lastDate } = JSON.parse(raw);
      const today = localDateString();
      const yesterday = localDateString(new Date(Date.now() - 86400000));
      if (lastDate === today || lastDate === yesterday) return count as number;
      return 0;
    } catch {
      return 0;
    }
  }

  static recordCompletion(): void {
    if (typeof window === "undefined") return;
    const today = localDateString();
    const current = this.getStreak();
    const lastDate = (() => {
      try {
        const raw = localStorage.getItem("discovery_streak");
        return raw ? JSON.parse(raw).lastDate : null;
      } catch {
        return null;
      }
    })();
    if (lastDate === today) return; // already recorded today
    localStorage.setItem(
      "discovery_streak",
      JSON.stringify({ count: current + 1, lastDate: today })
    );
  }
}
