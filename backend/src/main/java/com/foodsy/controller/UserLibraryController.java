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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/user/library")
public class UserLibraryController {

    private static final Logger logger = LoggerFactory.getLogger(UserLibraryController.class);

    private final UserService userService;
    private final UserFavoriteRepository favoriteRepository;
    private final UserWatchlistRepository watchlistRepository;
    private final RestaurantCacheRepository cacheRepository;

    /**
     * Construct a UserLibraryController with its required dependencies.
     *
     * @param userService         service used to resolve the current user from an Authentication
     * @param favoriteRepository  repository for persisting and querying user favorites
     * @param watchlistRepository repository for persisting and querying user watchlist items
     * @param cacheRepository     repository for retrieving cached restaurant data by place ID
     */
    public UserLibraryController(UserService userService,
                                 UserFavoriteRepository favoriteRepository,
                                 UserWatchlistRepository watchlistRepository,
                                 RestaurantCacheRepository cacheRepository) {
        this.userService = userService;
        this.favoriteRepository = favoriteRepository;
        this.watchlistRepository = watchlistRepository;
        this.cacheRepository = cacheRepository;
    }

    /**
     * Retrieve the current user's favorite restaurants as summary DTOs ordered by most recently added.
     *
     * @param authentication the security principal used to identify the current user
     * @return a ResponseEntity containing the list of RestaurantSummaryDto for the user's favorites
     *         ordered by `addedAt` descending with HTTP 200, or an empty response with HTTP 401 if the
     *         user cannot be resolved from the provided authentication
     */

    @GetMapping("/favorites")
    public ResponseEntity<List<RestaurantSummaryDto>> getFavorites(Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<UserFavorite> favorites = favoriteRepository.findByUserIdOrderByAddedAtDesc(userOpt.get().getId());
        return ResponseEntity.ok(toRestaurantDtos(
                favorites.stream().map(UserFavorite::getPlaceId).toList()));
    }

    /**
     * Adds the specified place to the current user's favorites.
     *
     * If the place is already in the user's favorites the request is a no-op.
     *
     * @param placeId the identifier of the place to add to favorites
     * @return 200 OK when the favorite was added or already exists, 401 Unauthorized if the user cannot be resolved
     */
    @PostMapping("/favorites/{placeId}")
    public ResponseEntity<Void> addFavorite(@PathVariable String placeId, Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Long userId = userOpt.get().getId();
        if (!favoriteRepository.existsByUserIdAndPlaceId(userId, placeId)) {
            favoriteRepository.save(new UserFavorite(userOpt.get(), placeId));
        }
        return ResponseEntity.ok().build();
    }

    /**
     * Remove the current user's favorite for the specified place.
     *
     * @param placeId       the place identifier to remove from the user's favorites
     * @param authentication the caller's authentication used to identify the current user
     * @return               HTTP 204 No Content on success, HTTP 401 Unauthorized if the authenticated user cannot be resolved
     */
    @DeleteMapping("/favorites/{placeId}")
    public ResponseEntity<Void> removeFavorite(@PathVariable String placeId, Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        favoriteRepository.deleteByUserIdAndPlaceId(userOpt.get().getId(), placeId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieve the current user's watchlist as restaurant summary DTOs ordered by most recently added.
     *
     * @param authentication the security authentication used to resolve the current user
     * @return a ResponseEntity containing 200 OK with a list of RestaurantSummaryDto ordered by `addedAt` descending when the user is found;
     *         401 Unauthorized with no body when no user can be resolved from the authentication
     */

    @GetMapping("/watchlist")
    public ResponseEntity<List<RestaurantSummaryDto>> getWatchlist(Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<UserWatchlist> items = watchlistRepository.findByUserIdOrderByAddedAtDesc(userOpt.get().getId());
        return ResponseEntity.ok(toRestaurantDtos(
                items.stream().map(UserWatchlist::getPlaceId).toList()));
    }

    /**
     * Adds the specified place to the authenticated user's watchlist.
     *
     * If the user cannot be resolved from the provided authentication, the request is rejected.
     *
     * @param placeId the external place identifier to add to the user's watchlist
     * @return a ResponseEntity with HTTP 200 OK when the place is added or already present; HTTP 401 Unauthorized if the user cannot be resolved
     */
    @PostMapping("/watchlist/{placeId}")
    public ResponseEntity<Void> addToWatchlist(@PathVariable String placeId, Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Long userId = userOpt.get().getId();
        if (!watchlistRepository.existsByUserIdAndPlaceId(userId, placeId)) {
            watchlistRepository.save(new UserWatchlist(userOpt.get(), placeId));
        }
        return ResponseEntity.ok().build();
    }

    /**
     * Remove a place from the current user's watchlist.
     *
     * @param placeId       the place identifier to remove from the user's watchlist
     * @param authentication the authentication token of the current user
     * @return               `204 No Content` when the watchlist entry was removed (or did not exist),
     *                       `401 Unauthorized` if the user cannot be resolved from the authentication
     */
    @DeleteMapping("/watchlist/{placeId}")
    public ResponseEntity<Void> removeFromWatchlist(@PathVariable String placeId, Authentication authentication) {
        Optional<User> userOpt = userService.findByAuthentication(authentication);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        watchlistRepository.deleteByUserIdAndPlaceId(userOpt.get().getId(), placeId);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Convert an ordered list of place IDs into RestaurantSummaryDto objects using cached restaurant entries.
     *
     * Omits IDs that are not present in the cache and preserves the input list order.
     *
     * @param placeIds an ordered list of restaurant place IDs (order determines resulting list order)
     * @return a list of RestaurantSummaryDto corresponding to the provided IDs in the same order; IDs not found in the cache are omitted
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
