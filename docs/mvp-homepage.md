### Big picture: what your **MVP homepage** should really do

Below is a concrete, quota-friendly **homepage blueprint** that folds in your answers and the “spark-plug” ideas, plus a quick napkin-math budget so you can see how comfortably you sit inside the new March-2025 Places caps.

* * *

## 0 . First-time flow (new users)

| Step | UI element | Calls triggered | Notes |
| --- | --- | --- | --- |
| **1\. Taste Profile strip** | Three swipe cards (“Pick 3 cuisines”, “$$ range”, “Max travel time”) | **1 × Nearby Search Pro** (batched with `fields=place_id,name,rating,photos`) | Store prefs client-side + `user_profile` table. |
| **2\. Data hydrate** | Grid of 6 suggestions (“Just for you”) | *0 calls* – items come from the response above, cached in Redis/DB for 30 days. |     |
| **3\. Call-to-action** | “Start first session” hero | *0 calls* |     |

> Result: the very first page view costs **one** paid request.

* * *

## 1 . Homepage sections (grid layout)

| Row / Card | What shows | Source & caching |
| --- | --- | --- |
| **Hero actions** (full-width) | ▸ Start session ▸ Join code ▸ View favorites | No API. |
| **Your Picks** (6-item grid) | Output of Taste Profile + any favorites | Uses cached Nearby results; refresh midnight via Celery. |
| **Neighborhood Highlights** (8-item grid, scrollable) | Top-rated spots within 1 km of browser geo or selected neighborhood | Nightly job: `places.searchNearby` per neighborhood; store 24 h. |
| **Trending Now in NYC** (4-item grid) | Most-voted restaurants city-wide this week | Derived from your own `votes` table; no Places call. |
| **Spotlight Carousel** (auto-rotate 4 cards) | One high-quality photo + short blurb | Same cache as Highlights; carousel just cycles client-side. |
| **Skeleton fallback** | Gray cards shimmer while fetch in flight | Rendered automatically if `/api/home` is slow; still zero extra calls. |

All grids share **one card component**, fed by different data arrays. Keep it lean.

* * *

## 2 . API budget with 100 daily users

| SKU (New pricing) | Free cap / month | Est. monthly calls | Headroom |
| --- | --- | --- | --- |
| **Nearby Search Pro** | 5 000 free | Taste onboarding ≈ 3 000 | ✅ below cap |
| **Place Details Essentials** (when a user clicks a card) | 10 000 free | Assume 20% of 100 users click 3 cards/day → 1 800 | ✅ below cap |
| **Autocomplete Requests** (Explore search bar) | 10 000 free | Debounced to 1 req/sec max; 100 users × 5 searches ≈ 1 500 | ✅ below cap |

Pricing table reference – July 2025 list: free caps of 10 000 for most Essentials SKUs and 5 000 for Nearby Search Pro([developers.google.com](https://developers.google.com/maps/billing-and-pricing/pricing "Google Maps Platform core services pricing list  |  Google for Developers")).

> Even after onboarding **every single day**, you’re still at ~60 % of the free tier.

* * *

## 3 . Caching & rate-limit tricks

1.  **Server cache (Redis or Postgres)** – store `place_id`, `name`, `rating`, `photo_ref` with `last_fetched_at`; expire at 30 days per Places TOS.
    
2.  **Nightly worker** – for each supported neighborhood run `Nearby Search Pro` once, requesting only `place_id,name,rating,photos`.
    
3.  **Lazy-load photos** – call `place/details` for the photo **only** when a card scrolls into view; thumbnail size `max_width=160`.
    
4.  **Autocomplete throttle** – 300 ms debounce + disable input during request → keeps you well under 50 QPS minute quota.
    
5.  **Back-off strategy** – if Places returns `OVER_QUERY_LIMIT`, temporarily swap the card for a “More coming soon” placeholder.
    

* * *

## 4 . Component & backend todo list

| Layer | Item |
| --- | --- |
| **Backend (Spring Boot)** | `GET /api/home` aggregates: recent picks, highlights, trending, spotlight. |
|     | `RestaurantCache` entity + repo (TTL column). |
|     | `SyncNeighborhoodJob` (scheduled nightly). |
|     | `getOrFetchPlace(placeId, fieldsMask)` util. |
| **Frontend (Next.js + Tailwind)** | `HomeGrid.tsx` (responsive CSS grid). |
|     | `TasteOnboarding.tsx` (StepWizard, save to `/api/profile`). |
|     | `SpotlightCarousel.tsx` (Framer-motion slide). |
|     | `SkeletonCard.tsx` (shimmer placeholder). |
| **Analytics** | Log `cardClick`, `startSessionClick` events to PostHog or Amplitude. |

* * *

## 5 . Why this works for **group decision MVP**

- Gets users into a **session** in one click.
    
- Fills the screen with interesting content for brand-new accounts (Taste Profile + Highlights + Trending).
    
- Avoids an open-ended “browse everything” catalogue until you have more quota or revenue.
    
- Caching strategy keeps you well inside the 5 k / 10 k free buckets – even if you double daily users.
    

* * *

### Next step

If this looks good, we can sketch the DB schema changes (`RestaurantCache`, `UserTastePrefs`) or dive into the React component breakdown. Let me know what you’d like to tackle first!