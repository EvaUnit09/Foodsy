# FoodieFriends Java Codebase Documentation

## Overview
FoodieFriends is an application that allows users to create sessions for voting on restaurants. Users can join sessions using a unique join code, view restaurants in the session, and vote on them. The application integrates with the Foursquare API to fetch restaurant data.

## Architecture
The application follows a typical Spring Boot architecture with the following components:
- **Main Application**: Entry point for the Spring Boot application
- **Domain Models**: Represent the data entities (Session, SessionParticipant, SessionRestaurant)
- **Repositories**: Provide data access using Spring Data JPA
- **Services**: Contain business logic
- **Controllers**: Expose REST API endpoints
- **DTOs**: Transfer data between layers
- **Clients**: Integrate with external APIs (Foursquare)
- **Configuration**: Configure the application behavior

## Key Components

### Domain Models

#### Session
Represents a voting session with properties like creator, pool size, round time, and status.

#### SessionParticipant
Represents a user participating in a session.

#### SessionRestaurant
Represents a restaurant in a session with properties like name, address, and like count.

### Repositories

#### SessionRepository
Provides data access for Session entities, including finding by join code.

#### SessionParticipantRepository
Provides data access for SessionParticipant entities, including finding by session ID and user ID.

#### SessionRestaurantRepository
Provides data access for SessionRestaurant entities, including finding by session ID and provider ID.

### Services

#### SessionService
Handles session creation, retrieval, and participant management. Creates a unique join code for each session and populates it with restaurants from Foursquare.

#### VoteService
Processes votes for restaurants in a session, incrementing like counts.

### Controllers

#### SessionController
Exposes endpoints for session management, including creation, retrieval, and participant management.

#### RestaurantController
Exposes endpoints for restaurant search and photo retrieval using the Foursquare API.

#### VoteController
Exposes an endpoint for submitting votes for restaurants.

## Workflow

1. A user creates a session with parameters like pool size and round time.
2. The system generates a unique join code for the session and populates it with restaurants from Foursquare.
3. Other users can join the session using the join code.
4. Users vote on restaurants in the session.
5. The system tracks votes and updates like counts.

## Code Listing

### Domain Models

```java
// Session.java
package com.foodiefriends.backend.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
        name = "session",
        uniqueConstraints = @UniqueConstraint(columnNames = "join_code"
        )
)
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String creatorId;
    private Integer poolSize;
    private Integer roundTime;
    private Integer likesPerUser;

    private String status; // open, voting, ended
    private Instant createdAt = Instant.now();

    @Column(name = "join_code", unique = true, nullable = false, length = 6)
    private String joinCode;

    // Getters / Setters
    public String getJoinCode() {
        return joinCode;
    }
    public void setJoinCode(String joinCode) {
        this.joinCode = joinCode;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public String getStatus() {
        return status;
    }
    public void setPoolSize(Integer poolSize) {
        this.poolSize = poolSize;
    }
    public Integer getPoolSize() {
        return poolSize;
    }
    public void setRoundTime(Integer roundTime) {
        this.roundTime = roundTime;
    }
    public Integer getRoundTime() {
        return roundTime;
    }
    public void setLikesPerUser(Integer likesPerUser) {
        this.likesPerUser = likesPerUser;
    }
    public Integer getLikesPerUser() {
        return likesPerUser;
    }
    public void setCreatorId(String creatorId) {
        this.creatorId = creatorId;
    }
    public String getCreatorId() {
        return creatorId;
    }
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
    public Instant getCreatedAt() {
        return createdAt;
    }
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
}
```

```java
// SessionParticipant.java
package com.foodiefriends.backend.domain;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "session_participant",
uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "user_id"} ))
public class SessionParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt = Instant.now();

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Session getSession() { return session; }
    public void setSession(Session session) { this.session = session; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
```

```java
// SessionRestaurant.java
package com.foodiefriends.backend.domain;

import jakarta.persistence.*;

@Entity
public class SessionRestaurant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long sessionId; // FK to Session
    private String providerId; //Foursquare fsq_id
    private String name;
    private String address;
    private String category;

    private Integer likeCount = 0;
    private Integer round = 1;


    public SessionRestaurant() {

    }

    public Long getSessionId() {
        return sessionId;
    }
    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }
    public String getProviderId() {
        return providerId;
    }
    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public String getAddress() {
        return address;
    }
    public void setAddress(String address) {
        this.address = address;
    }
    public String getCategory() {
        return category;
    }
    public void setCategory(String category) {
        this.category = category;
    }
    public Integer getLikeCount() {
        return likeCount;
    }
    public void setLikeCount(Integer likeCount) {
        this.likeCount = likeCount;
    }
    public Integer getRound() {
        return round;
    }
    public void setRound(Integer round) {
        this.round = round;
    }
}
```

### Repositories

