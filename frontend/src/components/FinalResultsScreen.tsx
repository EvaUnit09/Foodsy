"use client";

import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Restaurant } from "./RestaurantCard";
import { MapPin, Star, Clock, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

interface FinalResultsScreenProps {
  winner: Restaurant;
  sessionId: number;
}

export function FinalResultsScreen({ winner, sessionId }: FinalResultsScreenProps) {
  const router = useRouter();

  const handleExitSession = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Winner Announcement */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold text-green-800 mb-2">
            We Have a Winner!
          </h1>
          <p className="text-xl text-green-600">
            Your group has chosen the perfect restaurant
          </p>
        </div>

        {/* Winner Details Card */}
        <Card className="mb-8 shadow-xl border-2 border-green-200">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {winner.name}
              </h2>
              <div className="flex items-center justify-center text-gray-600 mb-4">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="text-lg">{winner.address}</span>
              </div>
              
              {/* Vote Count */}
              <div className="inline-block bg-green-100 px-4 py-2 rounded-full mb-6">
                <span className="text-green-800 font-semibold text-lg">
                  Final Votes: {winner.voteCount || winner.likeCount || 0}
                </span>
              </div>
            </div>

            {/* Restaurant Details Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {winner.category && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">
                    <strong>Cuisine:</strong> {winner.category}
                  </span>
                </div>
              )}

              {winner.rating && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-500 mr-2" />
                  <span className="text-gray-700">
                    <strong>Rating:</strong> {winner.rating}/5
                    {winner.userRatingCount && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({winner.userRatingCount} reviews)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {winner.priceRange && (
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-gray-700">
                    <strong>Price:</strong> {winner.priceRange}
                  </span>
                </div>
              )}

              {winner.currentOpeningHours && (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-gray-700">
                    <strong>Hours:</strong> {winner.currentOpeningHours}
                  </span>
                </div>
              )}
            </div>

            {/* Summaries */}
            {winner.generativeSummary && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">About This Restaurant:</h3>
                <p className="text-gray-600 leading-relaxed">{winner.generativeSummary}</p>
              </div>
            )}

            {winner.reviewSummary && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">What People Are Saying:</h3>
                <p className="text-gray-600 leading-relaxed">{winner.reviewSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <Button
            onClick={handleExitSession}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Exit Session
          </Button>
          
          <div className="text-sm text-gray-500">
            Session #{sessionId} completed
          </div>
        </div>
      </div>
    </div>
  );
}