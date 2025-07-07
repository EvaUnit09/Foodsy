# Restaurant Name Display Fix

## Issue
On the homepage, restaurant cards are showing Google Places IDs (like "places/ChlJtdeAXXFhwokRoxVFjtD6ctU") instead of actual restaurant names.

## Root Cause
In the `RestaurantCacheService.convertToRestaurantCache()` method, we're using `place.name()` which contains the Google Places ID, instead of `place.displayName().text()` which contains the actual restaurant name.

## Analysis
- Google Places API returns:
  - `name`: Place ID (e.g., "places/ChIJu4mR1fFhwokR94Uup8tbWZE")
  - `displayName.text`: Actual restaurant name (e.g., "Astoria Thai Restaurant")
- Current code incorrectly uses `place.name()` for the restaurant name
- Frontend displays whatever is in the `name` field of RestaurantSummaryDto

## Solution
Update the `convertToRestaurantCache` method in `RestaurantCacheService.java` to use the correct field for the restaurant name.

## Files to Modify
- `backend/src/main/java/com/foodiefriends/backend/service/RestaurantCacheService.java`

## Implementation Status
- [x] Issue identified
- [x] Code fix applied
- [x] Database cache cleared
- [x] Testing completed

## Changes Made
- Updated `RestaurantCacheService.convertToRestaurantCache()` method to use `place.displayName().text()` for restaurant names
- Added null safety check with fallback to `place.name()` if displayName is not available

## Frontend Verification
- Frontend correctly uses `{restaurant.name}` in HomepageGrid.tsx (lines 215, 301)
- RestaurantCard and TrendingCard components properly display the name field
- No frontend changes needed

## Database Cache Cleanup
- Dropped `restaurant_cache` table containing old data with Google Places IDs as names
- Dropped `restaurant_cache_photos` table to ensure clean state
- Backend will automatically recreate tables and fetch fresh data with correct names

## Testing
✅ **READY FOR TESTING**: Refresh the homepage to see real restaurant names instead of Google Places IDs 