// Base API URL - Use Vercel API routes as proxy to backend
export const API_BASE_URL = "/api";

// Types matching the backend DTOs
export interface TasteProfileDto {
  preferredCuisines: string[];
  priceRange: string;
  preferredBorough: string;
  isVegan: boolean;
  isVegetarian: boolean;
}

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
  // Internal field for photo references (not exposed in JSON)
  photoReferences?: string[];
}

export interface HomepageResponseDto {
  yourPicks: RestaurantSummaryDto[];
  highlights: RestaurantSummaryDto[];
  trending: RestaurantSummaryDto[];
  spotlight: RestaurantSummaryDto[];
  hasOnboarded: boolean;
}

export interface HomepageAnalyticsDto {
  eventType: string;
  restaurantId?: string;
  sessionId?: string;
  userId?: string;
  section?: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

// Helper to safely join base URL and path without double slashes
function buildUrl(path: string): string {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

// API Service Class
export class HomepageApi {
  private static buildHeaders(includeJson: boolean = false): HeadersInit {
    const headers: HeadersInit = {};
    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  private static async getAuthHeaders(includeJson: boolean = false): Promise<HeadersInit> {
    // For now same as buildHeaders but kept async for future token reading if needed
    return this.buildHeaders(includeJson);
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error(`API Error: 401 - Unauthorized`);
      }
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    return response.json();
  }

  // Attempt to refresh the access token using the refresh token cookie
  private static async refreshAccessToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      // Success response JSON should contain { message: "Token refreshed" }
      // but we don't really care about content – just status 200 is enough.
      return true;
    } catch {
      return false;
    }
  }

  // Taste Profile Management
  static async createTasteProfile(profile: TasteProfileDto): Promise<void> {
    const response = await fetch(buildUrl("/homepage/taste-profile"), {
      method: "POST",
      headers: await this.getAuthHeaders(true),
      credentials: "include",
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error(`Failed to create taste profile: ${response.statusText}`);
    }
  }

  static async getTasteProfile(): Promise<TasteProfileDto | null> {
    try {
      const response = await fetch(buildUrl("/homepage/taste-profile"), {
        headers: await this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.status === 404) {
        return null; // No taste profile exists
      }

      return await this.handleResponse<TasteProfileDto>(response);
    } catch (error) {
      console.error("Error fetching taste profile:", error);
      return null;
    }
  }

  static async updateTasteProfile(profile: TasteProfileDto): Promise<void> {
    const response = await fetch(buildUrl("/homepage/taste-profile"), {
      method: "PUT",
      headers: await this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error(`Failed to update taste profile: ${response.statusText}`);
    }
  }

  // Homepage Data
  static async getHomepageData(): Promise<HomepageResponseDto> {
    const attemptFetch = async () =>
      fetch(buildUrl("/homepage"), {
        // No custom headers for simple GET to avoid extra CORS preflight
        credentials: "include",
      });

    // First attempt
    let response = await attemptFetch();

    if (response.status === 401 || response.status === 403) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        response = await attemptFetch();
      }
    }

    // If still unauthorized fallback to anonymous endpoint
    if (response.status === 401 || response.status === 403) {
      return await this.getHomepageDataAnonymous();
    }

    return await this.handleResponse<HomepageResponseDto>(response);
  }

  static async getHomepageDataAnonymous(): Promise<HomepageResponseDto> {
    const response = await fetch(buildUrl("/homepage"), {
      credentials: "include",
    });
    return await this.handleResponse<HomepageResponseDto>(response);
  }

  // Analytics
  static async trackEvent(event: Omit<HomepageAnalyticsDto, "timestamp">): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    try {
      const headers = await this.getAuthHeaders(true);
      const response = await fetch(buildUrl("/homepage/analytics"), {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(eventWithTimestamp),
      });

      if (!response.ok) {
        // Don't log 401 errors as warnings since they're expected for anonymous users
        if (response.status !== 401) {
          console.warn("Failed to track analytics event:", response.statusText);
        }
      }
    } catch (error) {
      // Don't log auth errors as warnings
      if (!(error instanceof Error && error.message.includes('401'))) {
        console.warn("Error tracking analytics event:", error);
      }
    }
  }

