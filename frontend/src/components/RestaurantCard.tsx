"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/button";
import { VoteType } from "@/api/voteApi";
import { useState, useEffect } from "react";

export interface Restaurant {
  id: number;
  providerId: string;
  name: string;
  category: string;
  address: string;
  likeCount: number;
  voteCount?: number;
  round1Votes?: number;
  round2Votes?: number;
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
    return `$${startMatch[1]} – $${endMatch[1]}`;
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

  const votingDisabled = !sessionStarted || sessionComplete || roundTransitioning;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Info + vote buttons */}
        <div className="p-6 flex flex-col gap-5">
          <div className="bg-stone-50 rounded-xl border border-stone-100 p-5 space-y-3">
            <div>
              <h1 className="text-xl font-semibold text-stone-900 leading-snug">{restaurant.name}</h1>
              <p className="text-sm text-stone-500 mt-0.5">{restaurant.category}</p>
              <p className="text-sm text-stone-400 mt-0.5">{restaurant.address}</p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
              {restaurant.priceRange && (
                <span><span className="text-stone-400">Price</span> {formatPriceRange(restaurant.priceRange)}</span>
              )}
              {restaurant.rating && (
                <span>
                  <span className="text-stone-400">Rating</span> {restaurant.rating}
                  {restaurant.userRatingCount && (
                    <span className="text-stone-400 ml-1">({restaurant.userRatingCount})</span>
                  )}
                </span>
              )}
              {restaurant.currentOpeningHours && (
                <span><span className="text-stone-400">Hours</span> {formatHours(restaurant.currentOpeningHours)}</span>
              )}
            </div>

            {restaurant.generativeSummary && (
              <div className="pt-2 border-t border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">About</p>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {extractSummaryText(restaurant.generativeSummary)}
                </p>
              </div>
            )}

            {restaurant.reviewSummary && (
              <div className="pt-2 border-t border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Reviews</p>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {extractSummaryText(restaurant.reviewSummary)}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-auto">
            <Button
              onClick={() => onVote("dislike")}
              disabled={hasVoted || votingDisabled}
              variant="outline"
              size="lg"
              className="flex-1 h-12 border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-30"
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Pass
            </Button>
            <Button
              onClick={() => onVote("like")}
              disabled={!canLike || votingDisabled}
              size="lg"
              className="flex-1 h-12 bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-30"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Like
            </Button>
          </div>

          {hasVoted && (
            <div className="px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
              <p className="text-sm font-medium text-stone-600">Vote recorded</p>
            </div>
          )}
          {!hasVoted && sessionStarted && !sessionComplete && !roundTransitioning && (
            <div className="px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
              <p className="text-sm text-stone-500">
                {currentRound === 1
                  ? `${remainingVotes} of ${likesPerUser} votes remaining`
                  : `${remainingVotes} final vote remaining`}
              </p>
              {remainingVotes === 0 && (
                <p className="text-xs text-stone-400 mt-0.5">All votes used for this round</p>
              )}
            </div>
          )}
        </div>

        {/* Photo gallery */}
        <div className="bg-stone-100">
          {restaurant.photos && restaurant.photos.length > 0 ? (
            <>
              <div className="aspect-square relative overflow-hidden">
                <Image
                  src={restaurant.photos[currentPhotoIdx] ?? "/placeholder.svg"}
                  alt={`${restaurant.name} photo ${currentPhotoIdx + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-between p-3">
                  <Button
                    onClick={prevPhoto}
                    variant="outline"
                    size="icon"
                    className="bg-white/80 hover:bg-white border-0 shadow-sm w-8 h-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={nextPhoto}
                    variant="outline"
                    size="icon"
                    className="bg-white/80 hover:bg-white border-0 shadow-sm w-8 h-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2.5 py-0.5 rounded-full text-xs tabular-nums">
                  {currentPhotoIdx + 1} / {restaurant.photos.length}
                </div>
              </div>

              {restaurant.photos.length > 1 && (
                <div className="p-3 bg-white">
                  <div className="grid grid-cols-6 gap-1.5">
                    {restaurant.photos.map((url, idx) => (
                      <button
                        key={url}
                        onClick={() => setCurrentPhotoIdx(idx)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentPhotoIdx
                            ? "border-stone-900"
                            : "border-transparent hover:border-stone-300"
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
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <span className="text-sm text-stone-400">No photos</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
