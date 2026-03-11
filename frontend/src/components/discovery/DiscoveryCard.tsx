"use client";

import { useEffect, useState } from "react";
import { DiscoveryRestaurant, SwipeAction } from "@/api/discoveryApi";

interface DiscoveryCardProps {
  restaurant: DiscoveryRestaurant;
  exitAction: SwipeAction | null;
  isGhost?: boolean;
  ghostDepth?: 1 | 2;
}

const EXIT_TRANSFORMS: Record<SwipeAction, string> = {
  pass: "translateX(-120%) rotate(-8deg)",
  favorite: "translateX(120%) rotate(8deg)",
  watchlist: "translateY(-120%) scale(0.9)",
};

const ACTION_COLORS: Record<SwipeAction, string> = {
  pass: "#6b7280",
  favorite: "#e8531a",
  watchlist: "#3b82f6",
};

const ACTION_LABELS: Record<SwipeAction, string> = {
  pass: "✕ Passed",
  favorite: "❤️ Favorited!",
  watchlist: "🔖 Saved!",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ color: "#f59e0b", fontSize: 13 }}>★</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

/**
 * Render a swipe-style discovery card for a restaurant with optional ghost styling and a photo carousel.
 *
 * @param restaurant - The restaurant data used to populate the card (name, photos, category, rating, priceRange, vibeTags, generativeSummary, etc.).
 * @param exitAction - Optional swipe action that triggers an exit overlay and exit transform (e.g., pass, favorite, watchlist).
 * @param isGhost - When true, render the card in a subdued "ghost" state used for stacked background cards.
 * @param ghostDepth - When `isGhost` is true, controls visual depth (1 or 2) to adjust scale, translation, and opacity.
 * @returns A React element representing the discovery card for the provided restaurant.
 */
export function DiscoveryCard({
  restaurant,
  exitAction,
  isGhost = false,
  ghostDepth,
}: DiscoveryCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  // Reset photo carousel when card changes
  useEffect(() => {
    setPhotoIndex(0);
  }, [restaurant.id]);

  const photos = restaurant.photos?.length ? restaurant.photos : [];
  const hasPhotos = photos.length > 0;

  // Ghost card transform
  let ghostTransform = "";
  let ghostOpacity = 1;
  let zIndex = 2;

  if (isGhost) {
    if (ghostDepth === 1) {
      ghostTransform = "scale(0.97) translateY(8px)";
      ghostOpacity = 0.85;
      zIndex = 1;
    } else {
      ghostTransform = "scale(0.94) translateY(16px)";
      ghostOpacity = 0.6;
      zIndex = 0;
    }
  }

  // Active card exit transform
  const activeTransform =
    !isGhost && exitAction ? EXIT_TRANSFORMS[exitAction] : "none";

  const cardStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 20,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    zIndex,
    opacity: isGhost ? ghostOpacity : 1,
    transform: isGhost ? ghostTransform : activeTransform,
    transition: isGhost
      ? "none"
      : "transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.32s ease",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={cardStyle}>
      {/* ── Photo area (top 60%) ── */}
      <div
        style={{
          position: "relative",
          height: "60%",
          overflow: "hidden",
          background: "#f0ece8",
          flexShrink: 0,
        }}
      >
        {/* Photo strip */}
        {hasPhotos && (
          <div
            style={{
              display: "flex",
              width: `${photos.length * 100}%`,
              height: "100%",
              transform: `translateX(-${(photoIndex / photos.length) * 100}%)`,
              transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={restaurant.name}
                style={{
                  width: `${100 / photos.length}%`,
                  height: "100%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}

        {!hasPhotos && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f5ede8",
            }}
          >
            <span style={{ fontSize: 48 }}>🍽</span>
          </div>
        )}

        {/* Segment bars */}
        {hasPhotos && photos.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              right: 10,
              display: "flex",
              gap: 4,
              zIndex: 2,
            }}
          >
            {photos.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 1,
                  background:
                    i <= photoIndex
                      ? "rgba(255,255,255,1)"
                      : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        )}

        {/* Bottom gradient */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "45%",
            background:
              "linear-gradient(transparent, rgba(20,12,8,0.75))",
            zIndex: 1,
          }}
        />

        {/* Dot indicators */}
        {hasPhotos && photos.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              gap: 5,
              zIndex: 2,
            }}
          >
            {photos.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === photoIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === photoIndex
                      ? "rgba(255,255,255,1)"
                      : "rgba(255,255,255,0.5)",
                  transition: "width 0.2s ease",
                }}
              />
            ))}
          </div>
        )}

        {/* Tap zones — only on active card */}
        {!isGhost && hasPhotos && photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIndex((p) => Math.max(0, p - 1))}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "40%",
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                zIndex: 3,
              }}
              aria-label="Previous photo"
            />
            <button
              onClick={() =>
                setPhotoIndex((p) => Math.min(photos.length - 1, p + 1))
              }
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: "40%",
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                zIndex: 3,
              }}
              aria-label="Next photo"
            />
          </>
        )}

        {/* Action feedback overlay */}
        {!isGhost && exitAction && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: `${ACTION_COLORS[exitAction]}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: ACTION_COLORS[exitAction],
                color: "#fff",
                fontSize: 18,
                fontWeight: 800,
                borderRadius: 16,
                padding: "12px 24px",
              }}
            >
              {ACTION_LABELS[exitAction]}
            </div>
          </div>
        )}
      </div>

      {/* ── Info panel (bottom 40%) ── */}
      <div
        style={{
          padding: 20,
          background: "#fff",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 22,
            fontWeight: 800,
            color: "#1a1a1a",
            lineHeight: 1.2,
          }}
        >
          {restaurant.name}
        </div>

        <div style={{ fontSize: 13, color: "#888" }}>{restaurant.category}</div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          {restaurant.rating != null ? (
            <StarRating rating={restaurant.rating} />
          ) : (
            <span style={{ fontSize: 12, color: "#bbb" }}>No rating</span>
          )}
          {restaurant.priceRange && (
            <span style={{ fontSize: 12, color: "#888" }}>
              {restaurant.priceRange}
            </span>
          )}
        </div>

        {restaurant.vibeTags && restaurant.vibeTags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              marginTop: 6,
            }}
          >
            {restaurant.vibeTags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  background: "#f5ede8",
                  color: "#e8531a",
                  borderRadius: 20,
                  padding: "3px 8px",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {restaurant.generativeSummary && (
          <p
            style={{
              fontSize: 13,
              color: "#666",
              lineHeight: 1.6,
              margin: 0,
              marginTop: 6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {restaurant.generativeSummary}
          </p>
        )}
      </div>
    </div>
  );
}
