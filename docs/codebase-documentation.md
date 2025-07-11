# foodsy Codebase Documentation (2025)

## Overview
foodsy is a modern web application for group restaurant decision-making. Users create or join sessions, browse restaurants, and vote in real time. The app features a live, two-round voting flow, Google Places API integration, and a robust user system supporting both accounts and guests.

---

## Key Features
- **Google Places API Integration**: Fetches restaurant data, photos, and details for each session.
- **Live Voting Sessions**: Real-time session flow using WebSockets (Spring WebSocket/STOMP backend, STOMP client frontend).
- **Two-Round Voting Logic**: 
  - Round 1: All users vote (limited likes per user) on a pool of restaurants.
  - Top K restaurants advance to Round 2.
  - Round 2: Each user gets one vote; the restaurant with the most votes wins.
  - Tie-breakers and winner logic handled server-side.
- **Host-Only Controls**: Only the session creator (host) can start the session. Voting and navigation are disabled for all until the host starts.
- **Voting Restrictions**: Voting is limited by round (likes per user in round 1, one vote in round 2). Voting and navigation are disabled until the session starts.
- **User System**: Supports both registered accounts (OAuth2, email/password) and guests. Host logic is enforced by backend and reflected in frontend.
- **WebSocket Events**: Session start, timer updates, round transitions, session end, and (optionally) participant join/leave notifications.

---

## Backend Structure (Spring Boot)

### Domain Models
- **Session**: Represents a voting session (creator, pool size, round time, likes per user, status, join code, etc.)
- **SessionParticipant**: Represents a user (account or guest) in a session.
- **SessionRestaurant**: Represents a restaurant in a session, with round and like count.
- **SessionRestaurantVote**: Represents a user's vote for a restaurant in a given round.

### Repositories
- **SessionRepository**: CRUD for sessions, find by join code.
- **SessionParticipantRepository**: CRUD for participants, find by session/user.
- **SessionRestaurantRepository**: CRUD for restaurants, find by session/round/provider.
- **SessionRestaurantVoteRepository**: CRUD for votes, count votes by user/session/round/type.

### Services
- **SessionService**: Session creation, join logic, participant management, Google Places integration for restaurant pool.
- **VoteService**: Handles voting logic, enforces round-based voting limits, updates like counts.
- **RoundService**: Manages round transitions, calculates Top K, handles session completion and winner selection, broadcasts WebSocket events.
- **SessionTimerService**: Manages round timers, broadcasts timer updates.

### Controllers
- **SessionController**: REST endpoints for session creation, retrieval, participant management, and joining.
- **RestaurantController**: Endpoints for restaurant search and photo retrieval (Google Places API).
- **SessionEventsController**: WebSocket endpoints for session events (start, timer, round transitions, session end, etc.).
- **VoteController**: REST endpoint for submitting votes.

### Configuration
- **WebSocketConfig**: Configures STOMP/WebSocket endpoints.
- **CorsConfig**: CORS settings for frontend-backend communication.
- **SecurityConfig**: Authentication/authorization (OAuth2, JWT, guest support).
- **ApiConfig**: Google Places API key management.

---

## Frontend Structure (Next.js/React)

### Key Pages & Components
- **/sessions/[id]/page.tsx**: Main voting session page. Handles session state, WebSocket events, voting, navigation, and host controls.
- **/sessions/create/page.tsx**: Session creation flow (with account/guest support).
- **/components/JoinCodeDesign.tsx**: Join session UI, handles user identity (account or guest).
- **/components/VotingSessionDesign.tsx**: (If used) Voting UI and results display.

### Hooks
- **useSessionWebSocket**: Connects to backend WebSocket, subscribes to session events, exposes send/receive API.
- **useSessionVoting**: Handles voting logic, enforces round-based restrictions, optimistic UI updates.
- **useUserId**: Retrieves current user ID (from localStorage/session/account context).

### Voting & Session Flow
- Host starts session (WebSocket message).
- All users receive session start event; voting and navigation become enabled.
- Timer updates and round transitions are broadcast via WebSocket.
- After round 1, Top K restaurants are selected and round 2 begins.
- After round 2, winner is determined and session ends (results can be displayed).

---

## Google Places API Usage
- Used for all restaurant data (search, details, photos).
- Backend fetches and stores a pool of restaurants for each session at creation.
- RestaurantController exposes endpoints for fetching restaurant photos and details.

---

## WebSocket Event Flow
- **sessionStarted**: Host starts session; all clients enable voting.
- **timerUpdate**: Backend broadcasts remaining time; clients update countdown.
- **roundTransition**: Backend signals start of new round (with Top K info); clients update UI.
- **sessionComplete/sessionEnd**: Backend signals session end and winner; clients display results.
- **(Optional) participantJoin/leave**: Real-time participant updates.

---

## User System
- **Accounts**: OAuth2 (Google), email/password, persistent authentication.
- **Guests**: Temporary user IDs, stored in localStorage/session.
- **Host Logic**: Only the session creator can start the session; enforced by backend and reflected in frontend UI.

---

## Notes for Developers
- All voting/session state is managed server-side and broadcast via WebSocket for real-time UX.
- Voting and navigation are disabled until the host starts the session.
- Voting limits and round logic are enforced both in backend and frontend.
- Google Places API is the sole provider for restaurant data (Foursquare is deprecated).
- For new features or bugfixes, see `docs/tasks.md` for the current roadmap and progress.

---

This documentation is up-to-date as of July 2024 and reflects the current architecture and feature set of foodsy.
