# FoodieFriends Improvement Tasks

This document contains a detailed list of actionable improvement tasks for the FoodieFriends application. Each task is logically ordered and covers both architectural and code-level improvements.

## Backend Improvements

### Architecture and Design

1. [ ] Implement proper JPA relationships between entities
   - [ ] Replace the `sessionId` field in `SessionRestaurant` with a proper `@ManyToOne` relationship to `Session`
   - [ ] Add bidirectional relationship with `@OneToMany` in `Session` to access restaurants

2. [ ] Improve service layer architecture
   - [ ] Move all business logic from controllers to service classes
   - [ ] Create a `RestaurantService` to handle restaurant-specific operations
   - [ ] Ensure consistent use of DTOs for API responses

3. [ ] Implement proper error handling
   - [ ] Create custom exception classes for different error scenarios
   - [ ] Implement a global exception handler using `@ControllerAdvice`
   - [ ] Return appropriate HTTP status codes and error messages

4. [ ] Add validation for input data
   - [ ] Use Bean Validation (JSR-380) annotations on entity and DTO classes
   - [ ] Validate request parameters and path variables
   - [ ] Add custom validators for complex validation rules

5. [ ] Implement proper logging
   - [ ] Replace `System.out.println` statements with SLF4J logging
   - [ ] Configure appropriate log levels for different environments
   - [ ] Add structured logging for better analysis

### API Improvements

6. [ ] Enhance REST API design
   - [ ] Implement consistent URL patterns and naming conventions
   - [ ] Add pagination, sorting, and filtering for collection endpoints
   - [ ] Implement HATEOAS for better API discoverability

7. [ ] Add missing CRUD operations
   - [ ] Implement endpoints for updating and deleting sessions
   - [ ] Add endpoints for voting on restaurants
   - [ ] Create endpoints for managing session participants

8. [ ] Configure CORS properly
   - [ ] Add a CORS configuration class
   - [ ] Define allowed origins, methods, and headers
   - [ ] Consider environment-specific CORS settings

### Performance and Reliability

9. [ ] Implement caching for external API calls
   - [ ] Add caching for Foursquare API responses
   - [ ] Configure appropriate cache TTL values
   - [ ] Consider using Redis for distributed caching

10. [ ] Add retry logic for external API calls
    - [ ] Implement exponential backoff for failed requests
    - [ ] Add circuit breaker pattern for fault tolerance
    - [ ] Configure timeouts for external API calls

11. [ ] Optimize database operations
    - [ ] Add appropriate indexes to database tables
    - [ ] Use query optimization techniques
    - [ ] Consider implementing database connection pooling

### Security

12. [ ] Implement authentication and authorization
    - [ ] Add user authentication (OAuth2, JWT, etc.)
    - [ ] Implement role-based access control
    - [ ] Secure sensitive endpoints

13. [ ] Secure sensitive data
    - [ ] Store API keys securely using environment variables or a vault
    - [ ] Implement encryption for sensitive data
    - [ ] Add rate limiting to prevent abuse

### Testing

14. [ ] Improve test coverage
    - [ ] Add unit tests for service classes
    - [ ] Implement integration tests for controllers
    - [ ] Add tests for edge cases and error scenarios

15. [ ] Set up CI/CD pipeline
    - [ ] Configure automated testing
    - [ ] Implement code quality checks
    - [ ] Set up automated deployment

## Frontend Improvements

### Architecture and Design

16. [ ] Implement proper component structure
    - [ ] Create reusable UI components
    - [ ] Organize components by feature or domain
    - [ ] Add proper type definitions for all components

17. [ ] Improve state management
    - [ ] Consider using React Context or a state management library
    - [ ] Implement proper loading and error states
    - [ ] Add optimistic updates for better UX

18. [ ] Enhance routing
    - [ ] Add proper routing for different pages
    - [ ] Implement dynamic routes for sessions and restaurants
    - [ ] Add route guards for protected pages

### User Experience

