# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Development Partnership

We're building production-quality code together. Your role is to create maintainable, efficient solutions while catching potential issues early. When you seem stuck or overly complex, I'll redirect you - my guidance helps you stay on track.

## 🚨 AUTOMATED CHECKS ARE MANDATORY

**ALL build/test issues are BLOCKING - EVERYTHING must be ✅ GREEN!**  
No errors. No formatting issues. No checkstyle problems. Zero tolerance.  
These are not suggestions. Fix ALL issues before continuing.

## CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

### Research → Plan → Implement

**NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:

1.  **Research**: Explore the codebase, understand existing patterns
2.  **Plan**: Create a detailed implementation plan and verify it with me
3.  **Implement**: Execute the plan with validation checkpoints

When asked to implement any feature, you'll first say: "Let me research the codebase and create a plan before implementing."

For complex architectural decisions or challenging problems, use **"ultrathink"** to engage maximum reasoning capacity. Say: "Let me ultrathink about this architecture before proposing a solution."

### USE MULTIPLE AGENTS!

*Leverage subagents aggressively* for better results:

- Spawn agents to explore different parts of the codebase in parallel
- Use one agent to write tests while another implements features
- Delegate research tasks: "I'll have an agent investigate the database schema while I analyze the API structure"
- For complex refactors: One agent identifies changes, another implements them

Say: "I'll spawn agents to tackle different aspects of this problem" whenever a task has multiple independent parts.

### Reality Checkpoints

**Stop and validate** at these moments:

- After implementing a complete feature
- Before starting a new major component
- When something feels wrong
- Before declaring "done"
- **WHEN BUILD/TESTS FAIL WITH ERRORS** ❌

Run: `./gradlew spotlessApply && ./gradlew test && ./gradlew check`

> Why: You can lose track of what's actually working. These checkpoints prevent cascading failures.

### 🚨 CRITICAL: Build/Test Failures Are BLOCKING

**When build/test commands report ANY issues (non-zero exit code), you MUST:**

1.  **STOP IMMEDIATELY** - Do not continue with other tasks
2.  **FIX ALL ISSUES** - Address every ❌ issue until everything is ✅ GREEN
3.  **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed
4.  **CONTINUE ORIGINAL TASK** - Return to what you were doing before the interrupt
5.  **NEVER IGNORE** - There are NO warnings, only requirements

This includes:

- Formatting issues (spotless, google-java-format)
- Linting violations (checkstyle, PMD, SpotBugs)
- Forbidden patterns (System.out.println in production code, raw Exception catching, Thread.sleep)
- Test failures
- Compilation errors
- ALL other checks

Your code must be 100% clean. No exceptions.

**Recovery Protocol:**

- When interrupted by a build/test failure, maintain awareness of your original task
- After fixing all issues and verifying the fix, continue where you left off
- Use the todo list to track both the fix and your original task

## Working Memory Management

### When context gets long:

- Re-read this CLAUDE.md file
- Summarize progress in a PROGRESS.md file
- Document current state before major changes

### Maintain TODO.md:
```
## Current Task
- [ ] What we're doing RIGHT NOW

## Completed  
- [x] What's actually done and tested

## Next Steps
- [ ] What comes next
```

## Project Structure

FoodieFriends is a full-stack web application for group restaurant voting sessions. It consists of:

### Backend (Java/Spring Boot)
- **Location**: `backend/` directory
- **Framework**: Spring Boot 3.5.0 with Java 21
- **Database**: PostgreSQL (production) and H2 (development)
- **Build System**: Gradle with Kotlin DSL
- **Key Features**: REST API, WebSocket support, JPA entities, OAuth2 security

### Frontend (Next.js/React)
- **Location**: `frontend/` directory  
- **Framework**: Next.js 15.3.2 with React 19
- **Styling**: Tailwind CSS with Radix UI components
- **WebSocket**: STOMP.js for real-time communication
- **UI Libraries**: Material-UI, Lucide React icons

## Development Commands

### Backend
```bash
cd backend
./gradlew bootRun          # Run development server
./gradlew build            # Build the application
./gradlew test             # Run tests
```

### Frontend
```bash
cd frontend
npm run dev                # Run development server (localhost:3000)
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
npm run test               # Run Jest tests
```

## Core Architecture

### Domain Model
- **Session**: Voting sessions with join codes, configurable parameters (pool size, round time, likes per user)
- **SessionParticipant**: Users who join voting sessions
- **SessionRestaurant**: Restaurants available for voting in a session
- **SessionRestaurantVote**: Individual votes cast by users

### WebSocket Communication
- **Endpoint**: `/ws` with SockJS fallback
- **Topics**: `/topic/session/{sessionId}` for session-specific events
- **Events**: Session start, timer updates, vote updates, round transitions

### API Integration
- **Google Places API**: Restaurant search and details (replaced Foursquare)
- **Configuration**: API keys managed through environment variables

