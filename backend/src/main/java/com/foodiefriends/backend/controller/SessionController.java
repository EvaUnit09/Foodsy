package com.foodiefriends.backend.controller;

import com.foodiefriends.backend.domain.*;
import com.foodiefriends.backend.dto.ParticipantDto;
import com.foodiefriends.backend.dto.VoteRequest;
import com.foodiefriends.backend.repository.SessionParticipantRepository;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import com.foodiefriends.backend.repository.SessionRestaurantVoteRepository;
import com.foodiefriends.backend.service.SessionService;
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

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "http://localhost:3000")
public class SessionController {
    private final SessionRepository repo;
    private final SessionRestaurantRepository restaurantRepo;
    private final SessionService sessionService;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final SessionRestaurantVoteRepository voteRepo;

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

    public SessionController(SessionRepository repo,
                             SessionRestaurantRepository restaurantRepo,
                             SessionService sessionService,
                             SessionParticipantRepository sessionParticipantRepository,
                             SessionRepository sessionRepository,
                             SessionRestaurantRepository sessionRestaurantRepository,
                             SessionRestaurantVoteRepository voteRepo) {
        this.sessionService = sessionService;
        this.repo = repo;
        this.restaurantRepo = restaurantRepo;
        this.sessionParticipantRepository = sessionParticipantRepository;
        this.sessionRepository = sessionRepository;
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.voteRepo = voteRepo;

    }

    @PostMapping
    public Session create(@RequestBody Session session) {
        if (session.getCreatorId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: creatorId");
        }
        return sessionService.createSession(session);
    }

    @GetMapping("/{id}")
    public Session get(@PathVariable Long id) {
        return repo.findById(id).orElse(null);
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
    public ResponseEntity<ParticipantDto> addParticipant(@PathVariable Long id, @RequestBody ParticipantDto dto) {
        Session session = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        String normalizedUserId = dto.getUserId().trim().toLowerCase();
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
            @RequestBody Map<String, String> body
    ) {
        String userName = body.get("userName");

        if (userName == null || userName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User name is required");
        }
        String normalizedUserName = userName.trim().toLowerCase();
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
            @RequestBody VoteRequest voteRequest) {

        if (voteRequest == null ||
                voteRequest.sessionId() == null ||
                voteRequest.userId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Missing required vote fields");
        }
        if (!id.equals(voteRequest.sessionId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Session ID mismatch");
        }

        var session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Session not found"));

        String normalizedUserId = voteRequest.userId().trim().toLowerCase();
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

        voteRepo.findBySession_IdAndProviderIdAndUserIdAndRound(
                id, providerId, normalizedUserId, restaurant.getRound())
                        .ifPresent(v -> {
                            throw new ResponseStatusException(HttpStatus.CONFLICT,
                                    "User has already voted for this restaurant in this round");
                        });

        SessionRestaurantVote vote = new SessionRestaurantVote();
        vote.setSession(session);
        vote.setProviderId(providerId);
        vote.setUserId(normalizedUserId);
        vote.setRound(restaurant.getRound());
        vote.setVoteType(voteRequest.voteType());
        voteRepo.save(vote);

        if (voteRequest.voteType() == VoteType.LIKE) {
            restaurant.setLikeCount(restaurant.getLikeCount() + 1);
            restaurantRepo.save(restaurant);
        }
        return ResponseEntity.noContent().build();
    }


    }