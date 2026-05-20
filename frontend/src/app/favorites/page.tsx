"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { DiscoveryRestaurant } from "@/api/discoveryApi";
import { LibraryApi } from "@/api/libraryApi";

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [favorites, setFavorites] = useState<DiscoveryRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    LibraryApi.getFavorites()
      .then(setFavorites)
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  function handleRemove(id: string) {
    setFavorites((prev) => prev.filter((r) => r.id !== id));
    LibraryApi.removeFavorite(id).catch(() => {});
  }

  if (authLoading || (!isAuthenticated && !authLoading)) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf9" }}>
      <AppHeader badge="Favorites" />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
        {/* Back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              color: "#555",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            Your Favorites
          </h1>
          {!isLoading && (
            <span style={{ fontSize: 13, color: "#aaa", marginLeft: 4 }}>
              {favorites.length} saved
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && fetchError && (
          <p style={{ fontSize: 14, color: "#aaa", textAlign: "center", paddingTop: 60 }}>
            Couldn&apos;t load favorites right now.
          </p>
        )}

        {/* Empty */}
        {!isLoading && !fetchError && favorites.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <p style={{ fontSize: 15, color: "#888", marginBottom: 20 }}>
              No favorites yet — heart restaurants while discovering to save them here.
            </p>
            <button
              onClick={() => router.push("/discover")}
              style={{
                background: "#1c1917",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                borderRadius: 10,
                padding: "11px 24px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#292524")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1c1917")}
            >
              Start Discovering
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !fetchError && favorites.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            {favorites.map((r) => (
              <FavoriteCard key={r.id} restaurant={r} onRemove={() => handleRemove(r.id)} />
            ))}
          </div>
        )}
      </div>
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
              <UtensilsCrossed style={{ width: 32, height: 32, color: "#a8a29e" }} />
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
        onClick={onRemove}
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
      style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #f0f0f0" }}
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
