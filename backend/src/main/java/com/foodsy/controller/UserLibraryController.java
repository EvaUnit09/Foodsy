package com.foodsy.controller;

import com.foodsy.domain.User;
import com.foodsy.domain.UserFavorite;
import com.foodsy.domain.UserWatchlist;
import com.foodsy.domain.RestaurantCache;
import com.foodsy.dto.RestaurantSummaryDto;
import com.foodsy.repository.RestaurantCacheRepository;
import com.foodsy.repository.UserFavoriteRepository;
import com.foodsy.repository.UserWatchlistRepository;
import com.foodsy.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/user/library")
public class UserLibraryController {

    private static final Logger logger = LoggerFactory.getLogger(UserLibraryController.class);
    private static final Pattern PLACE_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_\\-]{10,250}$");

    private final UserService userService;
    private final UserFavoriteRepository favoriteRepository;
    private final UserWatchlistRepository watchlistRepository;
    private final RestaurantCacheRepository cacheRepository;

    public UserLibraryController(UserService userService,
                                 UserFavoriteRepository favoriteRepository,
                                 UserWatchlistRepository watchlistRepository,
                                 RestaurantCacheRepository cacheRepository) {
        this.userService = userService;
        this.favoriteRepository = favoriteRepository;
        this.watchlistRepository = watchlistRepository;
        this.cacheRepository = cacheRepository;
    }

    // ── Favorites ──────────────────────────────────────────────────────────────

    @GetMapping("/favorites")
    public ResponseEntity<List<RestaurantSummaryDto>> getFavorites(Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<UserFavorite> favorites = favoriteRepository.findByUserIdOrderByAddedAtDesc(userOpt.get().getId());
        return ResponseEntity.ok(toRestaurantDtos(
                favorites.stream().map(UserFavorite::getPlaceId).toList()));
    }

    @PostMapping("/favorites/{placeId}")
    @Transactional
    public ResponseEntity<Void> addFavorite(@PathVariable String placeId, Authentication authentication) {
        if (!PLACE_ID_PATTERN.matcher(placeId).matches()) return ResponseEntity.badRequest().build();
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            favoriteRepository.save(new UserFavorite(userOpt.get(), placeId));
        } catch (DataIntegrityViolationException ignored) {
            // concurrent duplicate — already exists, treat as success
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/favorites/{placeId}")
    public ResponseEntity<Void> removeFavorite(@PathVariable String placeId, Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        favoriteRepository.deleteByUserIdAndPlaceId(userOpt.get().getId(), placeId);
        return ResponseEntity.noContent().build();
    }

    // ── Watchlist ──────────────────────────────────────────────────────────────

    @GetMapping("/watchlist")
    public ResponseEntity<List<RestaurantSummaryDto>> getWatchlist(Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<UserWatchlist> items = watchlistRepository.findByUserIdOrderByAddedAtDesc(userOpt.get().getId());
        return ResponseEntity.ok(toRestaurantDtos(
                items.stream().map(UserWatchlist::getPlaceId).toList()));
    }

    @PostMapping("/watchlist/{placeId}")
    @Transactional
    public ResponseEntity<Void> addToWatchlist(@PathVariable String placeId, Authentication authentication) {
        if (!PLACE_ID_PATTERN.matcher(placeId).matches()) return ResponseEntity.badRequest().build();
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            watchlistRepository.save(new UserWatchlist(userOpt.get(), placeId));
        } catch (DataIntegrityViolationException ignored) {
            // concurrent duplicate — already exists, treat as success
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/watchlist/{placeId}")
    public ResponseEntity<Void> removeFromWatchlist(@PathVariable String placeId, Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        watchlistRepository.deleteByUserIdAndPlaceId(userOpt.get().getId(), placeId);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Batch-fetch RestaurantCache for a list of placeIds and return DTOs in the
     * same order (most-recently-added first, matching the repository query order).
     * Restaurants no longer in cache are silently omitted.
     */
    private List<RestaurantSummaryDto> toRestaurantDtos(List<String> placeIds) {
        if (placeIds.isEmpty()) return List.of();
        Map<String, RestaurantCache> byPlaceId = cacheRepository.findByPlaceIdIn(placeIds)
                .stream()
                .collect(Collectors.toMap(RestaurantCache::getPlaceId, r -> r));
        return placeIds.stream()
                .filter(byPlaceId::containsKey)
                .map(id -> RestaurantSummaryDto.fromEntity(byPlaceId.get(id)))
                .collect(Collectors.toList());
    }
}
