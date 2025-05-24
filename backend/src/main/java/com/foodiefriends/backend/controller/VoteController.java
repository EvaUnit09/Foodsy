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
