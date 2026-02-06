# Foodsy Backend Codebase Documentation

## **Architecture Overview**

Foodsy is a **Spring Boot REST API** that provides a voting-based restaurant recommendation system. The application uses:
- **Spring Security** with JWT authentication
- **OAuth2** integration (Google)
- **PostgreSQL** database with JPA/Hibernate
- **Google Places API** for restaurant data
- **WebSocket** for real-time updates

---

## **Package Structure**

### **1. Controllers (`/controller/`)**
REST API endpoints organized by domain:

#### **AuthController** (`/auth/*`)
- **Purpose**: JWT token management and user authentication
- **Endpoints**:
  - `POST /auth/refresh` - Refresh JWT access token using refresh token
  - `GET /auth/me` - Get current authenticated user details
  - `GET /auth/test` - Test endpoint for debugging authentication
  - `POST /auth/logout` - Clear authentication cookies
- **Key Behavior**: 
  - Validates refresh tokens from cookies or Authorization header
  - Returns new access tokens in response body
  - Logs extensive debugging information

#### **OAuth2Controller** (`/oauth2/*`)
- **Purpose**: OAuth2 user information endpoint
- **Endpoints**:
  - `GET /oauth2/user` - Get current OAuth2 user details
- **Key Behavior**: Works with Spring Security OAuth2 context

#### **SessionController** (`/sessions/*`)
- **Purpose**: Voting session management
- **Endpoints**:
  - `POST /sessions` - Create new voting session
  - `GET /sessions/{id}` - Get session details
  - `POST /sessions/{code}/join` - Join session by code
  - `POST /sessions/{id}/restaurants/{providerId}/vote` - Cast vote
  - `GET /sessions/{id}/remaining-votes` - Get user's remaining votes
  - `GET /sessions/{id}/participants` - Get session participants
  - `GET /sessions/{id}/restaurants` - Get session restaurants
- **Key Behavior**: 
  - Requires authentication for most operations
  - Manages voting rounds (1 and 2)
  - Handles session state transitions

#### **HomepageController** (`/homepage/*`)
- **Purpose**: Homepage data and user taste preferences
- **Endpoints**:
  - `GET /homepage` - Get homepage data (auth-aware)
  - `GET /homepage/taste-profile` - Get user taste preferences
  - `POST /homepage/taste-profile` - Create taste profile
  - `PUT /homepage/taste-profile` - Update taste profile
  - `POST /homepage/analytics` - Record analytics events
- **Key Behavior**:
  - Serves different data for authenticated vs anonymous users
  - Manages user onboarding state

#### **RestaurantController** (`/restaurants/*`)
- **Purpose**: Restaurant search and photo retrieval
- **Endpoints**:
  - `GET /restaurants?near={location}&query={search}` - Search restaurants
  - `GET /restaurants/{providerId}/photos` - Get restaurant photos
  - `GET /restaurants/photos/{placeId}/{photoId}` - Get specific photo
- **Key Behavior**: Integrates with Google Places API

---

### **2. Domain Models (`/domain/`)**

