"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TasteProfileOnboarding } from "@/components/TasteProfileOnboarding";
import { HomepageGrid } from "@/components/HomepageGrid";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useHomepageApi, 
  TasteProfileDto, 
  HomepageResponseDto,
  RestaurantSummaryDto 
} from "@/api/homepageApi";
// Simple notification utility
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // You can replace this with your preferred notification system
};

interface HomepageProps {
  // Optional props for testing or server-side rendering
  initialData?: HomepageResponseDto;
  forceOnboarding?: boolean;
}

export function Homepage({ initialData, forceOnboarding = false }: HomepageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const homepageApi = useHomepageApi();

  // State management
  const [homepageData, setHomepageData] = useState<HomepageResponseDto | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(forceOnboarding);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Generate session ID for anonymous users
  useEffect(() => {
    if (!isAuthenticated && !sessionId) {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
    }
  }, [isAuthenticated, sessionId]);

  // Load homepage data and check onboarding status
  useEffect(() => {
    if (!initialData) {
      loadHomepageData();
    }
  }, [isAuthenticated, sessionId, initialData]);

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const loadHomepageData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await homepageApi.getHomepageData(isAuthenticated);
      setHomepageData(data);
      
      // Show onboarding if user hasn't completed it
      if (isAuthenticated && !data.hasOnboarded && !forceOnboarding) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Error loading homepage data:", err);
      setError("Failed to load homepage data. Please try again.");
      showNotification("Failed to load homepage data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (tasteProfile: {
    preferredCuisines: string[];
    priceRange: string;
    preferredBorough: string;
  }) => {
    try {
      // Convert to DTO format
      const tasteProfileDto: TasteProfileDto = {
        preferredCuisines: tasteProfile.preferredCuisines,
        priceRange: tasteProfile.priceRange,
        preferredBorough: tasteProfile.preferredBorough,
        isVegan: tasteProfile.preferredCuisines.includes("Vegan"),
        isVegetarian: tasteProfile.preferredCuisines.includes("Vegetarian"),
      };

      await homepageApi.createTasteProfile(tasteProfileDto);
      await homepageApi.trackTasteProfileComplete();
      
      showNotification("Taste profile created successfully!", "success");
      setShowOnboarding(false);
      
      // Reload homepage data with personalized recommendations
      await loadHomepageData();
    } catch (err) {
      console.error("Error creating taste profile:", err);
      showNotification("Failed to save taste profile. Please try again.", "error");
    }
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    showNotification("You can set up your taste profile later from your profile page!", "success");
  };

  const handleRestaurantClick = async (restaurant: RestaurantSummaryDto) => {
    try {
      // Track analytics
      await homepageApi.trackRestaurantClick(restaurant.id, getSectionFromRestaurant(restaurant));
      
      // Create Google Maps search URL with restaurant name and location
      const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.address || 'New York'}`);
      const googleMapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
      
      // Open in new tab
      window.open(googleMapsUrl, '_blank');
    } catch (err) {
      console.error("Error tracking restaurant click:", err);
      // Still redirect to Google Maps even if analytics fails
      const searchQuery = encodeURIComponent(`${restaurant.name} New York`);
      const googleMapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleStartSession = async () => {
    try {
      await homepageApi.trackSessionStart();
      router.push("/sessions/create");
    } catch (err) {
      console.error("Error tracking session start:", err);
      router.push("/sessions/create");
    }
  };

  const handleJoinSession = async () => {
    try {
      await homepageApi.trackSessionJoin();
      router.push("/sessions/Joinpage");
    } catch (err) {
      console.error("Error tracking session join:", err);
      router.push("/sessions/Joinpage");
    }
  };

  const handleToggleLike = async (restaurantId: string) => {
    try {
      if (!homepageData) return;

      // Find the restaurant and current like status
      const restaurant = findRestaurantById(restaurantId, homepageData);
      if (!restaurant) return;

      const newLikedStatus = !restaurant.isLiked;
      
      // Optimistically update UI
      const updatedData = updateRestaurantLikeStatus(homepageData, restaurantId, newLikedStatus);
      setHomepageData(updatedData);

      // Track analytics
      await homepageApi.trackRestaurantLike(restaurantId, newLikedStatus);
      
      // Show feedback
      showNotification(newLikedStatus ? "Added to favorites!" : "Removed from favorites", "success");
    } catch (err) {
      console.error("Error toggling like:", err);
      showNotification("Failed to update favorite status", "error");
      
      // Revert optimistic update
      await loadHomepageData();
    }
  };

  // Helper functions
  const getSectionFromRestaurant = (restaurant: RestaurantSummaryDto): string => {
    if (!homepageData) return "unknown";
    
    if (homepageData.yourPicks.some(r => r.id === restaurant.id)) return "your_picks";
    if (homepageData.highlights.some(r => r.id === restaurant.id)) return "highlights";
    if (homepageData.trending.some(r => r.id === restaurant.id)) return "trending";
    if (homepageData.spotlight.some(r => r.id === restaurant.id)) return "spotlight";
    
    return "unknown";
  };

  const findRestaurantById = (id: string, data: HomepageResponseDto): RestaurantSummaryDto | null => {
    const allRestaurants = [
      ...data.yourPicks,
      ...data.highlights,
      ...data.trending,
      ...data.spotlight,
    ];
    return allRestaurants.find(r => r.id === id) || null;
  };

  const updateRestaurantLikeStatus = (
    data: HomepageResponseDto,
    restaurantId: string,
    isLiked: boolean
  ): HomepageResponseDto => {
    const updateSection = (restaurants: RestaurantSummaryDto[]) =>
      restaurants.map(r => r.id === restaurantId ? { ...r, isLiked } : r);

    return {
      ...data,
      yourPicks: updateSection(data.yourPicks),
      highlights: updateSection(data.highlights),
      trending: updateSection(data.trending),
      spotlight: updateSection(data.spotlight),
    };
  };

  // Render onboarding if needed
  if (showOnboarding) {
    return (
      <TasteProfileOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={isAuthenticated ? handleOnboardingSkip : undefined}
      />
    );
  }

  // Render error state
  if (error && !homepageData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadHomepageData}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render homepage grid
  return (
    <HomepageGrid
      data={homepageData || {
        yourPicks: [],
        highlights: [],
        trending: [],
        spotlight: [],
        hasOnboarded: false,
      }}
      isLoading={isLoading}
      onRestaurantClick={handleRestaurantClick}
      onStartSession={handleStartSession}
      onJoinSession={handleJoinSession}
      onToggleLike={handleToggleLike}
    />
  );
}

// Export default for easier importing
export default Homepage; 