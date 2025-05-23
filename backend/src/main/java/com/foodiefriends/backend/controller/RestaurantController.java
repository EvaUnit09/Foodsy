package com.foodiefriends.backend.controller;

import java.util.List;
import com.foodiefriends.backend.client.FoursquareClient;
import com.foodiefriends.backend.dto.FoursquareSearchResponse;
import com.foodiefriends.backend.dto.RestaurantDto;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {
    private final FoursquareClient fsq;
    public RestaurantController(FoursquareClient fsq) {
        this.fsq = fsq;
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



}
