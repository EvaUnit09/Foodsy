# Restaurant Cache Setup Guide

This guide provides instructions for populating the restaurant cache table with data from Google Places API for trending restaurants in NYC boroughs.

## Overview

The `restaurant_cache` table stores restaurant data fetched from Google Places API to provide recommendations for the dashboard. This setup implements borough-specific searches with rating trends and metadata for trending calculations.

## Prerequisites

- AWS RDS PostgreSQL database access
- Google Places API key configured in your backend
- Database connection tools (psql, pgAdmin, etc.)

## Database Schema

The restaurant cache table should already exist from your JPA entity, but here's the reference structure:

```sql
-- Verify table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'restaurant_cache'
ORDER BY ordinal_position;
```

## Step 1: API Endpoints for Population

Your backend already has the following endpoints for populating data:

### 1. Refresh Borough Data
```bash
# Populate restaurants for a specific borough
curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Manhattan" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Brooklyn" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Queens" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Bronx" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Check Cache Status
```bash
# Verify data was populated
curl "https://apifoodsy-backend.com/homepage/health" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Step 2: Manual Database Population (Alternative)

If you prefer to populate the database manually, here are the SQL commands:

### Check Current Cache Status
```sql
-- Check if table has any data
SELECT COUNT(*) as total_restaurants FROM restaurant_cache;

-- Check by borough
SELECT borough, COUNT(*) as count 
FROM restaurant_cache 
GROUP BY borough;

-- Check expiration status
SELECT 
    borough,
    COUNT(*) as total,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired
FROM restaurant_cache 
GROUP BY borough;
```

### Clear Expired Data
```sql
-- Remove expired entries
DELETE FROM restaurant_cache WHERE expires_at <= NOW();

-- Or clear all data to start fresh
-- DELETE FROM restaurant_cache;
```

## Step 3: Implement Borough-Specific Searches

Based on your implementation requirements, update the `RestaurantCacheService.java` to implement:

### 1. Neighborhood Boundary Searches
```java
// Add to RestaurantCacheService.java
private static final Map<String, List<String>> BOROUGH_NEIGHBORHOODS = Map.of(
    "Manhattan", Arrays.asList("SoHo", "Greenwich Village", "Upper East Side", "Midtown", "Lower East Side"),
    "Brooklyn", Arrays.asList("Williamsburg", "DUMBO", "Park Slope", "Bushwick", "Crown Heights"),
    "Queens", Arrays.asList("Astoria", "Long Island City", "Flushing", "Jackson Heights", "Forest Hills"),
    "Bronx", Arrays.asList("Fordham", "Mott Haven", "Riverdale", "University Heights", "Castle Hill")
);
```

### 2. Weight Restaurants by Criteria
```java
// Trending score calculation
private double calculateTrendingScore(RestaurantCache restaurant) {
    double score = 0.0;
    
    // Rating trend (40% weight)
    if (restaurant.getRating() != null) {
        score += restaurant.getRating() * 0.4;
    }
    
    // Review velocity (30% weight)
    if (restaurant.getUserRatingCount() != null) {
        // Normalize review count (more recent reviews = higher score)
        double reviewVelocity = Math.min(restaurant.getUserRatingCount() / 100.0, 5.0);
        score += reviewVelocity * 0.3;
    }
    
    // Recency (20% weight)
    long daysSinceUpdate = ChronoUnit.DAYS.between(restaurant.getLastFetchedAt(), Instant.now());
    double recencyScore = Math.max(5.0 - (daysSinceUpdate / 7.0), 0.0);
    score += recencyScore * 0.2;
    
    // Price level popularity (10% weight)
    if (restaurant.getPriceLevel() != null) {
        // Mid-range restaurants tend to be more popular
        double priceScore = restaurant.getPriceLevel() == 2 ? 5.0 : 3.0;
        score += priceScore * 0.1;
    }
    
    return score;
}
```

## Step 4: Database Migration for Trending Metadata

Add columns for trending calculations:

```sql
-- Add trending score column
ALTER TABLE restaurant_cache 
ADD COLUMN trending_score DECIMAL(3,2) DEFAULT 0.0;

-- Add trending rank column
ALTER TABLE restaurant_cache 
ADD COLUMN trending_rank INTEGER DEFAULT NULL;

-- Add last trending calculation timestamp
ALTER TABLE restaurant_cache 
ADD COLUMN last_trending_calc_at TIMESTAMP DEFAULT NULL;

-- Add index for trending queries
CREATE INDEX idx_trending_score ON restaurant_cache(trending_score DESC, borough);
CREATE INDEX idx_trending_rank ON restaurant_cache(trending_rank ASC, borough);
```

## Step 5: Populate Data Commands

### Option A: Use Backend API (Recommended)
```bash
#!/bin/bash
# populate_restaurants.sh

echo "Populating restaurant cache for all boroughs..."

# Get access token (replace with your auth method)
# TOKEN=$(curl -s -X POST "https://apifoodsy-backend.com/oauth2/token" \
#   -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_SECRET" | \
#   jq -r '.access_token')

echo "Populating Manhattan..."
curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Manhattan"

echo "Populating Brooklyn..."  
curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Brooklyn"

echo "Populating Queens..."
curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Queens"

echo "Populating Bronx..."
curl -X POST "https://apifoodsy-backend.com/homepage/refresh/Bronx"

echo "Population complete. Checking cache status..."
curl "https://apifoodsy-backend.com/homepage/health"
```

