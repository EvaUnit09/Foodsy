import { API_BASE_URL } from "./homepageApi";
import { DiscoveryRestaurant } from "./discoveryApi";

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class LibraryApi {
  // ── Favorites ────────────────────────────────────────────────────────────────

  static async getFavorites(): Promise<DiscoveryRestaurant[]> {
    const res = await fetch(`${API_BASE_URL}/user/library/favorites`, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  }

  static async addFavorite(placeId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/user/library/favorites/${encodeURIComponent(placeId)}`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
    } catch {
      // best-effort
    }
  }

  static async removeFavorite(placeId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/user/library/favorites/${encodeURIComponent(placeId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      });
    } catch {
      // best-effort
    }
  }

  // ── Watchlist ────────────────────────────────────────────────────────────────

  static async getWatchlist(): Promise<DiscoveryRestaurant[]> {
    const res = await fetch(`${API_BASE_URL}/user/library/watchlist`, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  }

  static async addToWatchlist(placeId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/user/library/watchlist/${encodeURIComponent(placeId)}`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
    } catch {
      // best-effort
    }
  }

  static async removeFromWatchlist(placeId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/user/library/watchlist/${encodeURIComponent(placeId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      });
    } catch {
      // best-effort
    }
  }
}
