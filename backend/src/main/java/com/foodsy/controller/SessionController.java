package com.foodsy.controller;

import com.foodsy.domain.*;
import com.foodsy.dto.ParticipantDto;
import com.foodsy.dto.VoteRequest;
import com.foodsy.repository.SessionParticipantRepository;
import com.foodsy.repository.SessionRepository;
import com.foodsy.repository.SessionRestaurantRepository;
import com.foodsy.repository.SessionRestaurantVoteRepository;
import com.foodsy.service.SessionService;
import com.foodsy.service.VoteService;
import com.foodsy.dto.JoinSessionResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.security.Principal;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {
    private final SessionRepository repo;
    private final SessionRestaurantRepository restaurantRepo;
    private final SessionService sessionService;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final SessionRepository sessionRepository;
    private final VoteService voteService;

    // Add DTO definition at the top or in a separate file
    record SessionRestaurantDto(
        Long id,
        String providerId,
        String name,
        String category,
        String address,
        Integer likeCount,
        Integer round,
        String priceLevel,
        String priceRange,
        Double rating,
        Integer userRatingCount,
        String currentOpeningHours,
        String generativeSummary,
        String reviewSummary
    ) {}

    // Add DTO definition at the top or in a separate file
    record SessionResponse(
        Long id, 
        String creatorId, 
        boolean isHost, 
        Integer round, 
        Integer likesPerUser, 
        String status,
        Integer poolSize,
        Integer roundTime
    ) {}

    public SessionController(SessionRepository repo,
                             SessionRestaurantRepository restaurantRepo,
                             SessionService sessionService,
                             SessionParticipantRepository sessionParticipantRepository,
                             SessionRepository sessionRepository,
                             SessionRestaurantRepository sessionRestaurantRepository,
                             SessionRestaurantVoteRepository voteRepo,
                             VoteService voteService) {
        this.sessionService = sessionService;
        this.repo = repo;
        this.restaurantRepo = restaurantRepo;
        this.sessionParticipantRepository = sessionParticipantRepository;
        this.sessionRepository = sessionRepository;
        this.voteService = voteService;

    }

    @PostMapping
    public Session create(@RequestBody Session session, Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to create sessions");
        }
        
        session.setCreatorId(principal.getName().trim().toLowerCase());
        return sessionService.createSession(session);
    }

    @GetMapping("/{id}")
    public SessionResponse get(@PathVariable Long id, Principal principal) {
        Session session = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        
        String currentUserId = principal != null ? principal.getName() : null;
        boolean isHost = currentUserId != null && session.getCreatorId().trim().equalsIgnoreCase(currentUserId.trim());
        
        return new SessionResponse(
            session.getId(), 
            session.getCreatorId(), 
            isHost,
            session.getRound(),
            session.getLikesPerUser(),
            session.getStatus(),
            session.getPoolSize(),
            session.getRoundTime()
        );
    }

    // GET all participants for a session
    @GetMapping("/{id}/participants")
    public List<ParticipantDto> getParticipants(@PathVariable Long id) {
        Session session = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        String creatorId = session.getCreatorId();
        return sessionService.getParticipants(id).stream()
                .map(p -> new ParticipantDto(p.getUserId(), "participant", p.getUserId().equals(creatorId)))
                .collect(Collectors.toList());
    }
    // GET all restaurants for a session
    @GetMapping("/{id}/restaurants")
    public List<SessionRestaurantDto> getRestaurants(@PathVariable Long id) {
        List<SessionRestaurant> restaurants = restaurantRepo.findBySessionId(id);
        return restaurants.stream().map(r -> new SessionRestaurantDto(
            r.getId(),
            r.getProviderId(),
            r.getName(),
            r.getCategory(),
            r.getAddress(),
            r.getLikeCount(),
            r.getRound(),
            r.getPriceLevel(),
            r.getPriceRange(),
            r.getRating(),
            r.getUserRatingCount(),
            r.getCurrentOpeningHours(),
            r.getGenerativeSummary(),
            r.getReviewSummary()
        )).toList();
    }

    // Add a new participant to a session
    @PostMapping("/{id}/participants")
    public ResponseEntity<ParticipantDto> addParticipant(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to join sessions");
        }
        
        Session session = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        String normalizedUserId = principal.getName().trim().toLowerCase();
        if (sessionService.getParticipants(id).stream().anyMatch(p -> p.getUserId().equals(normalizedUserId))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Participant already exists");
        }

        SessionParticipant participant = new SessionParticipant();
        participant.setSession(session);
        participant.setUserId(normalizedUserId);
        participant.setJoinedAt(Instant.now());
        sessionParticipantRepository.save(participant);

        return ResponseEntity
                .created(URI.create("/api/sessions/" + id + "/participants/" + participant.getUserId()))
                .body(new ParticipantDto(participant.getUserId()));
    }
    public void saveParticipant(SessionParticipant participant) {
        sessionParticipantRepository.save(participant);
    }
    // Get a session by join code
    @PostMapping("/sessions/{code}/join")
    public ResponseEntity<JoinSessionResponse> joinSession(
            @PathVariable String code,
            Principal principal
    ) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to join sessions");
        }

        String normalizedUserName = principal.getName().trim().toLowerCase();
        Session session = repo.findByJoinCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid join code"));
        Optional<SessionParticipant> existing = sessionParticipantRepository.findBySessionIdAndUserId(session.getId(), normalizedUserName);
        if (existing.isPresent()) {
            return ResponseEntity.ok(
                    new JoinSessionResponse(existing.get().getUserId(), session.getId()));
        }
        SessionParticipant participant = new SessionParticipant();
        participant.setSession(session);
        participant.setUserId(normalizedUserName);
        participant.setJoinedAt(Instant.now());
        sessionParticipantRepository.save(participant);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new JoinSessionResponse(participant.getUserId(), session.getId()));
        
    }
    @PostMapping("/{id}/restaurants/{providerId}/vote")
    public ResponseEntity<Void> voteForRestaurant(
            @PathVariable Long id,
            @PathVariable String providerId,
            @RequestBody VoteRequest voteRequest,
            Principal principal) {

        System.out.println("DEBUG: Vote endpoint called - sessionId: " + id + ", providerId: " + providerId + ", principal: " + (principal != null ? principal.getName() : "null"));

        if (principal == null) {
            System.out.println("DEBUG: Vote rejected - principal is null");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to vote");
        }

        if (voteRequest == null || voteRequest.voteType() == null) {
            System.out.println("DEBUG: Vote rejected - missing vote type");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vote type is required");
        }

        var session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Session not found"));

        String normalizedUserId = principal.getName().trim().toLowerCase();
        
        // Auto-join user as participant if not already joined
        boolean isParticipant = sessionParticipantRepository
                .findBySessionIdAndUserId(id, normalizedUserId)
                .isPresent();
        if (!isParticipant) {
            // Automatically add authenticated user as participant
            SessionParticipant participant = new SessionParticipant();
            participant.setSession(session);
            participant.setUserId(normalizedUserId);
            participant.setJoinedAt(java.time.Instant.now());
            sessionParticipantRepository.save(participant);
        }

        // Find the restaurant in the current round
        SessionRestaurant restaurant = restaurantRepo
                .findBySessionIdAndRound(id, session.getRound())
                .stream()
                .filter(r -> r.getProviderId().equals(providerId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Restaurant not found in current round"));

        // Use VoteService for proper validation and processing
        VoteRequest processedRequest = new VoteRequest(
            id,
            providerId,
            normalizedUserId,
            voteRequest.voteType()
        );
        
        try {
            voteService.processVote(processedRequest);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("exceeded voting limit")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
        return ResponseEntity.noContent().build();
    }

    // Get user's remaining votes for current round
    @GetMapping("/{id}/remaining-votes")
    public Map<String, Integer> getRemainingVotes(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        
        try {
            String normalizedUserId = principal.getName().trim().toLowerCase();
            
            // Auto-join user as participant if not already joined (for vote quota creation)
            Session session = sessionRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
                    
            boolean isParticipant = sessionParticipantRepository
                    .findBySessionIdAndUserId(id, normalizedUserId)
                    .isPresent();
            if (!isParticipant) {
                // Automatically add authenticated user as participant
                SessionParticipant participant = new SessionParticipant();
                participant.setSession(session);
                participant.setUserId(normalizedUserId);
                participant.setJoinedAt(Instant.now());
                sessionParticipantRepository.save(participant);
            }
            
            int remaining = voteService.getRemainingLikes(normalizedUserId, id);
            return Map.of("remainingVotes", remaining);
        } catch (Exception e) {
            System.err.println("Error getting remaining votes: " + e.getMessage());
            return Map.of("remainingVotes", 0);
        }
    }

    // Reset user vote quota for a session (for testing/debugging)
    @DeleteMapping("/{id}/reset-votes")
    public ResponseEntity<Map<String, String>> resetUserVotes(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        
        try {
            String normalizedUserId = principal.getName().trim().toLowerCase();
            voteService.resetUserVotesForSession(normalizedUserId, id);
            return ResponseEntity.ok(Map.of("message", "Vote quota reset successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to reset votes: " + e.getMessage()));
        }
    }

    // Get voting status for all participants
    @GetMapping("/{id}/voting-status")
    public Map<String, Object> getVotingStatus(@PathVariable Long id) {
        try {
            Session session = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
            
            List<SessionParticipant> participants = sessionParticipantRepository.findBySessionId(id);
            int totalParticipants = participants.size();
            int participantsWithNoVotesLeft = 0;
            int totalVotesCast = 0;
            int totalPossibleVotes = 0;
            
            // Calculate vote statistics for current round
            for (SessionParticipant participant : participants) {
                int remaining = voteService.getRemainingLikes(participant.getUserId(), id);
                int maxVotes = (session.getRound() == 1) ? session.getLikesPerUser() : 1;
                int votesUsed = maxVotes - remaining;
                
                totalVotesCast += votesUsed;
                totalPossibleVotes += maxVotes;
                
                if (remaining == 0) {
                    participantsWithNoVotesLeft++;
                }
            }
            
            boolean allVotesIn = participantsWithNoVotesLeft == totalParticipants;
            
            return Map.of(
                "totalParticipants", totalParticipants,
                "participantsWithNoVotesLeft", participantsWithNoVotesLeft,
                "allVotesIn", allVotesIn,
                "totalVotesCast", totalVotesCast,
                "totalPossibleVotes", totalPossibleVotes,
                "currentRound", session.getRound()
            );
        } catch (Exception e) {
            return Map.of("allVotesIn", false, "totalParticipants", 0, "participantsWithNoVotesLeft", 0, 
                         "totalVotesCast", 0, "totalPossibleVotes", 0, "currentRound", 1);
        }
    }

    }