19. [ ] Improve UI/UX design
    - [ ] Create a consistent design system
    - [ ] Enhance mobile responsiveness
    - [ ] Add animations and transitions for better user experience

20. [ ] Implement form handling
    - [ ] Add form validation
    - [ ] Improve error messages and feedback
    - [ ] Implement form state management

21. [ ] Add user feedback mechanisms
    - [ ] Implement toast notifications
    - [ ] Add loading indicators
    - [ ] Improve error handling and display

### API Integration

22. [ ] Improve API integration
    - [ ] Create a centralized API client
    - [ ] Implement proper error handling for API calls
    - [ ] Add retry logic for failed requests

23. [ ] Implement data fetching patterns
    - [ ] Consider using SWR or React Query for data fetching
    - [ ] Implement caching and revalidation strategies
    - [ ] Add prefetching for better performance

### Performance

24. [ ] Optimize performance
    - [ ] Implement code splitting
    - [ ] Add lazy loading for components
    - [ ] Optimize images and assets

25. [ ] Improve build configuration
    - [ ] Configure proper bundling and minification
    - [ ] Add environment-specific configurations
    - [ ] Implement progressive web app features

### Testing

26. [ ] Add frontend tests
    - [ ] Implement unit tests for components
    - [ ] Add integration tests for pages
    - [ ] Set up end-to-end testing

## DevOps and Infrastructure

27. [ ] Improve project documentation
    - [ ] Add comprehensive README files
    - [ ] Create API documentation
    - [ ] Document architecture decisions

28. [ ] Set up proper environments
    - [ ] Configure development, staging, and production environments
    - [ ] Implement environment-specific configurations
    - [ ] Add proper logging and monitoring

29. [ ] Containerize the application
    - [ ] Create Docker files for backend and frontend
    - [ ] Set up Docker Compose for local development
    - [ ] Configure container orchestration for production

30. [ ] Implement monitoring and alerting
    - [ ] Add health check endpoints
    - [ ] Set up application performance monitoring
    - [ ] Configure alerting for critical issues

# Voting Session Live Feature — TODO List

## 1. WebSocket/Real-Time Backend
- [x] Set up Spring WebSocket/STOMP support in backend
- [ x] Define WebSocket endpoints for session events (timer, round transitions, etc.)
- [ x] Implement event broadcasting for:
    - [ x] Session start
    - [ x ] Timer countdown
    - [ x ] Round transitions
    - [ x ] Session end
    - [ ] (Optional) Live participant join/leave notifications

## 2. User/Account System
- [ ] Add user entity/table (with avatar, dietary preferences fields)
- [ ] Implement email/password sign-up & login (Spring Security)
- [ ] Integrate Google OAuth2 login
- [ ] Allow guest join (no account required for now)
- [ ] Update session/join logic to support both registered and guest users

## 3. Session Creation & Sharing
- [ ] Add "Create Session" button (requires name input)
- [ ] Generate unique session link and short join code
- [ ] Implement join by link and join by code endpoints
- [ ] Update frontend to support both join methods

## 4. Live Session Flow
- [ ] Restrict restaurant navigation until host starts session
- [ ] Host can start session (with option to start early)
- [ ] Broadcast session start event to all participants
- [ ] Implement synchronized timer (broadcast via WebSocket)
- [ ] Prevent voting until session starts
- [ ] Visual indicator for round transitions (frontend)

## 5. Voting Rounds Logic
- [ ] Implement two-round voting structure
- [ ] Calculate Top K restaurants after round 1
- [ ] Restrict round 2 to Top K, one vote per user
- [ ] Hide votes until round ends; reveal results at end of each round
- [ ] Handle tie-breakers as per VotingSession.md

## 6. Miscellaneous
- [ ] Add profile management (avatar, dietary preferences)
- [ ] Add error handling and edge case logic (disconnects, late joiners, etc.)
- [ ] Add tests for new features (backend & frontend)

---

*This list is the implementation plan for the `feature/voting-session-live` branch. Update as progress is made or requirements change.*