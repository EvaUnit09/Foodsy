package com.foodsy.controller;

import com.foodsy.domain.EventRsvp;
import com.foodsy.domain.EventSessionRestaurant;
import com.foodsy.domain.RsvpStatus;
import com.foodsy.dto.EventRestaurantWithPhotosDto;
import com.foodsy.service.EventSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sessions/{sessionId}/event")
public class EventSessionController {

    private final EventSessionService eventService;

    public EventSessionController(EventSessionService eventService) {
        this.eventService = eventService;
    }

    record AddRestaurantRequest(String providerId, String name, String address, String category, String priceLevel, Double rating) {}
    record RsvpRequest(String rsvpStatus, String preferredRestaurantId) {}

    @PostMapping("/restaurants")
    public ResponseEntity<EventSessionRestaurant> addRestaurant(
            @PathVariable Long sessionId,
            @RequestBody AddRestaurantRequest req,
            Principal principal) {
        requireAuth(principal);
        String userId = principal.getName().trim().toLowerCase();

        EventSessionRestaurant restaurant = new EventSessionRestaurant();
        restaurant.setProviderId(req.providerId());
        restaurant.setName(req.name());
        restaurant.setAddress(req.address());
        restaurant.setCategory(req.category());
        restaurant.setPriceLevel(req.priceLevel());
        restaurant.setRating(req.rating());

        EventSessionRestaurant saved = eventService.addRestaurant(sessionId, userId, restaurant);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/restaurants/{providerId}")
    public ResponseEntity<Void> removeRestaurant(
            @PathVariable Long sessionId,
            @PathVariable String providerId,
            Principal principal) {
        requireAuth(principal);
        String userId = principal.getName().trim().toLowerCase();
        eventService.removeRestaurant(sessionId, userId, providerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/restaurants")
    public List<EventRestaurantWithPhotosDto> getRestaurants(@PathVariable Long sessionId) {
        return eventService.getRestaurantsWithPhotos(sessionId);
    }

    @PostMapping("/rsvp")
    public ResponseEntity<EventRsvp> submitRsvp(
            @PathVariable Long sessionId,
            @RequestBody RsvpRequest req,
            Principal principal) {
        requireAuth(principal);
        String userId = principal.getName().trim().toLowerCase();
        RsvpStatus status = RsvpStatus.valueOf(req.rsvpStatus());
        EventRsvp rsvp = eventService.submitRsvp(sessionId, userId, status, req.preferredRestaurantId());
        return ResponseEntity.ok(rsvp);
    }

    @GetMapping("/summary")
    public Map<String, Object> getEventSummary(@PathVariable Long sessionId) {
        return eventService.getEventSummary(sessionId);
    }

    @PostMapping("/lock")
    public ResponseEntity<Map<String, Object>> lockRestaurants(
            @PathVariable Long sessionId,
            Principal principal) {
        requireAuth(principal);
        String userId = principal.getName().trim().toLowerCase();
        String joinCode = eventService.lockRestaurants(sessionId, userId);
        return ResponseEntity.ok(Map.of("joinCode", joinCode, "sessionId", sessionId));
    }

    @PostMapping("/complete")
    public ResponseEntity<Void> completeEvent(
            @PathVariable Long sessionId,
            Principal principal) {
        requireAuth(principal);
        String userId = principal.getName().trim().toLowerCase();
        eventService.completeEvent(sessionId, userId);
        return ResponseEntity.noContent().build();
    }

    private void requireAuth(Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }
}
