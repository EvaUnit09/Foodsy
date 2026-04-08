package com.foodsy.controller;

import com.foodsy.domain.Neighborhood;
import com.foodsy.repository.NeighborhoodRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/neighborhoods")
public class NeighborhoodController {

    private final NeighborhoodRepository neighborhoodRepository;

    public NeighborhoodController(NeighborhoodRepository neighborhoodRepository) {
        this.neighborhoodRepository = neighborhoodRepository;
    }

    @GetMapping
    public List<NeighborhoodDto> getByBorough(@RequestParam String borough) {
        String normalized = borough.trim().substring(0, 1).toUpperCase() + borough.trim().substring(1).toLowerCase();
        return neighborhoodRepository.findByBoroughIgnoreCaseOrderByDisplayOrder(normalized)
                .stream()
                .map(n -> new NeighborhoodDto(n.getId(), n.getName(), n.getBorough()))
                .toList();
    }

    public record NeighborhoodDto(Long id, String name, String borough) {}
}