```java
// SessionRepository.java
package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByJoinCode(String joinCode);
}
```

```java
// SessionParticipantRepository.java
package com.foodiefriends.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.foodiefriends.backend.domain.SessionParticipant;

import java.util.List;
import java.util.Optional;


public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {
    List<SessionParticipant> findBySessionId(Long sessionId);
    Optional<SessionParticipant> findBySessionIdAndUserId(Long sessionId, String userId);
}
```

```java
// SessionRestaurantRepository.java
package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.SessionRestaurant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


public interface SessionRestaurantRepository extends JpaRepository<SessionRestaurant, Long> {
    List<SessionRestaurant> findBySessionId(Long sessionId);
    Optional<SessionRestaurant> findBySessionIdAndProviderId(Long sessionId, String providerId);
}
```

### Services

```java
// SessionService.java
package com.foodiefriends.backend.service;

import com.foodiefriends.backend.client.FoursquareClient;
import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionParticipant;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.dto.FoursquareSearchResponse;
import com.foodiefriends.backend.example.session.JoinCodeGenerator;
import com.foodiefriends.backend.repository.SessionParticipantRepository;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository restaurantRepo;
    private final FoursquareClient fsq;
    private final SessionParticipantRepository sessionParticipantRepository;

    public SessionService(SessionRepository sessionRepo, SessionRestaurantRepository restaurantRepo, FoursquareClient fsq, SessionParticipantRepository sessionParticipantRepository) {
        this.sessionRepository = sessionRepo;
        this.restaurantRepo = restaurantRepo;
        this.fsq = fsq;
        this.sessionParticipantRepository = sessionParticipantRepository;
    }
    public Session createSession(Session session) {
        String code;
        do {
            code = JoinCodeGenerator.generate();
        } while (sessionRepository.findByJoinCode(code).isPresent());

        session.setJoinCode(code);
        session.setStatus("OPEN");
        Session saved = sessionRepository.save(session);
        System.out.println("Created session with ID: " + saved.getId());

        var response = fsq.search("Astoria, NY", "restaurants");
        List<FoursquareSearchResponse.Place> places = response.results();
        System.out.println("Retrieved " + places.size() + " places from Foursquare");

        // Shuffle and limit
        Collections.shuffle(places);
        long limit = session.getPoolSize();
        System.out.println("Pool size limit: " + limit);

        for (int i = 0; i < Math.min(limit, places.size()); i++) {
            var place = places.get(i);
            var loc = place.location();

            SessionRestaurant sr = new SessionRestaurant();
            sr.setSessionId(saved.getId());
            sr.setProviderId(place.fsq_id());
            sr.setName(place.name());
            sr.setAddress(loc.address() + ", " + loc.locality() + ", " + loc.region());
            sr.setCategory(place.categories().isEmpty() ? "Unknown" : place.categories().getFirst().name());
            sr.setRound(1);
            sr.setLikeCount(0);

            SessionRestaurant savedRestaurant = restaurantRepo.save(sr);
            System.out.println("Saved restaurant: " + savedRestaurant.getName() + " for session " + saved.getId());
        }

        return saved;
    }
    public Session getSession(Long id, String userId) {
        if (id == null || userId == null) return null;
        Session session = sessionRepository.findById(id).orElse(null);

        if (session == null) return null;

        // Check if user already a participant
        boolean isParticipant = sessionParticipantRepository
                .findBySessionIdAndUserId(id, userId)
                .isPresent();
        if (isParticipant) {
            SessionParticipant participant = new SessionParticipant();
            participant.setSession(session);
            participant.setUserId(userId);
            participant.setJoinedAt(Instant.now());
            sessionParticipantRepository.save(participant);
        }
        return session;
    }
    public List<SessionParticipant> getParticipants(Long id) {
        return sessionParticipantRepository.findBySessionId(id);
    }
}
```

```java
// VoteService.java
package com.foodiefriends.backend.service;

import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.dto.VoteRequest;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class VoteService {
    private final SessionRestaurantRepository sessionRestaurantRepository;

    public VoteService(SessionRestaurantRepository sessionRestaurantRepository) {
        this.sessionRestaurantRepository = sessionRestaurantRepository;
    }
    public void processVote(VoteRequest voteRequest) {
        SessionRestaurant sessionRestaurant = sessionRestaurantRepository
                .findBySessionIdAndProviderId(voteRequest.sessionId(), voteRequest.providerId())
                .orElseThrow(() -> new EntityNotFoundException("SessionRestaurant not found"));

        if ("like".equalsIgnoreCase(voteRequest.voteType())) {
            sessionRestaurant.setLikeCount(sessionRestaurant.getLikeCount() + 1);

        }
        sessionRestaurantRepository.save(sessionRestaurant);
    }
}
```

### Controllers

