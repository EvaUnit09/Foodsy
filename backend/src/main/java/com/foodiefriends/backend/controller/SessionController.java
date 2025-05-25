package com.foodiefriends.backend.controller;

import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import com.foodiefriends.backend.service.SessionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "http://localhost:3000")
public class SessionController {
    private final SessionRepository repo;
    private final SessionRestaurantRepository restaurantRepo;
    private final SessionService sessionService;


    public SessionController(SessionRepository repo, SessionRestaurantRepository restaurantRepo, SessionService sessionService) {
        this.sessionService = sessionService;
        this.repo = repo;
        this.restaurantRepo = restaurantRepo;
    }

    @PostMapping
    public Session create(@RequestBody Session session) {
        return sessionService.createSession(session);
    }

    @GetMapping("/{id}")
    public Session get(@PathVariable Long id) {
        return repo.findById(id).orElse(null);
    }
    @GetMapping("/{id}/restaurants")
    public List<SessionRestaurant> getRestaurants(@PathVariable Long id) {
        List<SessionRestaurant> restaurants = restaurantRepo.findBySessionId(id);
        System.out.println("Fetching restaurants for session " + id + ". Found: " + restaurants.size());
        return restaurants;

    }

}
