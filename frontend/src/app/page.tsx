"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Star, LogOut, UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/button";

import { TasteProfileOnboarding } from "@/components/TasteProfileOnboarding";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { SocialProofStrip } from "@/components/SocialProofStrip";
import { HowItWorks } from "@/components/HowItWorks";
import { ActivityFeed } from "@/components/ActivityFeed";
import { FinalCTA } from "@/components/FinalCTA";
import { GreetingHeader } from "@/components/GreetingHeader";
import { ActiveSessionBanner } from "@/components/ActiveSessionBanner";
import { DiscoveryEntryCard } from "@/components/DiscoveryEntryCard";
import { FavoritesShelf } from "@/components/FavoritesShelf";
import { WatchlistShelf } from "@/components/WatchlistShelf";
import { useHomepageApi, HomepageResponseDto, RestaurantSummaryDto, TasteProfileDto, API_BASE_URL } from "@/api/homepageApi";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/*  1.  Page component                                                         */
/* -------------------------------------------------------------------------- */

// Simple notification utility
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // You can replace this with your preferred notification system
};

const GOOGLE_PHOTO_PROXY = `${API_BASE_URL}/restaurants/photos`;

interface ActiveSessionData {
  sessionId: string;
  participantCount: number;
  restaurantCount: number;
  elapsedMinutes: number;
}

async function fetchActiveSession(): Promise<ActiveSessionData | null> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch("/api/sessions/active", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data) return null;
    const s = json.data;
    return {
      sessionId: s.id ?? s.sessionId,
      participantCount: s.participantCount ?? 0,
      restaurantCount: s.restaurantCount ?? 0,
      elapsedMinutes: s.elapsedMinutes ?? 0,
    };
  } catch {
    return null;
  }
}

// Ensure we have a sync helper for .map()
function enrichWithPhotoUrls(r: RestaurantSummaryDto, max = 1): RestaurantSummaryDto {
  if (!r) return r;
  if (r.photoReferences && !r.photos) {
    r.photos = r.photoReferences
      .slice(0, max)
      .map((ref: string) =>
        `${GOOGLE_PHOTO_PROXY}/${r.id}/${ref}?maxWidthPx=600&maxHeightPx=600`
      );
  }
  return r;
}

