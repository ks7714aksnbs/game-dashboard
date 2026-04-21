package com.doomplatform.controller;

import com.doomplatform.dto.GameDtos.LeaderboardEntry;
import com.doomplatform.service.GameService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class LeaderboardController {

    private final GameService gameService;

    public LeaderboardController(GameService gameService) {
        this.gameService = gameService;
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getLeaderboard() {
        return ResponseEntity.ok(gameService.getLeaderboard());
    }
}