### Key Services
- **SessionService**: Manages session lifecycle and state
- **VoteService**: Handles vote recording and counting
- **SessionTimerService**: Manages round timing and transitions
- **GooglePlacesClient**: External API integration

## Testing Strategy

### Backend
- **Framework**: JUnit 5 with Mockito
- **Test Types**: Unit tests for services, integration tests for controllers
- **Location**: `backend/src/test/java/`

### Frontend
- **Framework**: Jest with React Testing Library
- **Configuration**: `jest.config.js` with jsdom environment
- **Location**: `frontend/tests/`

## WebSocket Implementation

The application uses STOMP over WebSocket for real-time features:
- **Server Config**: `WebSocketConfig.java` - enables message broker with `/topic` and `/app` prefixes
- **Frontend Hook**: `useWebSockethook.tsx` - manages WebSocket connections
- **Event Broadcasting**: Session events, timer updates, vote synchronization

## Database Schema

Key relationships:
- Sessions have many participants and restaurants
- Restaurants have many votes from participants
- Votes link participants to specific restaurants within a session

## Current Feature Status

Based on recent commits:
- ✅ WebSocket integration with STOMP
- ✅ Session creation and management
- ✅ Google Places API integration
- ✅ Voting session timer functionality
- ✅ Host-only session controls
- 🔄 Real-time vote synchronization (in progress)

## Configuration Files

- **Backend**: `application.properties` for Spring Boot configuration
- **Frontend**: `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- **Build**: `build.gradle.kts` for dependencies and Java toolchain

## Implementation Guidelines

### Code Style and Conventions
- **Backend**: Follow Spring Boot conventions with proper service layer separation
- **Frontend**: Use TypeScript strictly, prefer functional components with hooks
- **Database**: Use JPA entities with proper relationships and constraints
- **API Design**: RESTful endpoints with consistent response formats
- **WebSocket**: Use STOMP messaging patterns for real-time features

### Adding New Features
1. **Backend Changes**:
   - Add domain entities in `domain/` package
   - Create repositories in `repository/` package
   - Implement business logic in `service/` package
   - Add REST controllers in `controller/` package
   - Write unit tests for all services

2. **Frontend Changes**:
   - Create reusable components in `components/`
   - Add custom hooks in `hooks/` for complex state logic
   - Use Next.js app router for new pages
   - Implement TypeScript interfaces for API responses

3. **WebSocket Integration**:
   - Add message mappings in controllers with `@MessageMapping`
   - Use `SimpMessagingTemplate` for broadcasting events
   - Subscribe to topics in frontend using STOMP client
   - Handle connection states and reconnection logic

### Database Changes
- Update JPA entities with proper annotations
- Add new repositories extending `JpaRepository`
- Use `@Transactional` for multi-table operations
- Test with H2 in-memory database for development

## Problem-Solving Strategies

### Common Issues and Solutions

#### WebSocket Connection Problems
- **Issue**: WebSocket fails to connect
- **Check**: CORS configuration in `CorsConfig.java`
- **Solution**: Ensure frontend origin is allowed in `WebSocketConfig.java:21`

#### Database Connection Issues
- **Issue**: JPA entities not saving properly
- **Check**: `application.properties` database configuration
- **Solution**: Verify entity relationships and cascade settings

#### API Integration Failures
- **Issue**: Google Places API returns errors
- **Check**: API key configuration and request limits
- **Solution**: Implement proper error handling and fallback mechanisms

#### Frontend Build Errors
- **Issue**: TypeScript compilation failures
- **Check**: Type definitions and imports
- **Solution**: Ensure all API response types are properly defined

### Debugging Approaches

#### Backend Debugging
- Use Spring Boot Actuator endpoints for health checks
- Check application logs for SQL queries and errors
- Use `@Transactional` rollback for database debugging
- Test controllers with `@WebMvcTest` for isolated testing

#### Frontend Debugging
- Use React DevTools for component state inspection
- Check Network tab for API call failures
- Use WebSocket debugging tools for real-time communication
- Test components with React Testing Library

#### WebSocket Debugging
- Monitor `/topic/session/{id}` subscriptions
- Check STOMP frame headers and payloads
- Verify message broker configuration
- Test with WebSocket client tools

### Performance Considerations
- **Database**: Use proper indexing on frequently queried fields (join_code, session_id)
- **WebSocket**: Limit message frequency to prevent flooding
- **Frontend**: Implement proper loading states and error boundaries
- **API**: Cache Google Places responses to reduce external API calls

### Security Best Practices
- **Backend**: Use OAuth2 for authentication, validate all inputs
- **Frontend**: Sanitize user inputs, use HTTPS in production
- **WebSocket**: Implement proper session validation for WebSocket connections
- **Database**: Use parameterized queries, avoid exposing sensitive data

### Testing Strategies
- **Unit Tests**: Test service layer logic in isolation
- **Integration Tests**: Test complete request/response cycles
- **WebSocket Tests**: Mock WebSocket connections for testing real-time features
- **End-to-End**: Test complete user workflows across frontend/backend