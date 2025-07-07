// Base API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  metadata?: Record<string, any>;
}

// API Service Class
export class HomepageApi {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        throw new Error(`API Error: 401 - Unauthorized`);
      }
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    return response.json();
  }

  // Taste Profile Management
  static async createTasteProfile(profile: TasteProfileDto): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/homepage/taste-profile`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error(`Failed to create taste profile: ${response.statusText}`);
    }
  }

  static async getTasteProfile(): Promise<TasteProfileDto | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/homepage/taste-profile`, {
        headers: await this.getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/api/homepage/taste-profile`, {
      method: "PUT",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error(`Failed to update taste profile: ${response.statusText}`);
    }
  }

  // Homepage Data
  static async getHomepageData(): Promise<HomepageResponseDto> {
    const response = await fetch(`${API_BASE_URL}/api/homepage/data`, {
      headers: await this.getAuthHeaders(),
    });

    return await this.handleResponse<HomepageResponseDto>(response);
  }

  static async getHomepageDataAnonymous(sessionId?: string): Promise<HomepageResponseDto> {
    const url = sessionId 
      ? `${API_BASE_URL}/api/homepage/data/anonymous?sessionId=${sessionId}`
      : `${API_BASE_URL}/api/homepage/data/anonymous`;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
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
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/homepage/analytics/track`, {
        method: "POST",
        headers,
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
    const response = await fetch(`${API_BASE_URL}/api/homepage/cache/refresh`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/api/homepage/cache/stats`, {
      headers: await this.getAuthHeaders(),
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

  const getHomepageData = async (isAuthenticated: boolean, sessionId?: string) => {
    if (isAuthenticated) {
      return await HomepageApi.getHomepageData();
    } else {
      return await HomepageApi.getHomepageDataAnonymous(sessionId);
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
export function validateTasteProfile(profile: any): profile is TasteProfileDto {
  return (
    typeof profile === "object" &&
    Array.isArray(profile.preferredCuisines) &&
    typeof profile.priceRange === "string" &&
    typeof profile.preferredBorough === "string" &&
    typeof profile.isVegan === "boolean" &&
    typeof profile.isVegetarian === "boolean"
  );
}

export function validateRestaurantSummary(restaurant: any): restaurant is RestaurantSummaryDto {
  return (
    typeof restaurant === "object" &&
    typeof restaurant.id === "string" &&
    typeof restaurant.name === "string" &&
    typeof restaurant.category === "string" &&
    typeof restaurant.rating === "number" &&
    typeof restaurant.priceLevel === "string" &&
    Array.isArray(restaurant.photos) &&
    typeof restaurant.address === "string" &&
    typeof restaurant.userRatingCount === "number" &&
    typeof restaurant.isLiked === "boolean" &&
    typeof restaurant.lastUpdated === "string"
  );
}

export function validateHomepageResponse(response: any): response is HomepageResponseDto {
  return (
    typeof response === "object" &&
    Array.isArray(response.yourPicks) &&
    Array.isArray(response.highlights) &&
    Array.isArray(response.trending) &&
    Array.isArray(response.spotlight) &&
    typeof response.hasOnboarded === "boolean" &&
    response.yourPicks.every(validateRestaurantSummary) &&
    response.highlights.every(validateRestaurantSummary) &&
    response.trending.every(validateRestaurantSummary) &&
    response.spotlight.every(validateRestaurantSummary)
  );
} 