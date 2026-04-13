"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, X, ChevronLeft, ChevronRight, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { ApiClient } from "@/api/client";

interface OfflineRestaurant {
  id: number;
  providerId: string;
  name: string;
  category: string;
  address: string;
  rating?: number;
  priceLevel?: string;
  priceRange?: string;
  userRatingCount?: number;
  currentOpeningHours?: string;
  generativeSummary?: string;
  reviewSummary?: string;
  photos?: string[];
}

interface OfflineVotingPanelProps {
  sessionId: string;
  restaurants: OfflineRestaurant[];
  hasSubmitted: boolean;
  onSubmitted: () => void;
  deadline?: string;
}

function formatHours(hours: string | null | undefined) {
  if (!hours) return null;
  try {
    const match = hours.match(/weekdayDescriptions=\[(.*?)\]/);
    if (match) {
      const days = match[1].split(",").map((s) => s.trim());
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
  if (startMatch && endMatch) return `$${startMatch[1]} - $${endMatch[1]}`;
  return priceRange;
}

export function OfflineVotingPanel({
  sessionId,
  restaurants,
  hasSubmitted,
  onSubmitted,
  deadline,
}: OfflineVotingPanelProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const current = restaurants[currentIdx];

  const goTo = (idx: number) => {
    setCurrentIdx(idx);
    setCurrentPhotoIdx(0);
  };
  const goNext = () => { if (currentIdx < restaurants.length - 1) goTo(currentIdx + 1); };
  const goPrev = () => { if (currentIdx > 0) goTo(currentIdx - 1); };

  const toggleLike = (providerId: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (liked.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await ApiClient.sessions.submitOfflineVotes(sessionId, Array.from(liked));
      onSubmitted();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit votes");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center">
        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-green-800">Votes Submitted!</h3>
        <p className="text-sm text-green-600 mt-1">Check back later to see the results.</p>
      </div>
    );
  }

  const deadlineDate = deadline ? new Date(deadline) : null;
  const isPastDeadline = deadlineDate ? new Date() > deadlineDate : false;

  if (isPastDeadline) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 text-center">
        <p className="text-gray-600">The voting deadline has passed.</p>
      </div>
    );
  }

  if (!current) return null;

  const photos = current.photos ?? [];
  const isLiked = liked.has(current.providerId);

  return (
    <div className="space-y-4">
      {/* Deadline banner */}
      {deadlineDate && (
        <div className="bg-orange-50 rounded-lg px-4 py-2 text-sm text-orange-700 text-center">
          Vote by:{" "}
          {deadlineDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} at{" "}
          {deadlineDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{currentIdx + 1} of {restaurants.length} restaurants</span>
        <span className="text-red-500 font-medium">
          {liked.size} liked
        </span>
      </div>

      {/* Dating-profile card */}
      <Card className="shadow-2xl border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Info + action buttons */}
            <div className="p-8 bg-white flex flex-col">
              <div className="mb-6 p-6 rounded-lg shadow bg-white dark:bg-orange-600">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {current.name}
                </h1>
                <div className="text-gray-600 font-medium mb-1">{current.category}</div>
                <div className="text-gray-500 mb-2">{current.address}</div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-2">
                  {current.priceRange && (
                    <span><b>Price:</b> {formatPriceRange(current.priceRange)}</span>
                  )}
                  {current.rating && (
                    <span>
                      <b>Rating:</b> {current.rating} ★
                      {current.userRatingCount && (
                        <span className="ml-1 text-gray-500">({current.userRatingCount} reviews)</span>
                      )}
                    </span>
                  )}
                  {current.currentOpeningHours && (
                    <span><b>Hours:</b> {formatHours(current.currentOpeningHours)}</span>
                  )}
                </div>

                {current.generativeSummary && (
                  <div className="mt-2">
                    <b>Summary:</b>
                    <div className="text-gray-800">{extractSummaryText(current.generativeSummary)}</div>
                  </div>
                )}
                {current.reviewSummary && (
                  <div className="mt-2">
                    <b>Review Summary:</b>
                    <div className="text-gray-800">{extractSummaryText(current.reviewSummary)}</div>
                  </div>
                )}
              </div>

              {/* Pass / Heart buttons */}
              <div className="flex space-x-4 mt-auto">
                <Button
                  onClick={goNext}
                  disabled={currentIdx === restaurants.length - 1}
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                >
                  <X className="w-5 h-5 mr-2" />
                  Pass
                </Button>
                <Button
                  onClick={() => { toggleLike(current.providerId); if (!isLiked) goNext(); }}
                  size="lg"
                  className={`flex-1 h-14 transition-all ${
                    isLiked
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${isLiked ? "fill-white" : ""}`} />
                  {isLiked ? "Liked!" : "Like"}
                </Button>
              </div>
            </div>

            {/* Photo gallery */}
            <div className="relative bg-gray-100">
              {photos.length > 0 ? (
                <div className="aspect-square relative overflow-hidden">
                  <Image
                    src={photos[currentPhotoIdx] ?? "/placeholder.svg"}
                    alt={`${current.name} photo ${currentPhotoIdx + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    unoptimized
                  />
                  {photos.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between p-4">
                      <Button
                        onClick={() => setCurrentPhotoIdx((p) => (p - 1 + photos.length) % photos.length)}
                        variant="outline"
                        size="icon"
                        className="bg-white/80 hover:bg-white border-0 shadow-lg"
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        onClick={() => setCurrentPhotoIdx((p) => (p + 1) % photos.length)}
                        variant="outline"
                        size="icon"
                        className="bg-white/80 hover:bg-white border-0 shadow-lg"
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                    {currentPhotoIdx + 1} / {photos.length}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <span className="text-gray-400">No photos</span>
                </div>
              )}

              {photos.length > 1 && (
                <div className="p-4 bg-white">
                  <div className="grid grid-cols-6 gap-2">
                    {photos.map((url, idx) => (
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

      {/* Card navigation dots */}
      {restaurants.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {restaurants.map((r, idx) => (
            <button
              key={r.providerId}
              onClick={() => goTo(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIdx
                  ? "bg-orange-500 w-4"
                  : liked.has(r.providerId)
                  ? "bg-red-400"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-200 text-sm text-red-700 text-center">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={liked.size === 0 || submitting}
        className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
      >
        <Send className="w-4 h-4 mr-2" />
        {submitting ? "Submitting..." : `Submit My Votes (${liked.size} liked)`}
      </Button>
    </div>
  );
}