#### **User Entity**
- **Table**: `users`
- **Key Fields**:
  - `id` (Primary Key)
  - `username` (Unique, min 3 chars)
  - `email` (Unique)
  - `displayName` (for UI display)
  - `provider` (GOOGLE, LOCAL, FACEBOOK, GITHUB)
  - `providerId` (OAuth2 provider's user ID)
  - `emailVerified` (boolean)
  - `createdAt`, `updatedAt` (LocalDateTime)
- **Constructors**: 
  - Default (sets timestamps)
  - OAuth2 user with email/username
  - OAuth2 user with full details

#### **Session Entity**
- **Table**: `session`
- **Key Fields**:
  - `id` (Primary Key)
  - `joinCode` (6-char unique code)
  - `creatorId` (username of creator)
  - `status` (open, voting, ended)
  - `round` (1 or 2)
  - `poolSize`, `roundTime`, `likesPerUser` (voting rules)

#### **SessionParticipant Entity**
- Links users to sessions they've joined

#### **SessionRestaurant Entity**
- Restaurants added to a session with voting data

#### **SessionRestaurantVote Entity**
- Individual votes (LIKE/DISLIKE) by users

#### **AuthProvider Enum**
- Values: LOCAL, GOOGLE, FACEBOOK, GITHUB
- Has `toString()` method returning display name

---

### **3. Services (`/service/`)**

#### **JwtService**
- **Purpose**: JWT token generation and validation
- **Key Methods**:
  - `generateAccessToken(userId, email)` - 24h expiry
  - `generateRefreshToken(userId)` - 168h (7 days) expiry
  - `validateToken(token)` - Parse and validate
  - `isAccessToken()`, `isRefreshToken()` - Type checking
  - `isTokenExpired()` - Expiry checking
- **Configuration**: Uses HMAC-SHA256 with configurable secret

#### **OAuth2UserService**
- **Purpose**: Process OAuth2 users after Google authentication
- **Key Behavior**:
  - Creates or updates users in database
  - Handles username conflicts (appends numbers)
  - Links existing email accounts to OAuth2
  - Returns `CustomOAuth2User` wrapper

#### **UserService**
- **Purpose**: User CRUD operations
- **Key Methods**: `findByUsername()`, `findByEmail()`, `save()`

#### **SessionService**
- **Purpose**: Session lifecycle management
- **Key Methods**: `createSession()`, `joinSession()`, `addRestaurants()`

#### **VoteService**
- **Purpose**: Voting logic and validation
- **Key Behavior**: Tracks vote quotas, handles round transitions

---

### **4. Configuration (`/config/`)**

#### **SecurityConfig**
- **Purpose**: Spring Security configuration
- **Key Configuration**:
  - CSRF disabled
  - CORS enabled globally
  - Session policy: `IF_REQUIRED`
  - Public endpoints: `/`, `/error`, `/oauth2/**`, `/auth/**`
  - All other endpoints require authentication
  - JWT filter before username/password filter
  - OAuth2 login with custom success handler

#### **JwtAuthenticationFilter**
- **Purpose**: Extract and validate JWT tokens
- **Token Sources**: 
  1. Authorization header (`Bearer {token}`)
  2. Cookies (`accessToken`)
- **Skipped Paths**: `/oauth2/`, `/restaurants`, `/sessions`, `/homepage`
- **Behavior**: Sets Spring Security context if valid access token

#### **OAuth2SuccessHandler**
- **Purpose**: Handle successful OAuth2 authentication
- **Key Behavior**:
  - Generates JWT access and refresh tokens
  - Sets refresh token as HttpOnly cookie
  - Redirects to frontend with access token and username in URL
  - Redirect URL: `https://foodsy-frontend.vercel.app/auth/oauth2/success?username={username}&accessToken={accessToken}`

---

### **5. DTOs (`/dto/`)**

#### **UserDto**
- **Purpose**: User data for API responses
- **Fields**: id, username, email, firstName, lastName, displayName, avatarUrl, provider, emailVerified, createdAt
- **Jackson Annotations**: 
  - `@JsonFormat` for LocalDateTime serialization
  - `@JsonProperty` for field mapping

#### **VoteRequest**
- **Purpose**: Vote submission payload
- **Fields**: sessionId, restaurantId, voteType

---

### **6. Utilities (`/util/`)**

#### **UserMapper**
- **Purpose**: Convert User entities to UserDto
- **Method**: `toDto(User user)` - Handles null safety

#### **CookieUtil**
- **Purpose**: Secure cookie management
- **Configuration**: HttpOnly, Secure, SameSite=None
- **Methods**: Set/clear access tokens, refresh tokens, session cookies

---

## **Authentication Flow**

### **OAuth2 Login Process**
1. User clicks "Sign In with Google" → `GET /oauth2/authorization/google`
2. Google OAuth2 redirect → `/login/oauth2/code/google`
3. `OAuth2UserService.loadUser()` processes user data
4. `OAuth2SuccessHandler.onAuthenticationSuccess()` generates JWT tokens
5. Redirect to frontend with access token: `/auth/oauth2/success?username={user}&accessToken={token}`
6. Frontend stores access token and gets user data via `/api/auth/me`

### **JWT Authentication Process**
1. Frontend sends requests with `Authorization: Bearer {accessToken}` header
2. `JwtAuthenticationFilter` extracts and validates token
3. If valid, sets Spring Security authentication context
4. Controllers access user via `Principal principal` parameter

### **Token Refresh Process**
1. Frontend calls `POST /api/auth/refresh`
2. `AuthController` looks for refresh token in cookies or Authorization header
3. If valid, generates new access token
4. Returns new access token in response body

---

## **Database Schema**

### **Key Tables**
- **users**: User accounts and OAuth2 data
- **session**: Voting sessions
- **session_participant**: Session membership
- **session_restaurant**: Restaurants in sessions
- **session_restaurant_vote**: Individual votes
- **user_taste_preferences**: User food preferences
- **restaurant_cache**: Cached Google Places data

### **Important Constraints**
- `users.username` must be unique, min 3 characters
- `users.email` must be unique
- `session.join_code` must be unique, 6 characters
- `session_restaurant_vote` has composite unique key (user + restaurant + session)

---

## **External Integrations**

### **Google Places API**
- **Client**: `GooglePlacesClient`
- **Features**: Restaurant search, photo retrieval, place details
- **Rate Limiting**: Managed by `ApiQuotaService`
- **Caching**: Results cached in `restaurant_cache` table

---

## **Security Considerations**

### **CORS Configuration**
- Allows: `https://foodsy-frontend.vercel.app`, `http://localhost:3000`
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Credentials: Allowed
- Headers: All allowed

### **Cookie Security**
- HttpOnly: Prevents XSS access
- Secure: HTTPS only
- SameSite=None: Cross-origin support

### **JWT Security**
- HMAC-SHA256 signing
- Access tokens: 24h expiry
- Refresh tokens: 7 days expiry
- Type validation (access vs refresh)

---

## **Common Issues & Debugging**

### **Authentication Problems**
1. Check JWT token format and expiry
2. Verify CORS headers for cross-origin requests
3. Ensure refresh token cookies are being sent
4. Check `AuthController` logs for token validation details

### **OAuth2 Problems**
1. Verify Google OAuth2 client configuration
2. Check `OAuth2SuccessHandler` redirect URL
3. Ensure frontend can receive URL parameters

### **Database Issues**
1. Check entity mappings match database schema
2. Verify unique constraints aren't violated
3. Check `LocalDateTime` vs `Instant` usage

### **API Integration Issues**
1. Monitor Google Places API quotas
2. Check `GooglePlacesClient` error handling
3. Verify restaurant cache functionality