### Option B: Direct Database Population

If the API approach doesn't work, you can insert sample data directly:

```sql
-- Insert sample trending restaurants
INSERT INTO restaurant_cache (
    place_id, name, category, rating, price_level, address, borough, neighborhood,
    latitude, longitude, user_rating_count, last_fetched_at, expires_at, created_at,
    trending_score, trending_rank
) VALUES 
-- Manhattan Top Trending
('ChIJN1t_tDeuEmsRUsoyG83frY4', 'Joe''s Pizza', 'Italian', 4.4, 2, 
 '150 E 14th St, New York, NY 10003', 'Manhattan', 'Union Square',
 40.7353, -73.9897, 1205, NOW(), NOW() + INTERVAL '30 days', NOW(), 4.2, 1),

('ChIJsyq6Qo9ZwokR_gCL9pxjGjg', 'Katz''s Delicatessen', 'Deli', 4.3, 2,
 '205 E Houston St, New York, NY 10002', 'Manhattan', 'Lower East Side',
 40.7223, -73.9873, 8934, NOW(), NOW() + INTERVAL '30 days', NOW(), 4.1, 2),

('ChIJqQJhh8JYwokRGFGQiK-9dIQ', 'Xi''an Famous Foods', 'Chinese', 4.2, 1,
 '81 St Marks Pl, New York, NY 10003', 'Manhattan', 'East Village',
 40.7282, -73.9862, 756, NOW(), NOW() + INTERVAL '30 days', NOW(), 3.9, 3),

-- Brooklyn Top Trending  
('ChIJVR4gv4BbwokR_kRKkfUjYzs', 'Peter Luger Steak House', 'Steakhouse', 4.4, 3,
 '178 Broadway, Brooklyn, NY 11249', 'Brooklyn', 'Williamsburg',
 40.7085, -73.9628, 4521, NOW(), NOW() + INTERVAL '30 days', NOW(), 4.3, 1),

('ChIJ_VH7FkBbwokRsqGXsQfHN-g', 'Grimaldi''s Pizzeria', 'Italian', 4.2, 2,
 '1 Front St, Brooklyn, NY 11201', 'Brooklyn', 'DUMBO',
 40.7024, -73.9937, 2341, NOW(), NOW() + INTERVAL '30 days', NOW(), 4.0, 2),

-- Queens Top Trending
('ChIJQ1t3uTBfwokRVqKXuQhFO2w', 'Mu Ramen', 'Ramen', 4.5, 2,
 '1209 Jackson Ave, Long Island City, NY 11101', 'Queens', 'Long Island City',
 40.7472, -73.9414, 876, NOW(), NOW() + INTERVAL '30 days', NOW(), 4.4, 1),

('ChIJR2u4vDJfwokRWrLYvRiGP3x', 'Taverna Kyclades', 'Greek', 4.3, 2,
 '33-07 Ditmars Blvd, Astoria, NY 11105', 'Queens', 'Astoria',
 40.7746, -73.9063, 1543, NOW(), NOW() + INTERVAL '30 days', NOW(), 4.2, 2);
```

## Step 6: Verify Population

```sql
-- Check population results
SELECT 
    borough,
    COUNT(*) as total_restaurants,
    AVG(rating) as avg_rating,
    AVG(trending_score) as avg_trending_score
FROM restaurant_cache 
WHERE expires_at > NOW()
GROUP BY borough
ORDER BY avg_trending_score DESC;

-- Check trending rankings
SELECT 
    name, 
    borough, 
    category, 
    rating, 
    trending_score, 
    trending_rank
FROM restaurant_cache 
WHERE trending_rank IS NOT NULL
ORDER BY borough, trending_rank;
```

## Step 7: Maintenance Commands

### Weekly Data Refresh
```sql
-- Update trending scores (run weekly)
UPDATE restaurant_cache 
SET 
    trending_score = (
        COALESCE(rating, 0) * 0.4 +
        LEAST(COALESCE(user_rating_count, 0) / 100.0, 5.0) * 0.3 +
        GREATEST(5.0 - EXTRACT(DAYS FROM (NOW() - last_fetched_at)) / 7.0, 0.0) * 0.2 +
        CASE WHEN price_level = 2 THEN 5.0 ELSE 3.0 END * 0.1
    ),
    last_trending_calc_at = NOW()
WHERE expires_at > NOW();

-- Update trending ranks by borough
WITH ranked_restaurants AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY borough ORDER BY trending_score DESC) as rank
    FROM restaurant_cache 
    WHERE expires_at > NOW()
)
UPDATE restaurant_cache r
SET trending_rank = rr.rank
FROM ranked_restaurants rr
WHERE r.id = rr.id;
```

### Cleanup Expired Data
```sql
-- Remove expired entries (run daily)
DELETE FROM restaurant_cache 
WHERE expires_at <= NOW() - INTERVAL '7 days';
```

## Troubleshooting

### If no data appears:
1. Check Google Places API key is valid
2. Verify API quota limits aren't exceeded  
3. Check application logs for errors
4. Ensure database connection is working

### To reset and repopulate:
```sql
-- Clear all cache data
TRUNCATE TABLE restaurant_cache;

-- Then run population commands again
```

## Next Steps

1. Run the population commands above
2. Verify data appears in your dashboard
3. Set up automated weekly refresh jobs
4. Monitor API usage and costs
5. Consider caching strategies for high traffic