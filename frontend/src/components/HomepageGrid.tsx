"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Heart, Star, MapPin, Users, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import Image from "next/image";

// Types for homepage data
interface RestaurantSummary {
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

interface HomepageData {
  yourPicks: RestaurantSummary[];
  highlights: RestaurantSummary[];
  trending: RestaurantSummary[];
  spotlight: RestaurantSummary[];
}

interface HomepageGridProps {
  data: HomepageData;
  isLoading?: boolean;
  onRestaurantClick: (restaurant: RestaurantSummary) => void;
  onStartSession: () => void;
  onJoinSession: () => void;
  onToggleLike: (restaurantId: string) => void;
}

export function HomepageGrid({
  data,
  isLoading = false,
  onRestaurantClick,
  onStartSession,
  onJoinSession,
  onToggleLike,
}: HomepageGridProps) {
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  // Auto-rotate spotlight carousel
  useEffect(() => {
    if (data.spotlight.length > 1) {
      const interval = setInterval(() => {
        setSpotlightIndex((prev) => (prev + 1) % data.spotlight.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [data.spotlight.length]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <HeroSection onStartSession={onStartSession} onJoinSession={onJoinSession} />

        {/* Your Picks Section */}
        <Section title="Curated Picks" subtitle="Personalized recommendations based on your taste">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.yourPicks.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => onRestaurantClick(restaurant)}
                onToggleLike={() => onToggleLike(restaurant.id)}
              />
            ))}
          </div>
        </Section>

        {/* Neighborhood Highlights Section */}
        <Section title="Neighborhood Highlights" subtitle="Top-rated spots in your area">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.highlights.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => onRestaurantClick(restaurant)}
                onToggleLike={() => onToggleLike(restaurant.id)}
                compact
              />
            ))}
          </div>
        </Section>

        {/* Trending Now Section */}
        <Section title="Trending Now in NYC" subtitle="Most popular restaurants this week">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.trending.map((restaurant, index) => (
              <TrendingCard
                key={restaurant.id}
                restaurant={restaurant}
                rank={index + 1}
                onClick={() => onRestaurantClick(restaurant)}
                onToggleLike={() => onToggleLike(restaurant.id)}
              />
            ))}
          </div>
        </Section>

        {/* Spotlight Carousel Section */}
        <Section title="Spotlight" subtitle="Featured restaurants worth discovering">
          <SpotlightCarousel
            restaurants={data.spotlight}
            currentIndex={spotlightIndex}
            onIndexChange={setSpotlightIndex}
            onRestaurantClick={onRestaurantClick}
            onToggleLike={onToggleLike}
          />
        </Section>
      </div>
    </div>
  );
}

// Hero Section Component
function HeroSection({ onStartSession, onJoinSession }: { onStartSession: () => void; onJoinSession: () => void }) {
  return (
    <div className="text-center py-12 mb-16">
      <div className="inline-flex items-center space-x-2 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <span className="text-3xl font-bold text-gray-900">Welcome to Foodsie</span>
      </div>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Discover amazing restaurants and make group decisions effortlessly
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={onStartSession}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-lg px-8 py-3 h-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Start New Session
        </Button>
        <Button
          onClick={onJoinSession}
          variant="outline"
          className="border-orange-200 text-orange-600 hover:bg-orange-50 text-lg px-8 py-3 h-auto"
        >
          <Users className="w-5 h-5 mr-2" />
          Join Session
        </Button>
      </div>
    </div>
  );
}

// Section wrapper component
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mb-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// Restaurant Card Component
interface RestaurantCardProps {
  restaurant: RestaurantSummary;
  onClick: () => void;
  onToggleLike: () => void;
  compact?: boolean;
}

