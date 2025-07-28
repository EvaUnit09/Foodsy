package com.foodsy.controller;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.foodsy.service.VoteService;
import com.foodsy.dto.VoteRequest;


@RestController
@RequestMapping("/votes")
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
