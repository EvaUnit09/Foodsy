"use client";

import { useState, useEffect } from "react";
import { Star, UtensilsCrossed } from "lucide-react";
import { DiscoveryRestaurant } from "@/api/discoveryApi";
import { LibraryApi } from "@/api/libraryApi";

interface FavoritesShelfProps {
  onStartDiscovery: () => void;
}

export function FavoritesShelf({ onStartDiscovery }: FavoritesShelfProps) {
  const [favorites, setFavorites] = useState<DiscoveryRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    LibraryApi.getFavorites()
      .then(setFavorites)
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  }, []);

  function handleRemove(id: string) {
    setFavorites((prev) => prev.filter((r) => r.id !== id));
    LibraryApi.removeFavorite(id).catch(() => {});
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h2
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            Your Favorites
          </h2>
          {!isLoading && (
            <span style={{ fontSize: 12, color: "#aaa" }}>
              {favorites.length} saved
            </span>
          )}
        </div>
        {favorites.length > 0 && (
          <a
            href="/favorites"
            style={{ fontSize: 13, color: "#1c1917", fontWeight: 600, textDecoration: "none" }}
          >
            See All
          </a>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingLeft: 32,
            paddingRight: 32,
            paddingBottom: 4,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && fetchError && (
        <p style={{ fontSize: 13, color: "#aaa", padding: "0 32px" }}>
          Couldn&apos;t load favorites right now.
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !fetchError && favorites.length === 0 && (
        <div
          style={{
            margin: "0 32px",
            border: "1.5px dashed #e0d8d2",
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "#888", marginBottom: 14 }}>
            Heart restaurants to build your list
          </p>
          <button
            onClick={onStartDiscovery}
            style={{
              background: "#1c1917",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#292524")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1c1917")}
          >
            Start Discovering
          </button>
        </div>
      )}

      {/* Favorites horizontal scroll */}
      {!isLoading && !fetchError && favorites.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingLeft: 32,
            paddingRight: 32,
            paddingBottom: 4,
          }}
        >
          {favorites.map((r) => (
            <FavoriteCard key={r.id} restaurant={r} onRemove={() => handleRemove(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  restaurant,
  onRemove,
}: {
  restaurant: DiscoveryRestaurant;
  onRemove: () => void;
}) {
  const photo = restaurant.photos?.[0];

  return (
    <div
      style={{
        flexShrink: 0,
        width: 200,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <a
        href={restaurant.websiteUri ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textDecoration: "none",
          cursor: restaurant.websiteUri ? "pointer" : "default",
        }}
      >
        <div style={{ position: "relative", height: 130, background: "#f5f5f5" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={restaurant.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f5f5f4",
              }}
            >
              <UtensilsCrossed style={{ width: 28, height: 28, color: "#a8a29e" }} />
            </div>
          )}
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "#1a1a1a",
              margin: 0,
              marginBottom: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {restaurant.name}
          </h3>
          <p
            style={{
              fontSize: 11,
              color: "#888",
              margin: 0,
              marginBottom: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {restaurant.category}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {restaurant.rating ? (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Star style={{ width: 12, height: 12, fill: "#f59e0b", color: "#f59e0b" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b" }}>
                  {restaurant.rating}
                </span>
              </div>
            ) : null}
            {restaurant.priceRange && (
              <span style={{ fontSize: 12, color: "#666" }}>{restaurant.priceRange}</span>
            )}
          </div>
        </div>
      </a>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${restaurant.name} from favorites`}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.55)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        flexShrink: 0,
        width: 200,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #f0f0f0",
      }}
      className="animate-pulse"
    >
      <div style={{ height: 130, background: "#e5e5e5" }} />
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ height: 13, background: "#e5e5e5", borderRadius: 4, marginBottom: 6, width: "80%" }} />
        <div style={{ height: 11, background: "#e5e5e5", borderRadius: 4, marginBottom: 8, width: "60%" }} />
        <div style={{ height: 11, background: "#e5e5e5", borderRadius: 4, width: "40%" }} />
      </div>
    </div>
  );
}
