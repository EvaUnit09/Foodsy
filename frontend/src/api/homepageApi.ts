// Base API URL - Use Vercel API routes as proxy to backend
export const API_BASE_URL = "/api";

// Types matching the backend DTOs
export interface RestaurantSummaryDto {
  id: string;
  name: string;
  category: string;
  rating: number;
  priceLevel: string;
  photos: string[];
  address: string;
  userRatingCount: number;
  isLiked: boolean;
  distance?: string;
  clickCount?: number;
  lastUpdated: string;
  websiteUri?: string;
  photoReferences?: string[];
}

export interface HomepageResponseDto {
  yourPicks: RestaurantSummaryDto[];
  highlights: RestaurantSummaryDto[];
  trending: RestaurantSummaryDto[];
  spotlight: RestaurantSummaryDto[];
}

// Helper to safely join base URL and path without double slashes
function buildUrl(path: string): string {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

export class HomepageApi {
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error(`API Error: 401 - Unauthorized`);
      }
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    if (response.status === 304) {
      return {} as T;
    }

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    if (contentLength === "0" || !contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    return response.json();
  }

  static async refreshRestaurantCache(): Promise<void> {
    const response = await fetch(buildUrl("/homepage/cache/refresh"), {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh cache: ${response.statusText}`);
    }
  }

  static async getCacheStats(): Promise<{
    totalRestaurants: number;
    lastUpdated: string;
    expiredCount: number;
    quotaUsage: number;
  }> {
    const response = await fetch(buildUrl("/homepage/cache/stats"), {
      credentials: "include",
    });
    return await this.handleResponse(response);
  }
}

export class HomepageApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = "HomepageApiError";
  }
}

export function validateRestaurantSummary(restaurant: unknown): restaurant is RestaurantSummaryDto {
  const r = restaurant as Record<string, unknown>;
  return (
    typeof restaurant === "object" &&
    restaurant !== null &&
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    typeof r.category === "string" &&
    typeof r.rating === "number" &&
    typeof r.priceLevel === "string" &&
    Array.isArray(r.photos) &&
    typeof r.address === "string" &&
    typeof r.userRatingCount === "number" &&
    typeof r.isLiked === "boolean" &&
    typeof r.lastUpdated === "string" &&
    (r.websiteUri === undefined || typeof r.websiteUri === "string")
  );
}
