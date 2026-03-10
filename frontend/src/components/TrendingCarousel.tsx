"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface TrendingRestaurant {
  id: string;
  name: string;
  category: string;
  rating: number;
  priceLevel: number | null;
  priceRange: string | null;
  photos: string[];
  generativeSummary: string | null;
  userRatingCount: number;
}

type Borough = "manhattan" | "queens" | "brooklyn";

const BOROUGHS: { key: Borough; label: string }[] = [
  { key: "manhattan", label: "Manhattan" },
  { key: "queens", label: "Queens" },
  { key: "brooklyn", label: "Brooklyn" },
];

interface TrendingCarouselProps {
  onSignUpPrompt: () => void;
}

export function TrendingCarousel({ onSignUpPrompt }: TrendingCarouselProps) {
  const [activeBorough, setActiveBorough] = useState<Borough>("manhattan");
  const [data, setData] = useState<Partial<Record<Borough, TrendingRestaurant[]>>>({});
  const fetchedRef = useRef(new Set<Borough>());

  useEffect(() => {
    if (fetchedRef.current.has(activeBorough)) return;
    fetchedRef.current.add(activeBorough);

    let cancelled = false;

    fetch(`/api/restaurants/trending?borough=${activeBorough}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((result: TrendingRestaurant[]) => {
        if (!cancelled) setData((prev) => ({ ...prev, [activeBorough]: result }));
      })
      .catch(() => {
        if (!cancelled) setData((prev) => ({ ...prev, [activeBorough]: [] }));
        fetchedRef.current.delete(activeBorough);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBorough]);

  const restaurants = data[activeBorough];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Trending Near You</h2>
          <p className="text-gray-500 text-sm">Top spots in NYC right now</p>
        </div>

        {/* Borough tab strip */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6">
            {BOROUGHS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveBorough(key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeBorough === key
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Carousel */}
        {!restaurants ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <p className="text-gray-400 text-sm py-8">No trending restaurants available yet.</p>
        ) : (
          <Carousel
            key={activeBorough}
            opts={{ align: "start", dragFree: true }}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {restaurants.map((r) => (
                <CarouselItem key={r.id} className="pl-3 basis-56">
                  <TrendingCard restaurant={r} onFavorite={onSignUpPrompt} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </Carousel>
        )}
      </div>
    </section>
  );
}

function TrendingCard({
  restaurant,
  onFavorite,
}: {
  restaurant: TrendingRestaurant;
  onFavorite: () => void;
}) {
  const photo = restaurant.photos?.[0];

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow bg-white h-full">
      <div className="relative h-36 bg-gray-100 overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
            <span className="text-3xl">🍽</span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
          aria-label="Save to favorites"
        >
          <Heart className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 leading-tight line-clamp-1 mb-0.5">
          {restaurant.name}
        </h3>
        <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">{restaurant.category}</p>
        <div className="flex items-center justify-between">
          {restaurant.rating ? (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs font-medium text-gray-700">{restaurant.rating}</span>
            </div>
          ) : null}
          {restaurant.priceRange && (
            <span className="text-xs text-gray-400">{restaurant.priceRange}</span>
          )}
        </div>
        {restaurant.generativeSummary && (
          <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
            {restaurant.generativeSummary}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-56 rounded-lg overflow-hidden border border-gray-100 animate-pulse">
      <div className="h-36 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-200 rounded w-3/5" />
        <div className="h-3 bg-gray-200 rounded w-2/5" />
      </div>
    </div>
  );
}