```java
// SessionController.java
package com.foodiefriends.backend.controller;

import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionParticipant;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.dto.ParticipantDto;
import com.foodiefriends.backend.repository.SessionParticipantRepository;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import com.foodiefriends.backend.service.SessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
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


    public SessionController(SessionRepository repo, SessionRestaurantRepository restaurantRepo, SessionService sessionService, SessionParticipantRepository sessionParticipantRepository) {
        this.sessionService = sessionService;
        this.repo = repo;
        this.restaurantRepo = restaurantRepo;
        this.sessionParticipantRepository = sessionParticipantRepository;
    }

    @PostMapping
    public Session create(@RequestBody Session session) {
        return sessionService.createSession(session);
    }

    @GetMapping("/{id}")
    public Session get(@PathVariable Long id) {
        return repo.findById(id).orElse(null);
    }

    // GET all participants for a session
    @GetMapping("/{id}/participants")
    public List<ParticipantDto> getParticipants(@PathVariable Long id) {

        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found");

        }
        return sessionService.getParticipants(id).stream()
                .map(p -> new ParticipantDto(p.getUserId()))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}/restaurants")
    public List<SessionRestaurant> getRestaurants(@PathVariable Long id) {
        List<SessionRestaurant> restaurants = restaurantRepo.findBySessionId(id);
        System.out.println("Fetching restaurants for session " + id + ". Found: " + restaurants.size());
        return restaurants;

    }

    // Add a new participant to a session
    @PostMapping("/{id}/participants")
    public ResponseEntity<ParticipantDto> addParticipant(@PathVariable Long id, @RequestBody ParticipantDto dto) {
        Session session = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (sessionService.getParticipants(id).stream().anyMatch(p -> p.getUserId().equals(dto.getUserId()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Participant already exists");
        }

        SessionParticipant participant = new SessionParticipant();
        participant.setSession(session);
        participant.setUserId(dto.getUserId());
        participant.setJoinedAt(java.time.Instant.now());
        sessionParticipantRepository.save(participant); //

        // Return ResponseEntity with location header and DTO body
        return ResponseEntity
                .created(URI.create("/api/sessions/" + id + "/participants/" + participant.getUserId()))
                .body(new ParticipantDto(participant.getUserId()));
    }
    public void saveParticipant(SessionParticipant participant) {
        sessionParticipantRepository.save(participant);
    }

    @PostMapping("/sessions/{code}/join")
    public ResponseEntity<ParticipantDto> joinSession(
            @PathVariable String code,
            @RequestBody Map<String, String> body
    ) {
        String userName = body.get("userName");

        if (userName == null || userName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User name is required");
        }

        Session session = repo.findByJoinCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid join code"));

        Optional<SessionParticipant> existing = sessionParticipantRepository.findBySessionIdAndUserId(session.getId(), userName);
        if (existing.isPresent()) {
            return ResponseEntity.ok(new ParticipantDto(existing.get().getUserId()));
        }
        SessionParticipant participant = new SessionParticipant();
        participant.setSession(session);
        participant.setUserId(userName);
        participant.setJoinedAt(java.time.Instant.now());
        sessionParticipantRepository.save(participant);

        return ResponseEntity.status(HttpStatus.CREATED).body(new ParticipantDto(participant.getUserId()));
    }
}
```

```java
// RestaurantController.java
package com.foodiefriends.backend.controller;

import java.util.List;
import com.foodiefriends.backend.client.FoursquareClient;
import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.dto.FoursquareSearchResponse;
import com.foodiefriends.backend.dto.RestaurantDto;
import com.foodiefriends.backend.service.SessionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {
    private final FoursquareClient fsq;
    private final SessionService sessionService;

    public RestaurantController(FoursquareClient fsq, SessionService sessionService) {
        this.fsq = fsq;
        this.sessionService = sessionService;
    }
    @GetMapping
    public List<RestaurantDto> search(@RequestParam String near, @RequestParam String query) {
        return fsq.search(near, query).results().stream()
                .map(place -> new RestaurantDto(
                        place.fsq_id(),
                        place.name(),
                        place.location().address() + ", " +
                                place.location().locality() + ", " +
                                place.location().region(),
                        place.categories().isEmpty() ? "Unknow" : place.categories().getFirst().name()
                ))
                .toList();
    }
    @PostMapping
    public Session create(@RequestBody Session session) {
        return sessionService.createSession(session);
    }

    @GetMapping("/{providerId}/photos")
    public List<String> getPhotos(
            @PathVariable String providerId,
            @RequestParam(defaultValue = "5") int limit) {

        if (limit <= 0) {
            throw new IllegalArgumentException("limit must be positive");
        }

        return fsq.fetchPhotoUrls(providerId, limit);
    }
}
```