function RestaurantCard({ restaurant, onClick, onToggleLike, compact = false }: RestaurantCardProps) {
  const cardClasses = compact
    ? "h-80 cursor-pointer group"
    : "h-96 cursor-pointer group";

  return (
    <Card className={`${cardClasses} shadow-lg hover:shadow-xl transition-all duration-300 border-0 overflow-hidden`}>
      <CardContent className="p-0 h-full">
        <div className="relative h-full">
          {/* Restaurant Image */}
          <div className="relative h-48 overflow-hidden">
            <Image
              src={restaurant.photos[0] || "/placeholder.svg"}
              alt={restaurant.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Like Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike();
              }}
              className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${restaurant.isLiked ? "fill-red-500 text-red-500" : "text-gray-600"}`}
              />
            </button>
          </div>

          {/* Restaurant Info */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
                {restaurant.name}
              </h3>
              <p className="text-gray-600 text-sm mb-2">{restaurant.category}</p>
              
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{restaurant.rating} ({restaurant.userRatingCount})</span>
                </div>
                <span className="text-gray-400">·</span>
                <span className="text-sm font-medium text-gray-700">{restaurant.priceLevel}</span>
              </div>

              {!compact && (
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="line-clamp-1">{restaurant.address}</span>
                </div>
              )}
            </div>

            <Button
              onClick={onClick}
              variant="outline"
              className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 mt-auto"
            >
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Trending Card Component (with ranking)
function TrendingCard({ restaurant, rank, onClick, onToggleLike }: { restaurant: RestaurantSummary; rank: number; onClick: () => void; onToggleLike: () => void }) {
  return (
    <Card className="h-80 cursor-pointer group shadow-lg hover:shadow-xl transition-all duration-300 border-0 overflow-hidden">
      <CardContent className="p-0 h-full">
        <div className="relative h-full">
          {/* Restaurant Image */}
          <div className="relative h-48 overflow-hidden">
            <Image
              src={restaurant.photos[0] || "/placeholder.svg"}
              alt={restaurant.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Rank Badge */}
            <div className="absolute top-3 left-3 w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">#{rank}</span>
            </div>
            {/* Like Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike();
              }}
              className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${restaurant.isLiked ? "fill-red-500 text-red-500" : "text-gray-600"}`}
              />
            </button>
          </div>

          {/* Restaurant Info */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
                {restaurant.name}
              </h3>
              <p className="text-gray-600 text-sm mb-2">{restaurant.category}</p>
              
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{restaurant.rating} ({restaurant.userRatingCount})</span>
                </div>
                <span className="text-gray-400">·</span>
                <span className="text-sm text-gray-600">{restaurant.priceLevel}</span>
              </div>

              {restaurant.clickCount && (
                <div className="flex items-center text-sm text-orange-600 font-medium mb-2">
                  <Users className="w-4 h-4 mr-1" />
                  {restaurant.clickCount} people interested
                </div>
              )}
            </div>

            <Button
              onClick={onClick}
              variant="outline"
              className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 mt-auto"
            >
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Spotlight Carousel Component
function SpotlightCarousel({
  restaurants,
  currentIndex,
  onIndexChange,
  onRestaurantClick,
  onToggleLike,
}: {
  restaurants: RestaurantSummary[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onRestaurantClick: (restaurant: RestaurantSummary) => void;
  onToggleLike: (restaurantId: string) => void;
}) {
  if (restaurants.length === 0) return null;

  const currentRestaurant = restaurants[currentIndex];

  const nextSlide = () => {
    onIndexChange((currentIndex + 1) % restaurants.length);
  };

  const prevSlide = () => {
    onIndexChange((currentIndex - 1 + restaurants.length) % restaurants.length);
  };

  return (
    <div className="relative">
      <Card className="shadow-2xl border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Restaurant Image */}
            <div className="relative h-96 lg:h-auto">
              <Image
                src={currentRestaurant.photos[0] || "/placeholder.svg"}
                alt={currentRestaurant.name}
                fill
                className="object-cover"
              />
              
              {/* Navigation buttons */}
              <div className="absolute inset-0 flex items-center justify-between p-4">
                <Button
                  onClick={prevSlide}
                  variant="outline"
                  size="icon"
                  className="bg-white/80 hover:bg-white border-0 shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={nextSlide}
                  variant="outline"
                  size="icon"
                  className="bg-white/80 hover:bg-white border-0 shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Slide indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {restaurants.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => onIndexChange(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Restaurant Info */}
            <div className="p-8 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    Spotlight
                  </Badge>
                  <button
                    onClick={() => onToggleLike(currentRestaurant.id)}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-red-300 transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${currentRestaurant.isLiked ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                    />
                  </button>
                </div>

                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentRestaurant.name}
                </h3>
                <p className="text-gray-600 text-lg mb-4">{currentRestaurant.category}</p>
                
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{currentRestaurant.rating} ({currentRestaurant.userRatingCount})</span>
                  </div>
                  <span className="text-gray-400">·</span>
                  <span className="font-medium text-gray-700">{currentRestaurant.priceLevel}</span>
                </div>

                <div className="flex items-center text-gray-600 mb-6">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{currentRestaurant.address}</span>
                </div>
              </div>

              <Button
                onClick={() => onRestaurantClick(currentRestaurant)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-lg px-8 py-3 h-auto"
              >
                View Details
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Skeleton */}
        <div className="text-center py-12 mb-16">
          <div className="w-64 h-8 bg-gray-200 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="w-96 h-6 bg-gray-200 rounded-lg mx-auto mb-8 animate-pulse" />
          <div className="flex gap-4 justify-center">
            <div className="w-40 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-40 h-12 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Sections Skeleton */}
        {[1, 2, 3, 4].map((section) => (
          <div key={section} className="mb-16">
            <div className="mb-8">
              <div className="w-48 h-8 bg-gray-200 rounded-lg mb-2 animate-pulse" />
              <div className="w-64 h-6 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((card) => (
                <div key={card} className="h-96 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 