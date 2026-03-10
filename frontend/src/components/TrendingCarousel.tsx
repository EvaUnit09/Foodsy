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
    <section className="py-12 px-8" style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="mb-4">
        <h2
          className="font-bold text-[#1a1a1a] mb-1"
          style={{ fontFamily: "'Georgia', serif", fontSize: 22 }}
        >
          Trending Near You
        </h2>
        <p className="text-[#888888]" style={{ fontSize: 13 }}>Top spots in NYC right now</p>
      </div>

      {/* Borough tab strip */}
      <div className="mb-5" style={{ borderBottom: "1px solid #e5e5e5" }}>
        <nav className="-mb-px flex">
          {BOROUGHS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveBorough(key)}
              style={{
                background: "none",
                border: "none",
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: activeBorough === key ? 600 : 400,
                color: activeBorough === key ? "#e8531a" : "#666",
                borderBottom: activeBorough === key ? "2px solid #e8531a" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
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
    <div
      className="overflow-hidden bg-white h-full"
      style={{
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
      }}
    >
      <div className="relative bg-gray-100 overflow-hidden" style={{ height: 130 }}>
        {photo ? (
          <img
            src={photo}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#fff3ee]">
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
      <div style={{ padding: "10px 12px 12px" }}>
        <h3
          className="leading-tight line-clamp-1 mb-0.5"
          style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {restaurant.name}
        </h3>
        <p className="line-clamp-1 mb-1.5" style={{ fontSize: 11, color: "#888888" }}>{restaurant.category}</p>
        <div className="flex items-center justify-between">
          {restaurant.rating ? (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" style={{ color: "#f59e0b" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b" }}>{restaurant.rating}</span>
            </div>
          ) : null}
          {restaurant.priceRange && (
            <span style={{ fontSize: 12, color: "#666666" }}>{restaurant.priceRange}</span>
          )}
        </div>
        {restaurant.generativeSummary && (
          <p className="mt-1.5 line-clamp-2 leading-relaxed" style={{ fontSize: 11, color: "#888888" }}>
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
