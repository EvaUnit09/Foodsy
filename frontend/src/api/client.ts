/**
 * Centralized API Client for Foodsy Frontend
 * Eliminates hardcoded URLs and provides consistent error handling
 */

// API Types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  avatarUrl?: string;
  provider: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  success: boolean;
  user?: User;
  accessToken?: string;
}

export interface SessionRequest {
  poolSize: number;
  roundTime: number;
  likesPerUser: number;
}

export interface Session {
  id: string;
  joinCode: string;
  status: string;
  creatorId: string;
  poolSize: number;
  roundTime: number;
  likesPerUser: number;
}

export interface VoteRequest {
  sessionId: string;
  restaurantId: string;
  voteType: 'LIKE' | 'DISLIKE';
}

// Additional DTOs for API responses
export interface ParticipantDto {
  userId: string;
  username: string;
  isHost: boolean;
}

export interface RestaurantDto {
  id: string;
  name: string;
  address: string;
  providerId: string;
  likeCount: number;
  photoUrl?: string;
}

export interface VoteDto {
  id: string;
  sessionId: string;
  restaurantId: string;
  userId: string;
  voteType: 'LIKE' | 'DISLIKE';
  createdAt: string;
}

// Homepage DTOs
export interface HomepageResponseDto {
  message: string;
  user?: User;
  analytics?: HomepageAnalyticsDto;
}

export interface TasteProfileDto {
  dietaryPreferences: string[];
  foodAllergies: string[];
  favoriteCuisines: string[];
}

export interface CacheStatsDto {
  totalCached: number;
  lastUpdated: string;
  cacheHitRate: number;
}

export interface HomepageAnalyticsDto {
  totalSessions: number;
  totalVotes: number;
  averageSessionDuration: number;
}

export interface AnalyticsEventDto {
  eventType: string;
  eventData: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

// API Error class for better error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Centralized API Client
 */
export class ApiClient {
  private static baseURL = "/api"; // Same domain - will use Vercel API routes
  
  /**
   * Generic request method with consistent error handling
   */
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get access token from localStorage for authentication
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    const headers: HeadersInit = { 
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>)
    };
    
    // Add Authorization header if we have an access token
    if (accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const config: RequestInit = {
      headers,
      credentials: "include", // Keep for CORS preflight and refresh token cookies
      ...options,
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        throw new ApiError(response.status, errorMessage);
      }
      
      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Authentication API endpoints
   */
  static auth = {
    logout: (): Promise<void> => 
      ApiClient.request<void>("/auth/logout", { 
        method: "POST" 
      }),
      
    me: (): Promise<User> => 
      ApiClient.request<User>("/auth/me"),
      
    google: (): string => `${ApiClient.baseURL}/auth/google`,
    
    refreshToken: (): Promise<AuthResponse> =>
      ApiClient.request<AuthResponse>("/auth/refresh", {
        method: "POST"
      })
  };
  
  /**
   * Session management API endpoints
   */
  static sessions = {
    create: (data: SessionRequest): Promise<Session> =>
      ApiClient.request<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify(data)
      }),
      
    join: (joinCode: string): Promise<Session> =>
      ApiClient.request<Session>(`/sessions/join/${joinCode}`, {
        method: "POST"
      }),
      
    get: (sessionId: string): Promise<Session> =>
      ApiClient.request<Session>(`/sessions/${sessionId}`),
      
    getParticipants: (sessionId: string): Promise<ParticipantDto[]> =>
      ApiClient.request<ParticipantDto[]>(`/sessions/${sessionId}/participants`),
      
    start: (sessionId: string): Promise<void> =>
      ApiClient.request<void>(`/sessions/${sessionId}/start`, {
        method: "POST"
      }),
      
    end: (sessionId: string): Promise<void> =>
      ApiClient.request<void>(`/sessions/${sessionId}/end`, {
        method: "POST"
      }),
      
    getRestaurants: (sessionId: string): Promise<RestaurantDto[]> =>
      ApiClient.request<RestaurantDto[]>(`/sessions/${sessionId}/restaurants`),
      
    getFinalRankings: (sessionId: string): Promise<RestaurantDto[]> =>
      ApiClient.request<RestaurantDto[]>(`/sessions/${sessionId}/final-rankings`),
      
    getWinner: (sessionId: string): Promise<User> =>
      ApiClient.request<User>(`/sessions/${sessionId}/winner`)
  };
  
  /**
   * Voting API endpoints
   */
  static votes = {
    cast: (data: VoteRequest): Promise<User> =>
      ApiClient.request<User>("/votes", {
        method: "POST",
        body: JSON.stringify(data)
      }),
      
    getBySession: (sessionId: string): Promise<VoteDto[]> =>
      ApiClient.request<VoteDto[]>(`/votes/session/${sessionId}`),
      
    getByUser: (sessionId: string): Promise<VoteDto[]> =>
      ApiClient.request<VoteDto[]>(`/votes/session/${sessionId}/user`)
  };
  
  /**
   * Homepage API endpoints (reusing existing homepageApi functionality)
   */
  static homepage = {
    getData: (): Promise<HomepageResponseDto> =>
      ApiClient.request<HomepageResponseDto>("/homepage"),
      
    getDataAnonymous: (): Promise<HomepageResponseDto> =>
      ApiClient.request<HomepageResponseDto>("/homepage"),
      
    createTasteProfile: (profile: TasteProfileDto): Promise<void> =>
      ApiClient.request<void>("/homepage/taste-profile", {
        method: "POST",
        body: JSON.stringify(profile)
      }),
      
    getTasteProfile: (): Promise<TasteProfileDto> =>
      ApiClient.request<TasteProfileDto>("/homepage/taste-profile"),
      
    updateTasteProfile: (profile: TasteProfileDto): Promise<void> =>
      ApiClient.request<void>("/homepage/taste-profile", {
        method: "PUT",
        body: JSON.stringify(profile)
      }),
      
    trackEvent: (event: AnalyticsEventDto): Promise<void> =>
      ApiClient.request<void>("/homepage/analytics", {
        method: "POST",
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        })
      }),
      
    refreshCache: (): Promise<void> =>
      ApiClient.request<void>("/homepage/cache/refresh", {
        method: "POST"
      }),
      
    getCacheStats: (): Promise<CacheStatsDto> =>
      ApiClient.request<CacheStatsDto>("/homepage/cache/stats")
  };
  
  /**
   * Utility methods
   */
  static utils = {
    // Check if current environment supports the API
    isApiAvailable: async (): Promise<boolean> => {
      try {
        await fetch(`${ApiClient.baseURL}/health`, { 
          method: 'HEAD',
          credentials: 'include'
        });
        return true;
      } catch {
        return false;
      }
    },
    
    // Get the base URL for external use
    getBaseUrl: (): string => ApiClient.baseURL
  };
}

// Export individual API modules for backward compatibility
export const authApi = ApiClient.auth;
export const sessionApi = ApiClient.sessions;
export const voteApi = ApiClient.votes;
export const homepageApi = ApiClient.homepage;

// Default export
export default ApiClient;