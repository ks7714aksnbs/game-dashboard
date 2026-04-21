package com.doomplatform.controller;

import com.doomplatform.dto.GameDtos.*;
import com.doomplatform.service.GameService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/game")
public class GameController {

    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping("/sessions")
    public ResponseEntity<SessionResponse> createSession(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody CreateSessionRequest request) {
        return ResponseEntity.ok(gameService.createSession(user.getUsername(), request));
    }

    @PostMapping("/sessions/join")
    public ResponseEntity<SessionResponse> joinSession(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody JoinSessionRequest request) {
        return ResponseEntity.ok(gameService.joinSession(user.getUsername(), request));
    }

    @PostMapping("/sessions/{code}/start")
    public ResponseEntity<SessionResponse> startSession(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String code) {
        return ResponseEntity.ok(gameService.startSession(user.getUsername(), code));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<SessionResponse>> getOpenSessions() {
        return ResponseEntity.ok(gameService.getOpenSessions());
    }

    @GetMapping("/sessions/{code}")
    public ResponseEntity<SessionResponse> getSession(@PathVariable String code) {
        return ResponseEntity.ok(gameService.getSessionByCode(code));
    }

    @PostMapping("/result")
    public ResponseEntity<Void> submitResult(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody SubmitResultRequest request) {
        gameService.submitResult(user.getUsername(), request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/history")
    public ResponseEntity<List<MatchHistoryResponse>> getHistory(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(gameService.getMatchHistory(user.getUsername()));
    }
}
