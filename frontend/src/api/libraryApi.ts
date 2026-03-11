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
    if (!res.ok) throw new Error(`Failed to load favorites: ${res.status}`);
    return res.json();
  }

  static async addFavorite(placeId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/user/library/favorites/${encodeURIComponent(placeId)}`,
      { method: "POST", credentials: "include", headers: authHeaders() }
    );
    if (!res.ok) throw new Error(`addFavorite failed: ${res.status}`);
  }

  static async removeFavorite(placeId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/user/library/favorites/${encodeURIComponent(placeId)}`,
      { method: "DELETE", credentials: "include", headers: authHeaders() }
    );
    if (!res.ok) throw new Error(`removeFavorite failed: ${res.status}`);
  }

  // ── Watchlist ────────────────────────────────────────────────────────────────

  static async getWatchlist(): Promise<DiscoveryRestaurant[]> {
    const res = await fetch(`${API_BASE_URL}/user/library/watchlist`, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to load watchlist: ${res.status}`);
    return res.json();
  }

  static async addToWatchlist(placeId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/user/library/watchlist/${encodeURIComponent(placeId)}`,
      { method: "POST", credentials: "include", headers: authHeaders() }
    );
    if (!res.ok) throw new Error(`addToWatchlist failed: ${res.status}`);
  }

  static async removeFromWatchlist(placeId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/user/library/watchlist/${encodeURIComponent(placeId)}`,
      { method: "DELETE", credentials: "include", headers: authHeaders() }
    );
    if (!res.ok) throw new Error(`removeFromWatchlist failed: ${res.status}`);
  }
}
