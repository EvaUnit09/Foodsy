"use client";

import { Button } from "@/components/button";
import { Restaurant } from "./RestaurantCard";
import { Trophy, MapPin, Star, Clock, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

interface FinalResultsScreenProps {
  winner: Restaurant;
  sessionId: number;
}

export function FinalResultsScreen({ winner, sessionId }: FinalResultsScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-stone-50 p-4">
      <div className="max-w-2xl mx-auto pt-10 space-y-4">
        {/* Winner announcement */}
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mb-1">{winner.name}</h1>
          {winner.address && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-stone-500 mt-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{winner.address}</span>
            </div>
          )}
          <div className="mt-4 inline-block px-4 py-1.5 bg-stone-50 border border-stone-100 rounded-full">
            <span className="text-sm font-medium text-stone-700">
              {winner.voteCount ?? winner.likeCount ?? 0} vote{(winner.voteCount ?? winner.likeCount ?? 0) !== 1 ? "s" : ""}
            </span>
            {winner.round1Votes !== undefined && winner.round2Votes !== undefined && (
              <span className="text-xs text-stone-400 ml-2">
                (R1: {winner.round1Votes} + R2: {winner.round2Votes})
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        {(winner.category || winner.rating || winner.priceRange || winner.currentOpeningHours) && (
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {winner.category && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <span className="w-2 h-2 rounded-full bg-stone-300 shrink-0" />
                <span className="text-sm text-stone-600">
                  <span className="font-medium text-stone-900">Cuisine</span> — {winner.category}
                </span>
              </div>
            )}
            {winner.rating && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Star className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="text-sm text-stone-600">
                  <span className="font-medium text-stone-900">{winner.rating}</span> / 5
                  {(winner.userRatingCount ?? 0) > 0 && (
                    <span className="text-stone-400 ml-1">({winner.userRatingCount} reviews)</span>
                  )}
                </span>
              </div>
            )}
            {winner.priceRange && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <DollarSign className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="text-sm text-stone-600">
                  <span className="font-medium text-stone-900">Price</span> — {winner.priceRange}
                </span>
              </div>
            )}
            {winner.currentOpeningHours && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="text-sm text-stone-600">
                  <span className="font-medium text-stone-900">Hours</span> — {winner.currentOpeningHours}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Summaries */}
        {(winner.generativeSummary || winner.reviewSummary) && (
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {winner.generativeSummary && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">About</p>
                <p className="text-sm text-stone-600 leading-relaxed">{winner.generativeSummary}</p>
              </div>
            )}
            {winner.reviewSummary && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Reviews</p>
                <p className="text-sm text-stone-600 leading-relaxed">{winner.reviewSummary}</p>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <div className="space-y-2 pb-8">
          <Button
            onClick={() => router.push("/")}
            className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-medium"
          >
            Exit Session
          </Button>
          <p className="text-center text-xs text-stone-400">Session #{sessionId} completed</p>
        </div>
      </div>
    </div>
  );
}
