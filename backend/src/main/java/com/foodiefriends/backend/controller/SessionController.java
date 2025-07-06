package com.foodiefriends.backend.controller;

import com.foodiefriends.backend.domain.*;
import com.foodiefriends.backend.dto.ParticipantDto;
import com.foodiefriends.backend.dto.VoteRequest;
import com.foodiefriends.backend.repository.SessionParticipantRepository;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import com.foodiefriends.backend.repository.SessionRestaurantVoteRepository;
import com.foodiefriends.backend.service.SessionService;
import com.foodiefriends.backend.service.VoteService;
import com.foodiefriends.backend.dto.JoinSessionResponse;

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
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class SessionController {
    private final SessionRepository repo;
    private final SessionRestaurantRepository restaurantRepo;
    private final SessionService sessionService;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final SessionRestaurantVoteRepository voteRepo;
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
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.voteRepo = voteRepo;
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

        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to vote");
        }

        if (voteRequest == null || voteRequest.voteType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vote type is required");
        }

        var session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Session not found"));

        String normalizedUserId = principal.getName().trim().toLowerCase();
        boolean isParticipant = sessionParticipantRepository
                .findBySessionIdAndUserId(id, normalizedUserId)
                .isPresent();
        if (!isParticipant) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "User is not a participant of this session");
        }

        SessionRestaurant restaurant = restaurantRepo
                .findBySessionIdAndProviderId(id, providerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Restaurant not found"));

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
            int remaining = voteService.getRemainingLikes(principal.getName().trim().toLowerCase(), id);
            return Map.of("remainingVotes", remaining);
        } catch (Exception e) {
            return Map.of("remainingVotes", 0);
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
            
            for (SessionParticipant participant : participants) {
                int remaining = voteService.getRemainingLikes(participant.getUserId(), id);
                if (remaining == 0) {
                    participantsWithNoVotesLeft++;
                }
            }
            
            boolean allVotesIn = participantsWithNoVotesLeft == totalParticipants;
            
            return Map.of(
                "totalParticipants", totalParticipants,
                "participantsWithNoVotesLeft", participantsWithNoVotesLeft,
                "allVotesIn", allVotesIn
            );
        } catch (Exception e) {
            return Map.of("allVotesIn", false, "totalParticipants", 0, "participantsWithNoVotesLeft", 0);
        }
    }

    }