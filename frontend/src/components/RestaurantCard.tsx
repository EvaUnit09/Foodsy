"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { VoteType } from "@/api/voteApi";
import { useState, useEffect } from "react";

export interface Restaurant {
  id: number;
  providerId: string;
  name: string;
  category: string;
  address: string;
  likeCount: number;
  voteCount?: number; // For winner data from backend
  round1Votes?: number; // Votes from round 1
  round2Votes?: number; // Votes from round 2
  round: number;
  photos?: string[];
  priceLevel?: string | null;
  priceRange?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  currentOpeningHours?: string | null;
  generativeSummary?: string | null;
  reviewSummary?: string | null;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  hasVoted: boolean;
  canLike: boolean;
  sessionStarted: boolean;
  sessionComplete: boolean;
  roundTransitioning: boolean;
  remainingVotes: number;
  currentRound: number;
  likesPerUser: number;
  onVote: (type: VoteType) => void;
}

function formatHours(hours: string | null | undefined) {
  if (!hours) return null;
  try {
    const match = hours.match(/weekdayDescriptions=\[(.*?)\]/);
    if (match) {
      const days = match[1].split(',').map(s => s.trim());
      const jsDay = new Date().getDay();
      const googleDayIdx = jsDay === 0 ? 6 : jsDay - 1;
      return days[googleDayIdx] || days[0];
    }
  } catch {}
  return "See details";
}

function extractSummaryText(summary: string | null | undefined) {
  if (!summary) return null;
  const match = summary.match(/text=([^,{}}\]]+)/);
  return match ? match[1] : summary;
}

function formatPriceRange(priceRange: string | null | undefined) {
  if (!priceRange) return null;
  const startMatch = priceRange.match(/startPrice=\{currencyCode=USD, units=(\d+)\}/);
  const endMatch = priceRange.match(/endPrice=\{currencyCode=USD, units=(\d+)\}/);
  if (startMatch && endMatch) {
    return `$${startMatch[1]} - $${endMatch[1]}`;
  }
  return priceRange;
}

export function RestaurantCard({
  restaurant,
  hasVoted,
  canLike,
  sessionStarted,
  sessionComplete,
  roundTransitioning,
  remainingVotes,
  currentRound,
  likesPerUser,
  onVote,
}: RestaurantCardProps) {
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  useEffect(() => {
    setCurrentPhotoIdx(0);
  }, [restaurant.providerId]);

  const nextPhoto = () =>
    setCurrentPhotoIdx((p) => (p + 1) % (restaurant.photos?.length || 1));
  
  const prevPhoto = () =>
    setCurrentPhotoIdx(
      (p) => (p - 1 + (restaurant.photos?.length || 1)) % (restaurant.photos?.length || 1)
    );

  return (
    <Card className="shadow-2xl border-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Restaurant info + vote buttons */}
          <div className="p-8 bg-white flex flex-col">
            <div className="mb-6 p-6 rounded-lg shadow bg-white dark:bg-orange-600">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {restaurant.name}
              </h1>
              <div className="text-white-600 font-2xl text-bold mb-1">
                {restaurant.category}
              </div>
              <div className="text-white-600 dark:text-gray-300 mb-2">
                {restaurant.address}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200 mb-2">
                {restaurant.priceRange && (
                  <span>
                    <b>Price:</b> {formatPriceRange(restaurant.priceRange)}
                  </span>
                )}
                {restaurant.rating && (
                  <span>
                    <b>Rating:</b> {restaurant.rating} ★
                    {restaurant.userRatingCount && (
                      <span className="ml-1 text-gray-500">
                        ({restaurant.userRatingCount} reviews)
                      </span>
                    )}
                  </span>
                )}
                {restaurant.currentOpeningHours && (
                  <span className="text-white-600 font-large text-bold mb-1">
                    <b>Hours:</b> {formatHours(restaurant.currentOpeningHours)}
                  </span>
                )}
              </div>

              {restaurant.generativeSummary && (
                <div className="mt-2">
                  <b>Summary:</b>
                  <div className="text-gray-800 dark:text-gray-100">
                    {extractSummaryText(restaurant.generativeSummary)}
                  </div>
                </div>
              )}

              {restaurant.reviewSummary && (
                <div className="mt-2">
                  <b>Review Summary:</b>
                  <div className="text-gray-800 dark:text-gray-100">
                    {extractSummaryText(restaurant.reviewSummary)}
                  </div>
                </div>
              )}
            </div>

            {/* Vote buttons */}
            <div className="flex space-x-4 mt-auto">
              <Button
                onClick={() => onVote("dislike")}
                disabled={hasVoted || !sessionStarted || sessionComplete || roundTransitioning}
                variant="outline"
                size="lg"
                className="flex-1 h-14 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <ThumbsDown className="w-5 h-5 mr-2" />
                Pass
              </Button>
              <Button
                onClick={() => onVote("like")}
                disabled={!canLike || !sessionStarted || sessionComplete || roundTransitioning}
                size="lg"
                className="flex-1 h-14 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <ThumbsUp className="w-5 h-5 mr-2" />
                Like
              </Button>
            </div>

            {/* Vote status messages */}
            {hasVoted && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800 text-center font-medium">
                  Vote recorded!
                </p>
              </div>
            )}
            {!hasVoted && sessionStarted && !sessionComplete && !roundTransitioning && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-center font-medium">
                  {currentRound === 1 
                    ? `Votes remaining: ${remainingVotes}/${likesPerUser}`
                    : `Final vote remaining: ${remainingVotes}/1`
                  }
                </p>
                {remainingVotes === 0 && (
                  <p className="text-red-600 text-center text-sm mt-1">
                    You&apos;ve used all your votes for this round!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Photo gallery */}
          <div className="relative bg-gray-100">
            {restaurant.photos && restaurant.photos.length > 0 ? (
              <div className="aspect-square relative overflow-hidden">
                <Image
                  src={restaurant.photos[currentPhotoIdx] ?? "/placeholder.svg"}
                  alt={`${restaurant.name} photo ${currentPhotoIdx + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  unoptimized
                />

                {/* Photo navigation */}
                <div className="absolute inset-0 flex items-center justify-between p-4">
                  <Button
                    onClick={prevPhoto}
                    variant="outline"
                    size="icon"
                    className="bg-white/80 hover:bg-white border-0 shadow-lg"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    onClick={nextPhoto}
                    variant="outline"
                    size="icon"
                    className="bg-white/80 hover:bg-white border-0 shadow-lg"
                  >
                    <ChevronRight />
                  </Button>
                </div>

                {/* Photo counter */}
                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  {currentPhotoIdx + 1} / {restaurant.photos.length}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-gray-500">No photos</span>
              </div>
            )}

            {/* Thumbnails */}
            {restaurant.photos && restaurant.photos.length > 1 && (
              <div className="p-4 bg-white">
                <div className="grid grid-cols-6 gap-2">
                  {restaurant.photos.map((url, idx) => (
                    <button
                      key={url}
                      onClick={() => setCurrentPhotoIdx(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentPhotoIdx
                          ? "border-orange-500 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}