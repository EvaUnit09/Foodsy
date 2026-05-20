"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, X, ChevronLeft, ChevronRight, Send, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/button";
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
  if (startMatch && endMatch) return `$${startMatch[1]} – $${endMatch[1]}`;
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
      <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
        </div>
        <h3 className="text-base font-semibold text-stone-900">Votes submitted</h3>
        <p className="text-sm text-stone-400 mt-1">Check back later to see the results.</p>
      </div>
    );
  }

  const deadlineDate = deadline ? new Date(deadline) : null;
  const isPastDeadline = deadlineDate ? new Date() > deadlineDate : false;

  if (isPastDeadline) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
        <p className="text-sm text-stone-500">The voting deadline has passed.</p>
      </div>
    );
  }

  if (!current) return null;

  const photos = current.photos ?? [];
  const isLiked = liked.has(current.providerId);

  return (
    <div className="space-y-4">
      {deadlineDate && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 rounded-xl border border-stone-100 text-sm text-stone-500">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>
            Vote by{" "}
            {deadlineDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} at{" "}
            {deadlineDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500">{currentIdx + 1} of {restaurants.length}</span>
        <span className="text-stone-700 font-medium tabular-nums">{liked.size} liked</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-6 flex flex-col gap-5">
            <div className="bg-stone-50 rounded-xl border border-stone-100 p-5 space-y-3">
              <div>
                <h1 className="text-xl font-semibold text-stone-900 leading-snug">{current.name}</h1>
                <p className="text-sm text-stone-500 mt-0.5">{current.category}</p>
                <p className="text-sm text-stone-400 mt-0.5">{current.address}</p>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                {current.priceRange && (
                  <span><span className="text-stone-400">Price</span> {formatPriceRange(current.priceRange)}</span>
                )}
                {current.rating && (
                  <span>
                    <span className="text-stone-400">Rating</span> {current.rating}
                    {current.userRatingCount && (
                      <span className="text-stone-400 ml-1">({current.userRatingCount})</span>
                    )}
                  </span>
                )}
                {current.currentOpeningHours && (
                  <span><span className="text-stone-400">Hours</span> {formatHours(current.currentOpeningHours)}</span>
                )}
              </div>

              {current.generativeSummary && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">About</p>
                  <p className="text-sm text-stone-600 leading-relaxed">{extractSummaryText(current.generativeSummary)}</p>
                </div>
              )}
              {current.reviewSummary && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Reviews</p>
                  <p className="text-sm text-stone-600 leading-relaxed">{extractSummaryText(current.reviewSummary)}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-auto">
              <Button
                onClick={goPrev}
                disabled={currentIdx === 0}
                variant="outline"
                size="icon"
                className="h-12 w-12 border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => { toggleLike(current.providerId); if (!isLiked) goNext(); }}
                size="lg"
                className="flex-1 h-12 bg-stone-900 hover:bg-stone-800 text-white"
              >
                <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-white" : ""}`} />
                {isLiked ? "Liked" : "Like"}
              </Button>
              <Button
                onClick={goNext}
                disabled={currentIdx === restaurants.length - 1}
                variant="outline"
                size="icon"
                className="h-12 w-12 border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={goNext}
              variant="outline"
              disabled={currentIdx === restaurants.length - 1}
              className="w-full border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
            >
              <X className="w-4 h-4 mr-2" />
              Pass
            </Button>
          </div>

          <div className="bg-stone-100">
            {photos.length > 0 ? (
              <>
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
                    <div className="absolute inset-0 flex items-center justify-between p-3">
                      <Button
                        onClick={() => setCurrentPhotoIdx((p) => (p - 1 + photos.length) % photos.length)}
                        variant="outline"
                        size="icon"
                        className="bg-white/80 hover:bg-white border-0 shadow-sm w-8 h-8"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setCurrentPhotoIdx((p) => (p + 1) % photos.length)}
                        variant="outline"
                        size="icon"
                        className="bg-white/80 hover:bg-white border-0 shadow-sm w-8 h-8"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2.5 py-0.5 rounded-full text-xs tabular-nums">
                    {currentPhotoIdx + 1} / {photos.length}
                  </div>
                </div>

                {photos.length > 1 && (
                  <div className="p-3 bg-white">
                    <div className="grid grid-cols-6 gap-1.5">
                      {photos.map((url, idx) => (
                        <button
                          key={url}
                          onClick={() => setCurrentPhotoIdx(idx)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentPhotoIdx ? "border-stone-900" : "border-transparent hover:border-stone-300"
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

      {restaurants.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {restaurants.map((r, idx) => (
            <button
              key={r.providerId}
              onClick={() => goTo(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIdx
                  ? "bg-stone-900 w-4"
                  : liked.has(r.providerId)
                  ? "bg-stone-400 w-1.5"
                  : "bg-stone-200 w-1.5"
              }`}
            />
          ))}
        </div>
      )}

      {submitError && (
        <div className="bg-white rounded-xl px-4 py-3 border border-stone-200 text-sm text-stone-700 text-center">
          {submitError}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={liked.size === 0 || submitting}
        className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-40"
      >
        <Send className="w-4 h-4 mr-2" />
        {submitting ? "Submitting…" : `Submit votes (${liked.size} liked)`}
      </Button>
    </div>
  );
}
