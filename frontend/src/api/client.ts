/**
 * Centralized API Client for Foodsy Frontend
 * Eliminates hardcoded URLs and provides consistent error handling
 */

// Types for API requests and responses
export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  avatarUrl?: string;
  dietaryPreferences?: string[];
  foodAllergies?: string[];
  provider: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  success: boolean;
  user?: User;
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

// API Error class for better error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Centralized API Client
 */
export class ApiClient {
  private static baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  
  /**
   * Generic request method with consistent error handling
   */
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: { 
        "Content-Type": "application/json",
        ...options.headers 
      },
      credentials: "include",
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
    login: (data: LoginRequest): Promise<AuthResponse> => 
      ApiClient.request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data)
      }),
      
    signup: (data: SignUpRequest): Promise<AuthResponse> => 
      ApiClient.request<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data)
      }),
      
    logout: (): Promise<void> => 
      ApiClient.request<void>("/auth/logout", { 
        method: "POST" 
      }),
      
    me: (): Promise<User> => 
      ApiClient.request<any>("/auth/me"),
      
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
      
    getParticipants: (sessionId: string): Promise<unknown[]> =>
      ApiClient.request<any[]>(`/sessions/${sessionId}/participants`),
      
    start: (sessionId: string): Promise<void> =>
      ApiClient.request<void>(`/sessions/${sessionId}/start`, {
        method: "POST"
      }),
      
    end: (sessionId: string): Promise<void> =>
      ApiClient.request<void>(`/sessions/${sessionId}/end`, {
        method: "POST"
      }),
      
    getRestaurants: (sessionId: string): Promise<unknown[]> =>
      ApiClient.request<any[]>(`/sessions/${sessionId}/restaurants`),
      
    getFinalRankings: (sessionId: string): Promise<unknown[]> =>
      ApiClient.request<any[]>(`/sessions/${sessionId}/final-rankings`),
      
    getWinner: (sessionId: string): Promise<User> =>
      ApiClient.request<any>(`/sessions/${sessionId}/winner`)
  };
  
  /**
   * Voting API endpoints
   */
  static votes = {
    cast: (data: VoteRequest): Promise<User> =>
      ApiClient.request<any>("/votes", {
        method: "POST",
        body: JSON.stringify(data)
      }),
      
    getBySession: (sessionId: string): Promise<unknown[]> =>
      ApiClient.request<any[]>(`/votes/session/${sessionId}`),
      
    getByUser: (sessionId: string): Promise<unknown[]> =>
      ApiClient.request<any[]>(`/votes/session/${sessionId}/user`)
  };
  
  /**
   * Homepage API endpoints (reusing existing homepageApi functionality)
   */
  static homepage = {
    getData: (): Promise<User> =>
      ApiClient.request<any>("/homepage"),
      
    getDataAnonymous: (): Promise<User> =>
      ApiClient.request<any>("/homepage"),
      
    createTasteProfile: (profile: any): Promise<void> =>
      ApiClient.request<void>("/homepage/taste-profile", {
        method: "POST",
        body: JSON.stringify(profile)
      }),
      
    getTasteProfile: (): Promise<User> =>
      ApiClient.request<any>("/homepage/taste-profile"),
      
    updateTasteProfile: (profile: any): Promise<void> =>
      ApiClient.request<void>("/homepage/taste-profile", {
        method: "PUT",
        body: JSON.stringify(profile)
      }),
      
    trackEvent: (event: any): Promise<void> =>
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
      
    getCacheStats: (): Promise<User> =>
      ApiClient.request<any>("/homepage/cache/stats")
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