```java
// VoteController.java
package com.foodiefriends.backend.controller;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.foodiefriends.backend.service.VoteService;
import com.foodiefriends.backend.dto.VoteRequest;


@RestController
@RequestMapping("/api/votes")
public class VoteController {

    private final VoteService voteService;

    public VoteController(VoteService voteService) {
        this.voteService = voteService;
    }

    @PostMapping
    public ResponseEntity<Void> submitVote(@RequestBody VoteRequest voteRequest) {
        voteService.processVote(voteRequest);
        return ResponseEntity.ok().build();
    }
}
```

### DTOs

```java
// ParticipantDto.java
package com.foodiefriends.backend.dto;

public class ParticipantDto {
    private String userId;

    public ParticipantDto() {
    }

    public ParticipantDto(String userId) {
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
```

```java
// VoteRequest.java
package com.foodiefriends.backend.dto;

public record VoteRequest(
        Long sessionId,
        String providerId,
        String voteType
) {
}
```

```java
// RestaurantDto.java
package com.foodiefriends.backend.dto;

public record RestaurantDto(
        String id,
        String name,
        String address,
        String category
) {
}
```

### Utility Classes

```java
// JoinCodeGenerator.java
package com.foodiefriends.backend.example.session;

import java.security.SecureRandom;

public class JoinCodeGenerator {
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 6;
    private static final SecureRandom random = new SecureRandom();

    public static String generate() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            int randomIndex = random.nextInt(CHARACTERS.length());
            sb.append(CHARACTERS.charAt(randomIndex));
        }
        return sb.toString();
    }
}
```

### Main Application

```java
// BackendApplication.java
package com.foodiefriends.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
		System.out.println("Loaded DB_USER: " + System.getenv("DB_USER"));
	}

}
```

### Client

```java
// FoursquareClient.java
package com.foodiefriends.backend.client;
import com.foodiefriends.backend.dto.FoursquareSearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import com.foodiefriends.backend.dto.FourSquarePhotoResponse;

import java.util.Arrays;
import java.util.List;

@Component
public class FoursquareClient {
    private final RestClient restClient;

    public FoursquareClient(@Value("${foursquare.api.key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.foursquare.com/v3/places")
                .defaultHeader("Authorization", apiKey)
                .build();
    }
    public FoursquareSearchResponse search(String near, String query) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("near", near)
                        .queryParam("query", query)
                        .queryParam("limit", 10)
                        .build())
                .retrieve()
                .body(FoursquareSearchResponse.class); // mapping later
    }
    public List<String> fetchPhotoUrls(String fsqId, int limit) {
        FourSquarePhotoResponse[] photos = restClient
                .get()
                .uri("/{id}/photos?limit={lim}", fsqId, limit)
                .retrieve()
                .body(FourSquarePhotoResponse[].class);
        if (photos == null) return List.of();

        return Arrays.stream(photos)
                .map(p -> p.prefix() + "original" + p.suffix())
                .toList();
    }
}
```

### Configuration

```java
// ApiConfig.java
package com.foodiefriends.backend.config;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiConfig {
    @Value("{foursquare.api,key}")
    private String foursquareApiKey;

    public String getFoursquareApiKey() {
        return foursquareApiKey;
    }
}
```

```java
// CorsConfig.java
package com.foodiefriends.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:3000")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
```

```java
// SecurityConfig.java
package com.foodiefriends.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(Customizer.withDefaults())
                .formLogin(AbstractHttpConfigurer::disable); // Disable form login
        return http.build();
    }
    @Configuration
    public static class WebConfig implements WebMvcConfigurer {

        @Override
        public void addCorsMappings(CorsRegistry registry) {
            registry.addMapping("/api/**")
                    .allowedOrigins("https://localhost:3000")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*");
        }
    }

}
```

### Additional DTOs

```java
// FoursquareSearchResponse.java
package com.foodiefriends.backend.dto;

import jdk.jfr.Category;

import java.util.List;

public record FoursquareSearchResponse(
        List<Place> results
) {
    public record Place(
            String fsq_id,
            String name,
            Location location,
            List<Category> categories
    ) {}

    public record Location(
            String address,
            String locality,
            String region
    ) {}
    public record Category(
            String name
    ) {}
}
```

```java
// FourSquarePhotoResponse.java
package com.foodiefriends.backend.dto;

public record FourSquarePhotoResponse(
        String id,
        String created_at,
        String prefix,
        String suffix,
        Integer width,
        Integer height
) {}
```

### Additional Controllers

```java
// HelloController.java
package com.foodiefriends.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {
    @GetMapping("/api/hello")
    public String hello() {
        return "Hello from FoodieFriends backend";
    }

}
```

## Conclusion

The FoodieFriends application is a Spring Boot backend that provides functionality for creating and managing restaurant voting sessions. It integrates with the Foursquare API to fetch restaurant data and allows users to join sessions and vote on restaurants. The application follows a clean architecture with separation of concerns between controllers, services, repositories, and domain models.
