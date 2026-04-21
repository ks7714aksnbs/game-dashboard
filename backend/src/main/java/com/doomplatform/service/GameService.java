package com.doomplatform.service;

import com.doomplatform.dto.GameDtos.*;
import com.doomplatform.entity.*;
import com.doomplatform.exception.*;
import com.doomplatform.repository.*;
import com.doomplatform.websocket.GameWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class GameService {

    private static final Logger log = LoggerFactory.getLogger(GameService.class);
    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final GameSessionRepository   sessionRepository;
    private final UserRepository          userRepository;
    private final MatchHistoryRepository  matchHistoryRepository;
    private final GameWebSocketHandler    wsHandler;
    private final Random random = new Random();

    public GameService(GameSessionRepository sessionRepository,
                       UserRepository userRepository,
                       MatchHistoryRepository matchHistoryRepository,
                       GameWebSocketHandler wsHandler) {
        this.sessionRepository      = sessionRepository;
        this.userRepository         = userRepository;
        this.matchHistoryRepository = matchHistoryRepository;
        this.wsHandler              = wsHandler;
    }

    // ── Create session ──────────────────────────────────────────────────────
    @Transactional
    public SessionResponse createSession(String username, CreateSessionRequest req) {
        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String code = generateUniqueCode();
        GameSession session = GameSession.builder()
                .code(code)
                .name(req.getName())
                .creator(creator)
                .maxPlayers(req.getMaxPlayers() != null ? req.getMaxPlayers() : 4)
                .currentPlayers(1)
                .build();

        session = sessionRepository.save(session);
        log.info("Session [{}] created by [{}]", code, username);
        return toResponse(session);
    }

    // ── Join session ────────────────────────────────────────────────────────
    @Transactional
    public SessionResponse joinSession(String username, JoinSessionRequest req) {
        GameSession session = sessionRepository.findByCode(req.getCode().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + req.getCode()));

        if (session.getStatus() == GameSession.GameStatus.FINISHED)
            throw new IllegalStateException("This session has already ended");
        if (session.getCurrentPlayers() >= session.getMaxPlayers())
            throw new IllegalStateException("Session is full");

        session.setCurrentPlayers(session.getCurrentPlayers() + 1);
        sessionRepository.save(session);
        return toResponse(session);
    }

    // ── Start session ───────────────────────────────────────────────────────
    @Transactional
    public SessionResponse startSession(String username, String code) {
        GameSession session = sessionRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getCreator().getUsername().equals(username))
            throw new IllegalStateException("Only the creator can start the game");
        if (session.getStatus() != GameSession.GameStatus.WAITING)
            throw new IllegalStateException("Game is not in WAITING state");

        session.setStatus(GameSession.GameStatus.IN_PROGRESS);
        session.setStartedAt(LocalDateTime.now());
        sessionRepository.save(session);

        wsHandler.sendGameStart(code);
        log.info("Session [{}] started by [{}]", code, username);
        return toResponse(session);
    }

    // ── Submit result ───────────────────────────────────────────────────────
    @Transactional
    public void submitResult(String username, SubmitResultRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        GameSession session = sessionRepository.findByCode(req.getSessionCode())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        MatchHistory history = MatchHistory.builder()
                .user(user)
                .session(session)
                .score(req.getScore())
                .kills(req.getKills())
                .deaths(req.getDeaths())
                .winner(req.isWinner())
                .durationSeconds(req.getDurationSeconds())
                .build();
        matchHistoryRepository.save(history);

        user.setTotalScore(user.getTotalScore()   + req.getScore());
        user.setGamesPlayed(user.getGamesPlayed() + 1);
        user.setKills(user.getKills()             + req.getKills());
        user.setDeaths(user.getDeaths()           + req.getDeaths());
        if (req.isWinner()) user.setWins(user.getWins() + 1);
        userRepository.save(user);

        if (session.getCreator().getUsername().equals(username)
                && session.getStatus() == GameSession.GameStatus.IN_PROGRESS) {
            session.setStatus(GameSession.GameStatus.FINISHED);
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);
        }
        log.info("Result by [{}] session [{}] score={}", username, req.getSessionCode(), req.getScore());
    }

    // ── Queries ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<SessionResponse> getOpenSessions() {
        return sessionRepository
                .findByStatusOrderByCreatedAtDesc(GameSession.GameStatus.WAITING)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SessionResponse getSessionByCode(String code) {
        return sessionRepository.findByCode(code.toUpperCase())
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + code));
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard() {
        List<User> users = userRepository.findTopByOrderByTotalScoreDesc();
        int[] rank = {1};
        return users.stream().map(u -> {
            LeaderboardEntry e = LeaderboardEntry.builder()
                    .rank(rank[0]++)
                    .userId(u.getId())
                    .username(u.getUsername())
                    .totalScore(u.getTotalScore())
                    .gamesPlayed(u.getGamesPlayed())
                    .wins(u.getWins())
                    .kills(u.getKills())
                    .winRate(u.getGamesPlayed() > 0
                            ? (double) u.getWins() / u.getGamesPlayed() * 100 : 0)
                    .build();
            return e;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MatchHistoryResponse> getMatchHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return matchHistoryRepository.findByUserIdOrderByPlayedAtDesc(user.getId())
                .stream().map(m -> MatchHistoryResponse.builder()
                        .id(m.getId())
                        .sessionCode(m.getSession().getCode())
                        .sessionName(m.getSession().getName())
                        .score(m.getScore())
                        .kills(m.getKills())
                        .deaths(m.getDeaths())
                        .winner(m.getWinner())
                        .durationSeconds(m.getDurationSeconds())
                        .playedAt(m.getPlayedAt())
                        .build()
                ).collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++)
                sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
            code = sb.toString();
        } while (sessionRepository.findByCode(code).isPresent());
        return code;
    }

    private SessionResponse toResponse(GameSession s) {
        return SessionResponse.builder()
                .id(s.getId())
                .code(s.getCode())
                .name(s.getName())
                .status(s.getStatus().name())
                .creatorUsername(s.getCreator().getUsername())
                .maxPlayers(s.getMaxPlayers())
                .currentPlayers(s.getCurrentPlayers())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
