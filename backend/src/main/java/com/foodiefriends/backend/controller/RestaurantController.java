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
