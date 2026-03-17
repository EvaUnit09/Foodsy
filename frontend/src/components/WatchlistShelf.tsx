"use client";

import { useState, useEffect } from "react";
import { DiscoveryRestaurant } from "@/api/discoveryApi";
import { LibraryApi } from "@/api/libraryApi";

interface WatchlistShelfProps {
  onStartDiscovery: () => void;
}

export function WatchlistShelf({ onStartDiscovery }: WatchlistShelfProps) {
  const [watchlist, setWatchlist] = useState<DiscoveryRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    LibraryApi.getWatchlist()
      .then(setWatchlist)
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  }, []);

  function handleRemove(id: string) {
    setWatchlist((prev) => prev.filter((r) => r.id !== id));
    LibraryApi.removeFromWatchlist(id).catch(() => {});
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
            Want to Try
          </h2>
          {!isLoading && (
            <span style={{ fontSize: 12, color: "#aaa" }}>
              {watchlist.length} saved
            </span>
          )}
        </div>
        {watchlist.length > 0 && (
          <a
            href="/watchlist"
            style={{ fontSize: 13, color: "#e8531a", fontWeight: 600, textDecoration: "none" }}
          >
            See All
          </a>
        )}
      </div>

      {!isLoading && fetchError && (
        <p style={{ fontSize: 13, color: "#aaa", padding: "0 32px" }}>
          Couldn&apos;t load your list right now.
        </p>
      )}

      {!isLoading && !fetchError && watchlist.length === 0 && (
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
            Bookmark restaurants you&apos;re curious about
          </p>
          <button
            onClick={onStartDiscovery}
            style={{
              background: "#e8531a",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#c94010")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#e8531a")}
          >
            Start Discovering
          </button>
        </div>
      )}

      {!isLoading && !fetchError && watchlist.length > 0 && (
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
          {watchlist.map((r) => (
            <WatchlistCard key={r.id} restaurant={r} onRemove={() => handleRemove(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
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
                background: "#f5f0ff",
              }}
            >
              <span style={{ fontSize: 32 }}>🔖</span>
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
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {restaurant.category}
          </p>
        </div>
      </a>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${restaurant.name} from watchlist`}
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
