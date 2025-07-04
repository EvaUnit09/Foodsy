# FoodieFriends — Voting Room Feature Design

* * *

Are you feeling? Spicy/sweet/

## 1. Which restaurants go into the swipe‑deck?

| Tier | Source | Why include it | Selection rule |
| --- | --- | --- | --- |
| **A  User Favourites** | Each participant’s saved favourites list | Highest chance of acceptance; instantly personalised | Select up to **Nfavs/user** (e.g. 3) from every voter, then de‑duplicate |
| **B  Personalised Picks** | Simple recommender: restaurants similar to places each user *liked* in past swipes (match on categories, price tier, distance) | Feels “smart” without heavy ML | For each user, score nearby venues, keep global top **X** |
| **C  Trending / New** | External search (Foursquare / Google / TomTom) for popular or recently opened venues in the area | Keeps choices fresh and serendipitous | Fetch once per session; random‑sample or rank by rating |

**Assembly algorithm**

```pseudo
candidate_pool = dedup(favourites ∪ personalised ∪ trending)
shuffle(candidate_pool)                   // avoid bias
limit to POOL_SIZE (e.g. 20–30)
persist in SessionRestaurant table
```

* * *

## 2. Pool size, votes per user & multi‑round flow

Instead of “likes” eliminations.

Include in profile dietary restrictions and general food you don’t like

### Recommended defaults

| Parameter | Rule of thumb | Rationale |
| --- | --- | --- |
| **Pool size** | `max(15, 4 × group_size)` (cap 30) | Enough variety; avoids fatigue |
| **Likes / user** | `ceil(POOL_SIZE / 3)` | Creates scarcity, forces prioritisation |
| **Passes** | Unlimited | Users can skip without penalty (dietary limits, etc.) |
| **Super‑like** *(optional)* | 1 per round | Breaks ties, signals strong preference |

### Two‑round algorithm

1.  **Round 1** – everyone swipes the full pool (or until likes exhausted). Select **Top K** by total likes where `K = min(5, group_size + 2)`.
    
2.  **Round 2 (Final)** – present only those Top K cards. Each user gets **one vote**. Highest total wins. Ties resolved by super‑like weight, else random sudden‑death vote.
    

*Large groups (≥ 8)* → insert a semi‑final round instead of throwing 30 cards at everyone.

* * *

## 3. Time limit per round

- **Default:** **5 minutes** (configurable 2–10 min).
    
- Display a progress bar and live countdown.
    
- End when **time expires OR all participants finish swiping**, whichever comes first.
    
- Auto‑submit “pass” for any unfinished cards of inactive users.
    

* * *

## 4. Results / recap screen

| Element | Details |
| --- | --- |
| **Ranked list** | Highlight winner (#1), show #2 … #K below |
| **Who liked what** | Avatars or counts under each restaurant |
| **Action buttons** | • *Book a table*  • *Start next round* |
| **Timer** | If auto‑progressing, countdown to next round |

* * *

## 5. Winner unavailable (no reservations)

```text
attemptReservation(winner, desired_time)
└─ FAIL? → prompt host:
     [ Try different time ]  [ Pick runner‑up ]  [ Restart vote ]
```

- Auto‑check reservations for the top two runners‑up while displaying confirmation.
    
- Persist full ranking so the group can restart quickly without swiping the same list again.
    

* * *

## Reference data‑model (simplified)

```text
Session
  id, creator_id, status, pool_size, round, created_at

SessionParticipant
  id, session_id, user_id, joined_at

SessionRestaurant
  id, session_id, provider_id, round, order, like_count, superlike_count

Vote
  id, session_restaurant_id, user_id, vote_type (LIKE/PASS/SUPERLIKE), ts
```

* * *

## Real‑time event flow (WebSocket)

| Event | Sent by | Payload | Client action |
| --- | --- | --- | --- |
| `joined` | client → server | user_id | Broadcast to `/topic/session/{id}` |
| `vote` | client → server | restaurant_id, vote_type | Server stores vote & updates counts |
| `voteUpdate` | server → clients | restaurant_id, like_count | Update UI counters instantly |
| `roundEnd` | server → clients | ranked list | Navigate to recap screen |
| `timer` | server (interval) | millis_left | Update countdown bar |

* * *

## Edge cases & rules of thumb

1.  **User disconnects mid‑round** → mark inactive, auto‑pass after 30 s.
    
2.  **Late joiner** → queue for next round or fast‑forward with limited likes.
    
3.  **Duplicate restaurants** → canonicalize by provider ID + fuzzy geo‑match.
    
4.  **No majority after final round** → auto‑start new pool with fresh restaurants.
    

* * *

## Minimal vote‑recording controller (Spring‑Boot sketch)

```java
@PostMapping("/sessions/{id}/votes")
public void submitVote(@PathVariable Long id,
                       @RequestBody VoteRequest req,
                       Principal user) {
    votingService.recordVote(id, user.getName(),
                             req.restaurantId(), req.type());
}

@Service
public class VotingService {
  public void recordVote(Long sessionId, String username,
                         Long restId, VoteType type) {
      voteRepo.save(new Vote(sessionId, restId, username, type));
      var counts = voteRepo.countByRestaurant(restId);
      websocket.convertAndSend("/topic/session/" + sessionId,
                               new VoteUpdate(restId, counts));
      if (allUsersDone(sessionId) || timerExpired(sessionId)) {
          roundManager.finishRound(sessionId);
      }
  }
}
```

* * *

## Configurable knobs (cheat‑sheet)

| Setting | Default | Where to expose |
| --- | --- | --- |
| Pool size | 20 cards | Session‑creation modal |
| Likes / user | Pool ÷ 3 | Session‑creation modal |
| Super‑likes | 1   | Could be premium perk |
| Round time | 5 min | Host settings |
| Tie‑breaker weight | Super‑like = +2 votes | Server config |

* * *

## Next concrete task

1.  Add fields `pool_size`, `round_time`, `likes_per_user` to your `Session` entity.
    
2.  Implement the pool‑builder that merges favourites + external search → shuffles → stores in `SessionRestaurant`.
    
3.  Wire the vote‑recording endpoint (above) and emit `voteUpdate` events so the front‑end can begin real‑time UI work.
    

* * *

*This document captures the core rules, data shapes, and UX flow needed to implement the FoodieFriends voting room while leaving plenty of room for future refinements (recommendations engine, tiered rounds, gamification).*