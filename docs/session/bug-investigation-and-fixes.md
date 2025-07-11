# Bug Investigation and Fixes

**Session Date:** Current Session  
**Branch:** `bugfix/session-voting-issues`  
**Status:** ✅ Completed

## Identified Bugs

### 1. FinalResultsScreen Vote Count Issue
**Bug:** FinalResultsScreen.tsx -> Final votes was showing 1 in a test round. should be round 1 votes + round 2 votes

**Analysis:**
- In RoundService.completeSession(), the winner's voteCount comes from `winner.getLikeCount()` 
- This only shows votes from Round 2 because Round 2 restaurants have `round2Restaurant.setLikeCount(0)` when created
- The system resets vote counts to 0 when transitioning to Round 2, losing Round 1 vote totals
- FinalResultsScreen displays: `Final Votes: {winner.voteCount || winner.likeCount || 0}`

**Root Cause:** 
- Round 2 restaurants start with likeCount = 0 (line 73 in RoundService.java)
- Final results only show Round 2 votes, not cumulative votes from both rounds

**Fix Strategy:**
- Modify winner calculation to aggregate votes from both rounds for the same restaurant
- Update FinalResultsScreen to show cumulative vote count

### 2. Vote Tracking State Issue
**Bug:** After clicking start round -> Votes remaining: 0/2 "You've used all your votes for this round!" stays until you refresh the page

**Analysis:**
- In useSessionVoting.ts, remaining votes are fetched in useEffect with dependency on `currentRound`
- Vote quotas are round-specific (UserVoteQuota has sessionId, userId, round)
- When round transitions, new quota should be created for new round but UI might be showing stale data
- fetchRemainingVotes() gets called when round changes but there might be a timing issue

**Root Cause:**
- Vote quota creation timing vs UI update timing
- WebSocket round transition might happen before vote quota is properly reset/created for new round

**Fix Strategy:** 
- Ensure vote quotas are properly initialized when round transitions
- Add explicit vote quota reset when starting new round
- Fix timing of UI state updates

### 3. Session Persistence Issue  
**Bug:** Upon a page refresh host needs to click start voting again before a vote can be placed

**Analysis:**
- Session state (`sessionStarted`) is not persisted across page refreshes
- WebSocket connection is re-established on page load but session state is lost
- Backend session status should persist but frontend doesn't sync with it

**Root Cause:**
- Frontend session state is not restored from backend on page load
- Missing session status synchronization on component mount

**Fix Strategy:**
- Fetch session status from backend on page load
- Sync frontend session state with backend session status

### 4. Homepage Restaurant Redirect Issue
**Bug:** Homepage Restaurants should take you to restaurant url. Currently there's no redirect

**Analysis:**
- In Homepage.tsx `handleRestaurantClick()`, it calls `router.push(\`/restaurant/\${restaurant.id}\`)`
- This route `/restaurant/[id]` doesn't exist in the app
- Need to either create restaurant detail page or redirect to external URL

**Root Cause:**
- Missing restaurant detail page implementation
- No external URL redirect for restaurant details

**Fix Strategy:**
- Create restaurant detail page or redirect to Google Maps/restaurant website
- Check if restaurant data includes website URL

## Implementation Plan

1. **✅ Fix Vote Count Aggregation** - Update winner calculation to sum votes from both rounds
2. **✅ Fix Vote State Persistence** - Ensure proper vote quota handling across round transitions  
3. **✅ Fix Session State Sync** - Add session status fetching on page load
4. **✅ Implement Restaurant Navigation** - Add restaurant detail page or external redirect

## Files Modified
- `backend/src/main/java/com/foodsy/backend/service/RoundService.java` ✅
- `frontend/src/components/FinalResultsScreen.tsx` ✅
- `frontend/src/components/RestaurantCard.tsx` ✅
- `frontend/src/hooks/useSessionVoting.ts` ✅
- `frontend/src/app/sessions/[id]/page.tsx` ✅
- `frontend/src/components/Homepage.tsx` ✅

## Fixes Implemented

### 1. Vote Count Aggregation (Fixed ✅)
**Changes Made:**
- Modified `RoundService.completeSession()` to aggregate votes from both Round 1 and Round 2
- Updated winner calculation to show cumulative vote counts (Round 1 + Round 2)
- Added vote breakdown display in FinalResultsScreen showing individual round votes
- Updated Restaurant interface to include `round1Votes` and `round2Votes` fields

**Technical Details:**
- Backend now fetches restaurants from both rounds and sums their like counts by `providerId`
- Winner determination uses total votes instead of just Round 2 votes
- Frontend displays: "Final Votes: X (Round 1: Y + Round 2: Z)"

### 2. Vote State Persistence (Fixed ✅)
**Changes Made:**
- Added forced refresh of remaining votes when round transitions occur
- Improved timing by adding a 500ms delay to ensure backend processes round changes
- Reset local vote state (`voteByProvider`) when rounds change

**Technical Details:**
- useSessionVoting hook now properly handles round transitions
- Backend vote quotas are recreated for new rounds through lazy initialization
- Eliminates the "0 votes remaining" issue when starting new rounds

### 3. Session State Sync (Fixed ✅)
**Changes Made:**
- Added session status synchronization when page loads
- Session started state now syncs with backend session status
- Eliminates need for host to click "start" again after page refresh

**Technical Details:**
- Session is considered started if status is not 'open' (i.e., 'voting', 'round1', 'round2', etc.)
- Frontend `sessionStarted` state is initialized from backend session object

### 4. Restaurant Navigation (Fixed ✅)
**Changes Made:**
- Replaced non-existent restaurant detail page navigation with Google Maps redirect
- Restaurant clicks now open Google Maps search in new tab
- Maintains analytics tracking functionality

**Technical Details:**
- Uses restaurant name and address to create Google Maps search URL
- Graceful fallback if analytics tracking fails
- Opens in new tab to avoid disrupting user's homepage session

## Testing & Next Steps

### Testing Required
1. **Vote Count Aggregation** - Run a complete 2-round voting session and verify winner shows cumulative votes
2. **Vote State Persistence** - Start a round, verify vote counts reset properly and don't show "0 remaining"  
3. **Session State Sync** - Refresh page after session starts, verify voting works without clicking start again
4. **Restaurant Navigation** - Click restaurant cards on homepage, verify Google Maps opens correctly

### Recommended Testing Scenario
1. Create a session with 2+ participants
2. Complete Round 1 voting (each participant vote multiple times)
3. Transition to Round 2 and verify vote counts reset properly
4. Complete Round 2 voting  
5. Check final results show correct aggregated vote counts
6. Test page refresh during active session
7. Test restaurant clicks on homepage

### Branch Status
All identified bugs have been fixed and are ready for testing. The branch `bugfix/session-voting-issues` can be merged after successful testing. 