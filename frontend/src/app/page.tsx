"use client";

import { useState } from "react";
import { Search, Heart, Star, Users, Plus, LogOut, UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*  1.  Static data (kept outside the component)                               */
/* -------------------------------------------------------------------------- */
const cuisineCategories = [
  {
    name: "Italian",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
    count: "120+ places",
  },
  {
    name: "Japanese",
    image:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
    count: "85+ places",
  },
  {
    name: "Mexican",
    image:
      "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop",
    count: "95+ places",
  },
  {
    name: "Indian",
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop",
    count: "75+ places",
  },
  {
    name: "American",
    image:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop",
    count: "150+ places",
  },
  {
    name: "Thai",
    image:
      "https://images.unsplash.com/photo-1559314809-0f31657def5e?w=400&h=300&fit=crop",
    count: "60+ places",
  },
  {
    name: "Chinese",
    image:
      "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=300&fit=crop",
    count: "110+ places",
  },
  {
    name: "Mediterranean",
    image:
      "https://images.unsplash.com/photo-1544510795-6f93fa4d5694?w=400&h=300&fit=crop",
    count: "45+ places",
  },
  {
    name: "French",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    count: "35+ places",
  },
  {
    name: "Korean",
    image:
      "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop",
    count: "55+ places",
  },
  {
    name: "Vietnamese",
    image:
      "https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=300&fit=crop",
    count: "40+ places",
  },
  {
    name: "Greek",
    image:
      "https://images.unsplash.com/photo-1563379091339-03246963d4d6?w=400&h=300&fit=crop",
    count: "30+ places",
  },
];

const featuredRestaurants = [
  {
    id: 1,
    name: "Sakura Sushi Bar",
    cuisine: "Japanese",
    rating: 4.8,
    reviews: 324,
    image:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&h=400&fit=crop",
    distance: "0.5 miles",
    priceRange: "$$",
    isLiked: false,
    atmosphere: ["Cozy", "Date Night"],
  },
  {
    id: 2,
    name: "Nonna's Kitchen",
    cuisine: "Italian",
    rating: 4.6,
    reviews: 198,
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=600&h=400&fit=crop",
    distance: "1.2 miles",
    priceRange: "$$$",
    isLiked: true,
    atmosphere: ["Family", "Traditional"],
  },
  {
    id: 3,
    name: "Spice Route",
    cuisine: "Indian",
    rating: 4.7,
    reviews: 156,
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop",
    distance: "0.8 miles",
    priceRange: "$$",
    isLiked: false,
    atmosphere: ["Vibrant", "Casual"],
  },
  {
    id: 4,
    name: "The Burger Joint",
    cuisine: "American",
    rating: 4.5,
    reviews: 267,
    image:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=400&fit=crop",
    distance: "1.5 miles",
    priceRange: "$",
    isLiked: false,
    atmosphere: ["Casual", "Quick Bite"],
  },
];

/* -------------------------------------------------------------------------- */
/*  2.  Page component                                                         */
/* -------------------------------------------------------------------------- */
const Index = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

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
              <Link href={"/sessions/create"}>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </Link>
              <Link href={"/sessions/Joinpage"}>
                <Button variant="ghost" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Sessions
                </Button>
              </Link>
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

      {/* Cuisine categories */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Explore by Cuisine
            </h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" className="h-10 w-10">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {cuisineCategories.map((cuisine) => (
              <Card
                key={cuisine.name}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={cuisine.image}
                      alt={cuisine.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <h3 className="text-white font-semibold text-lg">
                        {cuisine.name}
                      </h3>
                      <p className="text-white/80 text-sm">{cuisine.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured restaurants */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Popular Choices Near You
            </h2>
            <Button
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredRestaurants.map((restaurant) => (
              <Card
                key={restaurant.id}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`absolute top-3 right-3 w-8 h-8 p-0 rounded-full ${
                        restaurant.isLiked
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-white/80 hover:bg-white text-gray-600"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${restaurant.isLiked ? "fill-current" : ""}`}
                      />
                    </Button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
                        {restaurant.name}
                      </h3>
                      <span className="text-sm font-medium text-gray-600">
                        {restaurant.priceRange}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {restaurant.cuisine} • {restaurant.distance}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">
                          {restaurant.rating}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({restaurant.reviews})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {restaurant.atmosphere.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-orange-100 text-orange-700"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

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
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
            >
              Start Building Your List
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50 px-8"
            >
              <Users className="w-5 h-5 mr-2" />
              See How Voting Works
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
