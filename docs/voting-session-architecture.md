# Voting Session Architecture & Flow

## Overview

This document outlines the comprehensive architecture for the FoodieFriends voting session system, including authentication, vote management, real-time features, and UI components.

## Current Issues Identified

### Critical Issues
1. **500 errors in round 2 voting** - Backend restaurant lookup failures
2. **Vote count UI bugs** - State inconsistencies when navigating between restaurants
3. **Authentication state mismatch** - Frontend/backend authentication disconnect
4. **Vote persistence inconsistencies** - localStorage vs database state conflicts

### Architectural Issues
1. **Mixed guest/authenticated user handling** - Complex state management
2. **localStorage dependency** - Not suitable for multi-device/persistent sessions
3. **Monolithic session page component** - Hard to maintain and debug
4. **Frontend vote tracking** - Duplicate logic between frontend and backend

## Proposed Architecture

### 1. Authentication System (JWT-Based)

#### Current State
- Mixed localStorage/Principal authentication
- Guest users with manual ID entry
- Authentication state mismatches

#### Target Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   Database      │
│                 │    │                  │    │                 │
│ JWT in HttpOnly │◄──►│ JWT Validation   │◄──►│ User Sessions   │
│ Cookie          │    │ Filter           │    │ & Profiles      │
│                 │    │                  │    │                 │
│ No localStorage │    │ Stateless Auth   │    │ Persistent Data │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

#### Implementation Plan
- **Remove guest account creation** - Only authenticated users can create sessions
- **Allow anonymous session viewing** - Guest users can view but not vote
- **JWT token in HttpOnly cookies** - Secure, cross-tab compatible
- **Automatic token refresh** - Seamless user experience
- **Single sign-on flow** - Consistent authentication state

### 2. Vote Management System

#### Current State
- localStorage vote tracking
- Backend vote validation
- Round-specific storage keys
- State synchronization issues

#### Target Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   Database      │
│                 │    │                  │    │                 │
│ UI State Only   │◄──►│ Vote Service     │◄──►│ UserVoteQuota   │
│ (optimistic)    │    │ - Validation     │    │ SessionVotes    │
│                 │    │ - Persistence    │    │ VoteHistory     │
│ Real-time       │    │ - Real-time      │    │                 │
│ Updates         │    │ Broadcasting     │    │ Audit Trail     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

#### Database Schema
```sql
-- User vote quotas per session/round
CREATE TABLE user_vote_quota (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    round INTEGER NOT NULL,
    total_allowed INTEGER NOT NULL,
    votes_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id, round)
);

-- Individual vote records (audit trail)
CREATE TABLE session_vote_history (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    round INTEGER NOT NULL,
    vote_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id, provider_id, round)
);
```

### 3. Component Architecture

#### Current State
- Monolithic session page component (700+ lines)
- Mixed concerns (voting, UI, WebSocket, state management)
- Hard to debug and maintain

#### Target Architecture
```
SessionPage/
├── SessionHeader/
│   ├── SessionInfo
│   ├── RoundIndicator
│   └── Timer
├── SessionBanners/
│   ├── RoundBanner
│   ├── VotingStatusBanner
│   └── AllVotesInBanner
├── VotingArea/
│   ├── RestaurantCard/
│   │   ├── RestaurantInfo
│   │   ├── PhotoGallery
│   │   └── VotingButtons
│   ├── VotingProgress
│   └── RestaurantNavigation
├── HostControls/
│   ├── StartSessionButton
│   ├── RoundTransitionButton
│   └── SessionEndButton
└── ParticipantsList/
    ├── ParticipantItem
    └── VotingStatus
```

### 4. Real-time System

#### Current State
- WebSocket for timer and round transitions
- Polling for vote status
- Manual state synchronization

#### Target Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   Database      │
│                 │    │                  │    │                 │
│ WebSocket       │◄──►│ STOMP Broker     │◄──►│ Event Store     │
│ Subscriptions   │    │ - Vote events    │    │ Vote Changes    │
│                 │    │ - Round events   │    │ Round Progress  │
│ Real-time UI    │    │ - User events    │    │ User Actions    │
│ Updates         │    │ - Timer events   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Implementation Phases

### Phase 1: Foundation & Authentication
1. **JWT Authentication Implementation**
   - Add JWT dependencies
   - Create JWT service and filters
   - Update frontend to use HttpOnly cookies
   - Remove localStorage authentication

2. **Remove Guest Account Creation**
   - Update session creation to require authentication
   - Add "Sign in to vote" prompts for anonymous users
   - Maintain anonymous session viewing

3. **Database Schema Updates**
   - Add user_vote_quota table
   - Add session_vote_history table
   - Update existing vote tracking

### Phase 2: Vote Management System
1. **Backend Vote Service Redesign**
   - Implement quota-based voting
   - Add real-time vote broadcasting
   - Remove localStorage dependencies

2. **Frontend Vote State Management**
   - Remove localStorage vote tracking
   - Implement optimistic UI updates
   - Add WebSocket vote synchronization

3. **Vote UI Components**
   - Extract VotingButtons component
   - Add VotingProgress component
   - Implement real-time vote counters

### Phase 3: Component Architecture
1. **Session Page Refactoring**
   - Extract major sections into components
   - Implement proper state management
   - Add component-level error boundaries

2. **UI State Management**
   - Centralize session state
   - Add proper loading states
   - Implement error handling

### Phase 4: Testing & Polish
1. **Integration Testing**
   - Test complete voting flows
   - Verify real-time synchronization
   - Test authentication edge cases

2. **Performance Optimization**
   - Optimize WebSocket connections
   - Add proper caching strategies
   - Minimize re-renders

## Expected Benefits

### User Experience
- **Consistent authentication** across all features
- **Real-time vote synchronization** across devices
- **Reliable vote counting** with server-side validation
- **Better error handling** with clear feedback

### Developer Experience
- **Cleaner codebase** with separated concerns
- **Easier debugging** with component isolation
- **Better testability** with smaller components
- **Consistent data flow** with single source of truth

### Analytics & Business
- **Complete user tracking** across sessions
- **Voting pattern analysis** for insights
- **Session completion metrics** for optimization
- **User engagement data** for product decisions

## Next Steps

1. **Review and approve** this architecture plan
2. **Create detailed implementation tasks** for Phase 1
3. **Set up development milestones** with testing checkpoints
4. **Begin with JWT authentication** as the foundation
5. **Iteratively implement** remaining phases

## Questions for Discussion

1. Should we implement all phases before releasing, or can we deploy incrementally?
2. Are there any additional real-time features we should consider?
3. Should we add vote change/undo functionality for better UX?
4. Do we need offline support for voting sessions?
5. Should we add session analytics dashboard for hosts?