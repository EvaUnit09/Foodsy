# WebSocket HTTPS Connection & JSON Parsing Fix

## Problem
- Frontend on HTTPS (Vercel) trying to connect to WebSocket over HTTP
- Error: "insecure sockjs connection may not be initiated from a page loaded over HTTPS"
- Error: "The URL's scheme must be either 'http:' or 'https:'. 'wss:' is not allowed"
- JSON parsing errors: "unexpected character at line 1 column 1 of the JSON data"
- Session page stuck on "Loading..." because both WebSocket and API calls failed

## Root Cause
1. WebSocket hook hardcoded to `http://localhost:8080/ws`
2. HTTPS pages cannot connect to HTTP WebSocket endpoints (browser security)
3. SockJS trying to use HTTP schemes even when WSS URL provided
4. API calls not properly handling non-JSON error responses
5. WebSocket CORS not configured for frontend domain

## Solution Applied

### Frontend WebSocket Changes
**File: `frontend/src/hooks/useWebSockethook.tsx`**
- Added `shouldUseNativeWebSocket()` to detect HTTPS environments
- Uses native WebSocket for HTTPS, SockJS for HTTP
- Production: `wss://apifoodsy-backend.com/ws` (native) or `wss://apifoodsy-backend.com/ws-sockjs` (SockJS)
- Local dev: `ws://localhost:8080/ws` (native) or `ws://localhost:8080/ws-sockjs` (SockJS)
- Added debug logging for connection troubleshooting

### Frontend API Error Handling
**File: `frontend/src/app/sessions/[id]/page.tsx`**
- Added proper error handling to `fetchRestaurantsWithPhotos()`, `fetchParticipants()`, `fetchSession()`
- Check response status and content-type before parsing JSON
- Provide meaningful error messages for debugging

### Backend Changes
**File: `backend/src/main/java/com/foodsy/config/WebSocketConfig.java`**
- Added dual WebSocket endpoints:
  - `/ws` - Native WebSocket for HTTPS connections
  - `/ws-sockjs` - SockJS fallback for HTTP connections
- Added `.setAllowedOrigins()` for both endpoints
- Allowed origins: `https://foodsy-frontend.vercel.app`, `http://localhost:3000`

## How It Works Now
1. Frontend detects if running on HTTPS (production) vs HTTP (local)
2. **Primary**: Attempts WebSocket connection
   - HTTPS: Uses native WebSocket to `wss://apifoodsy-backend.com/ws`
   - HTTP: Uses SockJS to `ws://localhost:8080/ws-sockjs`
3. **Fallback**: If WebSocket fails (connection timeout, errors), automatically switches to polling
   - Polls `/api/sessions/{sessionId}/status` every 3 seconds
   - Provides session updates without real-time WebSocket connection
4. Backend provides both native and SockJS endpoints with proper CORS
5. API calls have proper error handling to prevent JSON parsing crashes
6. Session page works with either WebSocket OR polling for updates

## Fallback Strategy
- **10-second timeout**: If WebSocket doesn't connect within 10 seconds, start polling
- **Error handling**: WebSocket errors automatically trigger polling fallback
- **Seamless transition**: User doesn't notice the difference between WebSocket and polling
- **Graceful degradation**: Session functionality works even if backend WebSocket is blocked

## Testing
- Deploy both frontend and backend changes
- Try accessing session page from `https://foodsy-frontend.vercel.app/sessions/21`
- Check browser console for either:
  - Success: "WebSocket connected successfully"
  - Fallback: "Starting polling fallback for session: X"
- Session page should load and function regardless of WebSocket connectivity
- Should not see JSON parsing errors or "insecure sockjs" errors