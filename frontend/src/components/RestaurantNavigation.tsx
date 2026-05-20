"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/button";

interface RestaurantNavigationProps {
  currentRestaurantIdx: number;
  totalRestaurants: number;
  sessionStarted: boolean;
  sessionComplete: boolean;
  roundTransitioning: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function RestaurantNavigation({
  currentRestaurantIdx,
  totalRestaurants,
  sessionStarted,
  sessionComplete,
  roundTransitioning,
  onPrevious,
  onNext,
}: RestaurantNavigationProps) {
  const canPrev = currentRestaurantIdx > 0 && sessionStarted && !sessionComplete && !roundTransitioning;
  const canNext = currentRestaurantIdx < totalRestaurants - 1 && sessionStarted && !sessionComplete && !roundTransitioning;

  return (
    <div className="flex items-center justify-between">
      <Button
        onClick={onPrevious}
        disabled={!canPrev}
        variant="outline"
        className="flex items-center gap-2 border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-30 rounded-xl"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Previous</span>
      </Button>

      <span className="text-xs text-stone-400 tabular-nums">
        {currentRestaurantIdx + 1} / {totalRestaurants}
      </span>

      <Button
        onClick={onNext}
        disabled={!canNext}
        variant="outline"
        className="flex items-center gap-2 border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-30 rounded-xl"
      >
        <span className="text-sm">Next</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