const Index = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const homepageApi = useHomepageApi();
  
  // Debug logging
  console.log("Homepage: Authentication state - isAuthenticated:", isAuthenticated, "user:", user);
  
  // Removed search functionality
  
  // Homepage/Dashboard state
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [homepageData, setHomepageData] = useState<HomepageResponseDto | null>(null);
  const [isLoadingHomepageData, setIsLoadingHomepageData] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [favorites, setFavorites] = useState<RestaurantSummaryDto[]>([]);

  // Load homepage data and check onboarding status
  const loadHomepageData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoadingHomepageData(true);
      const [data, session] = await Promise.all([
        homepageApi.getHomepageData(true),
        fetchActiveSession(),
      ]);
      const hydrated = {
        ...data,
        yourPicks: (data.yourPicks ?? []).map(enrichWithPhotoUrls),
        highlights: (data.highlights ?? []).map(enrichWithPhotoUrls),
        trending: (data.trending ?? []).map(enrichWithPhotoUrls),
        spotlight: (data.spotlight ?? []).map(enrichWithPhotoUrls),
      };
      setHomepageData(hydrated);
      setActiveSession(session);

      const allRestaurants = [
        ...(hydrated.yourPicks ?? []),
        ...(hydrated.highlights ?? []),
        ...(hydrated.trending ?? []),
        ...(hydrated.spotlight ?? []),
      ];
      const likedUnique = allRestaurants.filter(
        (r, i, arr) => r.isLiked && arr.findIndex((x) => x.id === r.id) === i
      );
      setFavorites(likedUnique);

      console.log("Homepage data loaded - hasOnboarded:", data.hasOnboarded);

      if (data.hasOnboarded === false) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } catch (err) {
      console.error("Error loading homepage data:", err);
      if (err instanceof Error && err.message.includes('401')) {
        console.log("User not authenticated - showing basic homepage");
      } else {
        showNotification("Failed to load personalized content", "error");
      }
    } finally {
      setIsLoadingHomepageData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Only load personalized data for authenticated users
    if (isAuthenticated) {
      loadHomepageData();
    }
  }, [isAuthenticated, loadHomepageData]);

  const handleOnboardingComplete = async (tasteProfile: {
    preferredCuisines: string[];
    priceRange: string;
    preferredBorough: string;
  }) => {
    console.log("Starting taste profile creation:", tasteProfile);
    try {
      const tasteProfileDto: TasteProfileDto = {
        preferredCuisines: tasteProfile.preferredCuisines,
        priceRange: tasteProfile.priceRange,
        preferredBorough: tasteProfile.preferredBorough,
        isVegan: tasteProfile.preferredCuisines.includes("Vegan"),
        isVegetarian: tasteProfile.preferredCuisines.includes("Vegetarian"),
      };

      console.log("Creating taste profile with DTO:", tasteProfileDto);
      await homepageApi.createTasteProfile(tasteProfileDto);
      console.log("Taste profile created successfully");
      
      await homepageApi.trackTasteProfileComplete();
      console.log("Analytics tracked");
      
      showNotification("Taste profile created successfully!", "success");
      setShowOnboarding(false);
      console.log("Onboarding hidden, reloading homepage data...");
      
      // Wait a moment to ensure backend transaction is committed before reloading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload homepage data with personalized recommendations
      await loadHomepageData();
      console.log("Homepage data reloaded");
    } catch (err) {
      console.error("Error creating taste profile:", err);
      showNotification("Failed to save taste profile. Please try again.", "error");
      // Don't hide onboarding on error - let user try again
    }
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    showNotification("You can set up your taste profile later from your profile page!", "success");
  };

  const handleRestaurantClick = async (restaurant: RestaurantSummaryDto) => {
    try {
      await homepageApi.trackRestaurantClick(restaurant.id, "homepage");
      
      // Open website if available
      if (restaurant.websiteUri) {
        window.open(restaurant.websiteUri, '_blank', 'noopener,noreferrer');
        showNotification(`Opening ${restaurant.name} website...`, "success");
      } else {
        showNotification(`${restaurant.name} - No website available`, "success");
      }
    } catch (err) {
      console.error("Error tracking restaurant click:", err);
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
      
      // Find the restaurant
      const allRestaurants = [...homepageData.yourPicks, ...homepageData.highlights, ...homepageData.trending, ...homepageData.spotlight];
      const restaurant = allRestaurants.find(r => r.id === restaurantId);
      if (!restaurant) return;

      const newLikedStatus = !restaurant.isLiked;
      await homepageApi.trackRestaurantLike(restaurantId, newLikedStatus);
      
      showNotification(newLikedStatus ? "Added to favorites!" : "Removed from favorites", "success");
      
      // Refresh data to get updated like status
      await loadHomepageData();
    } catch (err) {
      console.error("Error toggling like:", err);
      showNotification("Failed to update favorite status", "error");
    }
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <TasteProfileOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={isAuthenticated ? handleOnboardingSkip : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6f0] flex flex-col">
      {/* Header */}
      <header className="bg-[#fdf6f0] border-b border-[rgba(0,0,0,0.06)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#e8531a] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="text-xl font-bold text-[#1a1a1a]" style={{ fontFamily: "'Georgia', serif" }}>Foodsy</span>
              </div>
              {isAuthenticated ? (
                <span className="text-sm text-[#444] bg-[#e8e8e8] px-2 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600 }}>
                  Dashboard
                </span>
              ) : (
                <span className="text-[#444] bg-[#e8e8e8] px-2 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600 }}>
                  NY
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleJoinSession}
              >
                Sessions
              </Button>
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/discover")}
                >
                  Discover
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Favorites
              </Button>
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 bg-orange-50 px-3 py-1 rounded-full">
                    <UserIcon className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      {user.displayName}
                    </span>
                  </div>
                  <Button
                    onClick={signOut}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <button
                  className="text-white font-bold cursor-pointer"
                  style={{
                    background: "#e8531a",
                    borderRadius: 10,
                    padding: "8px 20px",
                    fontSize: 14,
                    border: "none",
                    boxShadow: "0 4px 14px rgba(232,83,26,0.35)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
                  onClick={() => window.location.href = `https://apifoodsy-backend.com/oauth2/authorization/google`}
                >
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content wrapper with flex-1 to fill space */}
      <main className="flex-1">

      {/* Authenticated dashboard - new scroll layout */}
      {isAuthenticated && (
        <>
          <GreetingHeader
            firstName={user?.firstName || user?.displayName || ""}
            onStartSession={handleStartSession}
            onJoinSession={handleJoinSession}
          />
          {activeSession && <ActiveSessionBanner {...activeSession} />}
          <DiscoveryEntryCard />
          <FavoritesShelf
            onStartDiscovery={() => router.push("/discover")}
          />
          <WatchlistShelf onStartDiscovery={() => router.push("/discover")} />
          <TrendingCarousel
            onSignUpPrompt={() => {}}
            isAuthenticated={true}
            userBorough={homepageData ? undefined : undefined}
          />
        </>
      )}

      {/* Taste Profile Setup Banner - Show for authenticated users who haven't completed onboarding */}
      {isAuthenticated && homepageData && homepageData.hasOnboarded === false && !showOnboarding && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
              <span className="font-medium">
                Get personalized restaurant recommendations! Complete your taste profile.
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-white border-white/30 hover:bg-white/10"
              onClick={() => setShowOnboarding(true)}
            >
              Setup Now
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section - Only for anonymous users */}
      {!isAuthenticated && (
        <section className="relative px-4 sm:px-8" style={{ padding: "56px 32px 48px" }}>
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="font-extrabold text-[#1a1a1a] mb-4"
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 800,
                lineHeight: 1.15,
              }}
            >
              Never Ask
              <span className="text-[#e8531a]">
                {" "}&#34;Where Should We Eat?&#34;{" "}
              </span>
              Again
            </h1>
            <p className="mb-8 max-w-[480px] mx-auto text-[#666666]" style={{ fontSize: 16, lineHeight: 1.6 }}>
              Find restaurants you love, save them to your favorites, then let
              your group vote on tonight&#39;s dinner. No more endless
              back-and-forth!
            </p>
            <button
              className="text-white font-bold cursor-pointer"
              style={{
                background: "#e8531a",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                border: "none",
                boxShadow: "0 4px 14px rgba(232,83,26,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
              onClick={() => setShowSignUpPrompt(true)}
            >
              + Get Started Free
            </button>
          </div>
        </section>
      )}

      {/* Anonymous sections */}
      {!isAuthenticated && (
        <TrendingCarousel onSignUpPrompt={() => setShowSignUpPrompt(true)} />
      )}
      {!isAuthenticated && <SocialProofStrip />}
      {!isAuthenticated && (
        <HowItWorks onStartSession={() => setShowSignUpPrompt(true)} />
      )}
      {!isAuthenticated && <ActivityFeed />}
      {!isAuthenticated && (
        <FinalCTA onSignUp={() => setShowSignUpPrompt(true)} />
      )}



      {/* Sign-up prompt modal (triggered by favorite button in carousel) */}
      {showSignUpPrompt && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSignUpPrompt(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Save Your Favorites</h3>
            <p className="text-gray-600 mb-6">
              Sign up to save favorites and use them in your group voting sessions.
            </p>
            <button
              className="w-full text-white font-bold cursor-pointer mb-3"
              style={{
                background: "#e8531a",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                border: "none",
                boxShadow: "0 4px 14px rgba(232,83,26,0.35)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
              onClick={() => {
                window.location.href = `https://apifoodsy-backend.com/oauth2/authorization/google`;
              }}
            >
              Sign Up with Google
            </button>
            <button
              className="text-sm text-gray-400 hover:text-gray-600"
              onClick={() => setShowSignUpPrompt(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      
      
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-[#e8531a] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
                                  <span className="text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>Foodsy</span>
          </div>
          <p className="text-gray-400">
            Stop the dinner debate. Start enjoying great meals together.
          </p>
        </div>
      </footer>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  3.  Export                                                                */
/* -------------------------------------------------------------------------- */
export default Index;
