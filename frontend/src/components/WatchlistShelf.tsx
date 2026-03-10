"use client";

import { RestaurantSummaryDto } from "@/api/homepageApi";

interface WatchlistShelfProps {
  watchlist: RestaurantSummaryDto[];
  onStartDiscovery: () => void;
}

export function WatchlistShelf({ watchlist, onStartDiscovery }: WatchlistShelfProps) {
  return (
    <div style={{ margin: "0 32px 24px" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
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
          <span style={{ fontSize: 12, color: "#aaa" }}>
            {watchlist.length} saved
          </span>
        </div>
      </div>

      {/* Always empty state for now (no API) */}
      {watchlist.length === 0 && (
        <div
          style={{
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

      {/* Watchlist horizontal scroll (future use) */}
      {watchlist.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 4,
          }}
        >
          {watchlist.map((r) => (
            <WatchlistCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({ restaurant }: { restaurant: RestaurantSummaryDto }) {
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
      }}
    >
      <div style={{ position: "relative", height: 130, background: "#f5f5f5" }}>
        {photo ? (
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
    </div>
  );
}
