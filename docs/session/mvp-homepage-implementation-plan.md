# MVP Homepage Implementation Plan

**Date:** July 6, 2025  
**Session Focus:** Plan implementation of MVP homepage features based on `docs/mvp-homepage.md`

## Project Overview
FoodieFriends MVP homepage with 5 sections (Hero, Your Picks, Highlights, Trending, Spotlight) designed to stay within Google Places API free tier limits (60% usage cap).

## Implementation Status

### ✅ Phase 1: Database Schema Extensions (COMPLETED)
- Created `UserTastePreferences` entity with NYC borough validation
- Created `RestaurantCache` entity with 30-day TTL system
- Created `HomepageAnalytics` entity for user behavior tracking
- Implemented comprehensive repositories with performance-optimized queries
- Created DTOs for homepage API responses

### ✅ Phase 2: Service Layer Implementation (COMPLETED)
- **TasteProfileService**: Manages user preferences and onboarding flow
  - Taste profile CRUD operations
  - Onboarding completion tracking
  - Personalized search criteria generation
  - User similarity matching
  - Comprehensive validation for NYC boroughs and cuisine types
  
- **RestaurantCacheService**: Handles Places API caching with conservative quota management
  - 30-day TTL caching system
  - Conservative quota limits (60% of Google Places API free tier)
  - Multi-criteria restaurant search (borough, price, cuisine, rating)
  - Specialized queries for trending, spotlight, and visual sections
  - Automatic cache cleanup and refresh management
  
- **HomepageAnalyticsService**: Tracks user behavior and generates insights
  - Event tracking for authenticated and anonymous users
  - Conversion funnel analysis
  - Real-time analytics dashboard
  - User journey tracking
  - Hourly activity distribution
  - Data retention management
  
- **HomepageService**: Orchestrates all services for aggregated homepage data
  - Builds personalized homepage for authenticated users
  - Generates default homepage for anonymous users
  - Manages 5 homepage sections with proper fallbacks
  - Performance monitoring and error handling
  - Admin functions for data refresh
  
- **HomepageController**: REST API endpoints for frontend integration
  - Homepage data endpoints (`GET /api/homepage`)
  - Taste profile management (`POST /api/homepage/taste-profile`)
  - Analytics tracking (`POST /api/homepage/analytics`)
  - Admin endpoints for monitoring and maintenance
  - Anonymous user support with session tracking
  
- **ApiQuotaService**: Conservative quota management with circuit breakers
  - 60% usage cap (3,000 Nearby Search, 6,000 Place Details monthly)
  - Circuit breaker pattern at 80% threshold
  - Real-time quota monitoring and health checks
  - Emergency override capabilities
  - Comprehensive usage statistics

### 📋 Phase 3: Frontend Components (PENDING)
- 3-step taste profile onboarding wizard
- Responsive homepage grid layout
- Reusable restaurant card components
- Analytics integration for user behavior tracking

### 📋 Phase 4: Integration & Optimization (PENDING)
- Nightly sync job for borough restaurant updates
- Performance optimization and caching strategies
- Admin dashboard for quota monitoring
- Error handling and graceful degradation

## API Quota Management Strategy

### Conservative Limits (60% of Free Tier)
- **Nearby Search Pro**: 3,000/month (100/day)
- **Place Details**: 6,000/month (200/day)
- **Autocomplete**: 6,000/month (200/day)

### Circuit Breaker Protection
- Opens at 80% of quota usage
- Automatic reset after 1 hour
- Emergency override capability
- Real-time monitoring dashboard

### Caching Strategy
- 30-day TTL for restaurant data
- Borough-specific caching with geographic coordinates
- Automatic cleanup of expired entries
- Performance-optimized database queries

## Database Schema

### Core Entities
1. **UserTastePreferences** - User cuisine preferences, price range, NYC borough
2. **RestaurantCache** - Cached Places API data with 30-day TTL
3. **HomepageAnalytics** - User behavior and interaction tracking

### Key Features
- Full NYC borough validation (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
- 3-tier price system ($, $$, $$$)
- Comprehensive indexing for performance
- Anonymous user tracking with session IDs
- Automatic data cleanup and maintenance

## REST API Endpoints

### Homepage Data
- `GET /api/homepage` - Aggregated homepage data
- `GET /api/homepage/health` - System health check

### Taste Profile
- `GET /api/homepage/taste-profile` - User's taste profile
- `POST /api/homepage/taste-profile` - Save/update taste profile
- `GET /api/homepage/taste-profile/completed` - Onboarding status
- `GET /api/homepage/taste-profile/options` - Available options

### Analytics
- `POST /api/homepage/analytics` - Track user events
- `POST /api/homepage/analytics/card-click` - Track restaurant card clicks
- `POST /api/homepage/analytics/session-start` - Track session starts
- `GET /api/homepage/analytics/summary` - Analytics dashboard
- `GET /api/homepage/analytics/funnel` - Conversion funnel metrics

### Admin Functions
- `GET /api/homepage/stats` - Homepage statistics
- `POST /api/homepage/refresh/{borough}` - Refresh borough data

## Homepage Section Configuration

### Section Sizes
- **Your Picks**: 6 restaurants (personalized)
- **Neighborhood Highlights**: 8 restaurants (with photos preferred)
- **Trending Now**: 4 restaurants (recently popular)
- **Spotlight**: 4 restaurants (random high-rated)

### Personalization Logic
- Authenticated users get recommendations based on taste profile
- Anonymous users see default high-rated restaurants in Manhattan
- Fallback mechanisms for empty sections
- Error handling with graceful degradation

## Performance Targets

### API Usage (100 daily users)
- **Nearby Search**: ~3,000/month (60% of 5,000 limit)
- **Place Details**: ~1,800/month (18% of 10,000 limit)
- **Autocomplete**: ~1,500/month (15% of 10,000 limit)

### Response Times
- Homepage load: <500ms (cache hit)
- Taste profile save: <200ms
- Analytics tracking: <100ms (async)

## Next Steps

1. **Phase 3**: Build React components for 3-step onboarding and homepage grid
2. **Phase 4**: Implement nightly sync job and admin dashboard
3. **Testing**: Comprehensive testing of quota management and caching
4. **Deployment**: Production configuration and monitoring setup

## Key Technical Decisions

- **PostgreSQL for caching**: No Redis dependency, simplified architecture
- **60% quota limit**: Conservative approach for sustainable growth
- **Circuit breaker pattern**: Prevents quota exhaustion
- **Session-based anonymous tracking**: Privacy-friendly analytics
- **Builder pattern for DTOs**: Clean, maintainable API responses
- **Comprehensive validation**: NYC-specific business rules
- **Performance-first design**: Optimized queries and caching strategies

## Summary

✅ **Phase 2 Complete!** All core services are now implemented and ready for frontend integration. The backend provides:

- **Conservative API quota management** with circuit breakers
- **30-day TTL caching system** for restaurant data
- **Comprehensive analytics** with conversion funnel tracking  
- **Personalized recommendations** based on user taste profiles
- **5-section homepage data aggregation** ready for frontend consumption
- **REST API endpoints** for all homepage functionality

The system is designed to handle 100 daily users while staying comfortably under Google Places API free tier limits. Ready for Phase 3 frontend implementation!

 