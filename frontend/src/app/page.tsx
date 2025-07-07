"use client";

import { useState, useEffect } from "react";
import { Search, Heart, Star, Users, Plus, LogOut, UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card, CardContent } from "@/components/card";
import Link from "next/link";
import { TasteProfileOnboarding } from "@/components/TasteProfileOnboarding";
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
  
  // Existing state
  const [searchQuery, setSearchQuery] = useState("");
  
  // MVP Homepage state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [homepageData, setHomepageData] = useState<HomepageResponseDto | null>(null);
  const [showPersonalizedContent, setShowPersonalizedContent] = useState(false);
  const [isLoadingHomepageData, setIsLoadingHomepageData] = useState(false);

  // Load homepage data and check onboarding status
  useEffect(() => {
    // Only load personalized data for authenticated users
    if (isAuthenticated) {
      loadHomepageData();
    }
  }, [isAuthenticated]);

  const loadHomepageData = async () => {
    // Only proceed if user is authenticated
    if (!isAuthenticated) {
      setShowPersonalizedContent(false);
      return;
    }

    try {
      setIsLoadingHomepageData(true);
      const data = await homepageApi.getHomepageData(true);
      const hydrated = {
        ...data,
        yourPicks: (data.yourPicks ?? []).map(enrichWithPhotoUrls),
        highlights: (data.highlights ?? []).map(enrichWithPhotoUrls),
        trending: (data.trending ?? []).map(enrichWithPhotoUrls),
        spotlight: (data.spotlight ?? []).map(enrichWithPhotoUrls),
      };
      setHomepageData(hydrated);
      setShowPersonalizedContent(true);
      
      // Show onboarding if user hasn't completed it
      if (!data.hasOnboarded) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Error loading homepage data:", err);
      setShowPersonalizedContent(false);
      // If it's a 401 error, don't show the error to user since they're not authenticated
      if (err instanceof Error && err.message.includes('401')) {
        console.log("User not authenticated - showing basic homepage");
      } else {
        showNotification("Failed to load personalized content", "error");
      }
    } finally {
      setIsLoadingHomepageData(false);
    }
  };

  const handleOnboardingComplete = async (tasteProfile: {
    preferredCuisines: string[];
    priceRange: string;
    preferredBorough: string;
  }) => {
    try {
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
      await homepageApi.trackRestaurantClick(restaurant.id, "homepage");
      // For now, just show a notification - you can add restaurant detail pages later
      showNotification(`Opening ${restaurant.name}...`, "success");
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

  const trendingList = homepageData?.trending ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Foodsie</span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                NY
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleStartSession}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleJoinSession}
              >
                <Users className="w-4 h-4 mr-2" />
                Sessions
              </Button>
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
                <Link href="/auth/signin">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Taste Profile Setup Banner - Show for authenticated users who haven't completed onboarding */}
      {isAuthenticated && homepageData && !homepageData.hasOnboarded && !showOnboarding && (
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

      {/* Hero Section */}
      <section className="relative py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Never Ask
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
              {" "}
              &#34;Where Should We Eat?&#34;{" "}
            </span>
            Again
          </h1>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Find restaurants you love, save them to your favorites, then let
            your group vote on tonight&#39;s dinner. No more endless
            back-and-forth!
          </p>

          {/* Search Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search restaurants, cuisines, dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg border-gray-200 focus:border-orange-300"
                />
              </div>
              <Button
                size="lg"
                className="h-12 px-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                Find Places
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Loading indicator for personalized content */}
      {isLoadingHomepageData && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center animate-pulse">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="text-lg font-medium text-gray-600">Loading your personalized recommendations...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sign Up Encouragement for Anonymous Users */}
      {!isAuthenticated && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border border-orange-100">
              <div className="inline-flex items-center space-x-2 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">Get Personalized Recommendations</span>
              </div>
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                Sign up to discover restaurants tailored to your taste preferences and see what&apos;s trending in NYC!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Sign Up for Free
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50 px-8"
                  >
                    <UserIcon className="w-5 h-5 mr-2" />
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Personalized Content - Only show if user has completed onboarding */}
      {showPersonalizedContent && homepageData && !isLoadingHomepageData && (
        <>
          {/* Your Picks Section */}
          {homepageData.yourPicks.length > 0 && (
            <section className="py-16 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Curated Picks
                    </h2>
                    <p className="text-gray-600">
                      Personalized recommendations based on your taste profile
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    View All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {homepageData.yourPicks.slice(0, 6).map((restaurant, index) => (
                    <Card
                      key={`${restaurant.id}-${index}`}
                      className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
                      onClick={() => handleRestaurantClick(restaurant)}
                    >
                      <CardContent className="p-0">
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={(restaurant.photos && restaurant.photos.length > 0 ? restaurant.photos[0] : "/placeholder.svg")}
                            alt={restaurant.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(restaurant.id);
                            }}
                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              restaurant.isLiked
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-white/80 hover:bg-white text-gray-600"
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${restaurant.isLiked ? "fill-current" : ""}`}
                            />
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
                              {restaurant.name}
                            </h3>
                            <span className="text-sm font-medium text-gray-600">
                              {restaurant.priceLevel}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {restaurant.category}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium">
                                {restaurant.rating}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({restaurant.userRatingCount})
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Trending Now Section */}
          {trendingList.length > 0 && (
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Trending Now in NYC
                    </h2>
                    <p className="text-gray-600">
                      Most popular restaurants this week
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    View All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {trendingList.slice(0, 4).map((restaurant: RestaurantSummaryDto, index: number) => (
                    <Card
                      key={`${restaurant.id}-${index}`}
                      className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
                      onClick={() => handleRestaurantClick(restaurant)}
                    >
                      <CardContent className="p-0">
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={(restaurant.photos && restaurant.photos.length > 0 ? restaurant.photos[0] : "/placeholder.svg")}
                            alt={restaurant.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Rank Badge */}
                          <div className="absolute top-3 left-3 w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">#{index + 1}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(restaurant.id);
                            }}
                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              restaurant.isLiked
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-white/80 hover:bg-white text-gray-600"
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${restaurant.isLiked ? "fill-current" : ""}`}
                            />
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
                              {restaurant.name}
                            </h3>
                            <span className="text-sm font-medium text-gray-600">
                              {restaurant.priceLevel}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {restaurant.category}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium">
                                {restaurant.rating}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({restaurant.userRatingCount})
                              </span>
                            </div>
                          </div>
                          {restaurant.clickCount && (
                            <div className="flex items-center text-sm text-orange-600 font-medium mt-2">
                              <Users className="w-4 h-4 mr-1" />
                              {restaurant.clickCount} people interested
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}



      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            End the &#34;Where Should We Eat?&#34; Struggle
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Build your list of favorite spots, then let your group vote on
            tonight&#39;s dinner. Decision made, everyone&#39;s happy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleStartSession}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start New Session
            </Button>
            <Button
              size="lg"
              onClick={handleJoinSession}
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50 px-8"
            >
              <Users className="w-5 h-5 mr-2" />
              Join Session
            </Button>
          </div>
        </div>
      </section>
      

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold">Foodsie</span>
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
