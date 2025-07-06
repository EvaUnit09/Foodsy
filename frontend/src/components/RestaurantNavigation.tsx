"use client";

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
  return (
    <div className="flex justify-between">
      <Button
        onClick={onPrevious}
        disabled={currentRestaurantIdx === 0 || !sessionStarted || sessionComplete || roundTransitioning}
        variant="outline"
      >
        ← Prev Restaurant
      </Button>
      <Button
        onClick={onNext}
        disabled={currentRestaurantIdx === totalRestaurants - 1 || !sessionStarted || sessionComplete || roundTransitioning}
        variant="outline"
      >
        Next Restaurant →
      </Button>
    </div>
  );
}