  // Convenience methods for common analytics events
  static async trackRestaurantClick(restaurantId: string, section: string): Promise<void> {
    await this.trackEvent({
      eventType: "restaurant_card_click",
      restaurantId,
      section,
    });
  }

  static async trackSessionStart(): Promise<void> {
    await this.trackEvent({
      eventType: "session_start_click",
    });
  }

  static async trackSessionJoin(): Promise<void> {
    await this.trackEvent({
      eventType: "session_join_click",
    });
  }

  static async trackTasteProfileComplete(): Promise<void> {
    await this.trackEvent({
      eventType: "taste_profile_complete",
    });
  }

  static async trackRestaurantLike(restaurantId: string, isLiked: boolean): Promise<void> {
    await this.trackEvent({
      eventType: "restaurant_like",
      restaurantId,
      metadata: { isLiked },
    });
  }

  // Restaurant Cache Management
  static async refreshRestaurantCache(): Promise<void> {
    const response = await fetch(buildUrl("/homepage/cache/refresh"), {
      method: "POST",
      headers: await this.getAuthHeaders(true),
      credentials: 'include',
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
      headers: await this.getAuthHeaders(true),
      credentials: 'include',
    });

    return await this.handleResponse(response);
  }
}

// Hook for easier usage in components
export function useHomepageApi() {
  const createTasteProfile = async (profile: TasteProfileDto) => {
    await HomepageApi.createTasteProfile(profile);
  };

  const getTasteProfile = async () => {
    return await HomepageApi.getTasteProfile();
  };

  const updateTasteProfile = async (profile: TasteProfileDto) => {
    await HomepageApi.updateTasteProfile(profile);
  };

  const getHomepageData = async (isAuthenticated: boolean) => {
    if (isAuthenticated) {
      return await HomepageApi.getHomepageData();
    } else {
      return await HomepageApi.getHomepageDataAnonymous();
    }
  };

  const trackEvent = async (event: Omit<HomepageAnalyticsDto, "timestamp">) => {
    await HomepageApi.trackEvent(event);
  };

  const trackRestaurantClick = async (restaurantId: string, section: string) => {
    await HomepageApi.trackRestaurantClick(restaurantId, section);
  };

  const trackSessionStart = async () => {
    await HomepageApi.trackSessionStart();
  };

  const trackSessionJoin = async () => {
    await HomepageApi.trackSessionJoin();
  };

  const trackTasteProfileComplete = async () => {
    await HomepageApi.trackTasteProfileComplete();
  };

  const trackRestaurantLike = async (restaurantId: string, isLiked: boolean) => {
    await HomepageApi.trackRestaurantLike(restaurantId, isLiked);
  };

  return {
    createTasteProfile,
    getTasteProfile,
    updateTasteProfile,
    getHomepageData,
    trackEvent,
    trackRestaurantClick,
    trackSessionStart,
    trackSessionJoin,
    trackTasteProfileComplete,
    trackRestaurantLike,
  };
}

// Error handling utilities
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

// Response validation utilities
export function validateTasteProfile(profile: unknown): profile is TasteProfileDto {
  return (
    typeof profile === "object" &&
    profile !== null &&
    Array.isArray((profile as Record<string, unknown>).preferredCuisines) &&
    typeof (profile as Record<string, unknown>).priceRange === "string" &&
    typeof (profile as Record<string, unknown>).preferredBorough === "string" &&
    typeof (profile as Record<string, unknown>).isVegan === "boolean" &&
    typeof (profile as Record<string, unknown>).isVegetarian === "boolean"
  );
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

export function validateHomepageResponse(response: unknown): response is HomepageResponseDto {
  const r = response as Record<string, unknown>;
  return (
    typeof response === "object" &&
    response !== null &&
    Array.isArray(r.yourPicks) &&
    Array.isArray(r.highlights) &&
    Array.isArray(r.trending) &&
    Array.isArray(r.spotlight) &&
    typeof r.hasOnboarded === "boolean" &&
    (r.yourPicks as unknown[]).every(validateRestaurantSummary) &&
    (r.highlights as unknown[]).every(validateRestaurantSummary) &&
    (r.trending as unknown[]).every(validateRestaurantSummary) &&
    (r.spotlight as unknown[]).every(validateRestaurantSummary)
  );
} 