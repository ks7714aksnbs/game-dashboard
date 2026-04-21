package com.doomplatform.websocket;

import com.doomplatform.security.JwtUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);

    private final JwtUtils jwtUtils;
    private final ObjectMapper objectMapper;

    private final Map<String, Map<String, WebSocketSession>> rooms        = new ConcurrentHashMap<>();
    private final Map<String, Map<String, PlayerState>>      playerStates = new ConcurrentHashMap<>();
    private final Map<String, String[]>                      sessionMeta  = new ConcurrentHashMap<>();

    public GameWebSocketHandler(JwtUtils jwtUtils, ObjectMapper objectMapper) {
        this.jwtUtils      = jwtUtils;
        this.objectMapper  = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String sessionCode = extractSessionCode(session);
        String token       = extractToken(session);

        if (token == null || !jwtUtils.validateToken(token)) {
            closeSession(session, "Unauthorized");
            return;
        }

        String username = jwtUtils.getUsernameFromToken(token);
        sessionMeta.put(session.getId(), new String[]{sessionCode, username});
        rooms.computeIfAbsent(sessionCode, k -> new ConcurrentHashMap<>()).put(username, session);

        PlayerState init = PlayerState.builder()
                .username(username).x(1.5).y(5.0).angle(0)
                .health(100).score(0).kills(0)
                .timestamp(System.currentTimeMillis())
                .build();
        playerStates.computeIfAbsent(sessionCode, k -> new ConcurrentHashMap<>()).put(username, init);

        log.info("Player [{}] joined room [{}]", username, sessionCode);
        broadcastToRoom(sessionCode, WsMessage.builder()
                .type("PLAYER_JOINED")
                .sessionCode(sessionCode)
                .username(username)
                .payload(Map.of("players", getPlayerList(sessionCode),
                                "message", username + " joined the game"))
                .build());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String[] meta = sessionMeta.get(session.getId());
        if (meta == null) return;
        String sessionCode = meta[0];
        String username    = meta[1];

        WsMessage msg;
        try {
            msg = objectMapper.readValue(message.getPayload(), WsMessage.class);
        } catch (Exception e) {
            log.warn("Bad WS message from {}: {}", username, e.getMessage());
            return;
        }

        String type = msg.getType();
        if (type == null) return;

        switch (type) {
            case "PLAYER_STATE" -> handlePlayerState(sessionCode, username, msg);
            case "SHOOT"        -> handleShoot(sessionCode, username, msg);
            case "GAME_EVENT"   -> handleGameEvent(sessionCode, username, msg);
            case "PING"         -> sendTo(session, WsMessage.builder().type("PONG").build());
            default             -> log.debug("Unknown WS type: {}", type);
        }
    }

    private void handlePlayerState(String sessionCode, String username, WsMessage msg) {
        try {
            PlayerState state = objectMapper.convertValue(msg.getPayload(), PlayerState.class);
            state.setUsername(username);
            state.setTimestamp(System.currentTimeMillis());
            playerStates.getOrDefault(sessionCode, Map.of()).put(username, state);

            broadcastToRoom(sessionCode, WsMessage.builder()
                    .type("STATE_UPDATE")
                    .sessionCode(sessionCode)
                    .payload(Map.of("players",
                            playerStates.getOrDefault(sessionCode, Map.of()).values()))
                    .build());
        } catch (Exception e) {
            log.warn("Failed to parse PlayerState: {}", e.getMessage());
        }
    }

    private void handleShoot(String sessionCode, String username, WsMessage msg) {
        broadcastToRoom(sessionCode, WsMessage.builder()
                .type("PLAYER_SHOT").sessionCode(sessionCode)
                .username(username).payload(msg.getPayload()).build());
    }

    private void handleGameEvent(String sessionCode, String username, WsMessage msg) {
        broadcastToRoom(sessionCode, WsMessage.builder()
                .type("GAME_EVENT").sessionCode(sessionCode)
                .username(username).payload(msg.getPayload()).build());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String[] meta = sessionMeta.remove(session.getId());
        if (meta == null) return;
        String sessionCode = meta[0];
        String username    = meta[1];

        Map<String, WebSocketSession> room = rooms.get(sessionCode);
        if (room != null) { room.remove(username); if (room.isEmpty()) rooms.remove(sessionCode); }
        Map<String, PlayerState> states = playerStates.get(sessionCode);
        if (states != null) { states.remove(username); if (states.isEmpty()) playerStates.remove(sessionCode); }

        log.info("Player [{}] left room [{}]", username, sessionCode);
        broadcastToRoom(sessionCode, WsMessage.builder()
                .type("PLAYER_LEFT").sessionCode(sessionCode).username(username)
                .payload(Map.of("players", getPlayerList(sessionCode))).build());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WS error {}: {}", session.getId(), exception.getMessage());
    }

    public void broadcastToRoom(String sessionCode, WsMessage message) {
        Map<String, WebSocketSession> room = rooms.get(sessionCode);
        if (room == null || room.isEmpty()) return;
        String json;
        try { json = objectMapper.writeValueAsString(message); }
        catch (Exception e) { log.error("Serialize error: {}", e.getMessage()); return; }
        TextMessage tm = new TextMessage(json);
        room.values().forEach(ws -> {
            if (ws.isOpen()) {
                try { synchronized (ws) { ws.sendMessage(tm); } }
                catch (IOException e) { log.warn("Send failed {}: {}", ws.getId(), e.getMessage()); }
            }
        });
    }

    private void sendTo(WebSocketSession session, WsMessage message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            synchronized (session) { session.sendMessage(new TextMessage(json)); }
        } catch (Exception e) { log.warn("Direct send failed: {}", e.getMessage()); }
    }

    private List<String> getPlayerList(String sessionCode) {
        Map<String, WebSocketSession> room = rooms.get(sessionCode);
        return room == null ? List.of() : new ArrayList<>(room.keySet());
    }

    private String extractSessionCode(WebSocketSession session) {
        String path = Objects.requireNonNull(session.getUri()).getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }

    private String extractToken(WebSocketSession session) {
        String query = session.getUri().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                if (param.startsWith("token=")) return param.substring(6);
            }
        }
        List<String> protocols = session.getHandshakeHeaders().get("Sec-WebSocket-Protocol");
        if (protocols != null && !protocols.isEmpty()) return protocols.get(0);
        return null;
    }

    private void closeSession(WebSocketSession session, String reason) {
        try { session.close(CloseStatus.NOT_ACCEPTABLE.withReason(reason)); }
        catch (IOException ignored) {}
    }

    public void sendGameStart(String sessionCode) {
        broadcastToRoom(sessionCode, WsMessage.builder()
                .type("GAME_START").sessionCode(sessionCode)
                .payload(Map.of("message", "Game is starting!")).build());
    }

    public void sendGameEnd(String sessionCode, List<PlayerState> finalScores) {
        broadcastToRoom(sessionCode, WsMessage.builder()
                .type("GAME_END").sessionCode(sessionCode)
                .payload(Map.of("scores", finalScores)).build());
    }

    public Map<String, PlayerState> getRoomStates(String sessionCode) {
        return playerStates.getOrDefault(sessionCode, Map.of());
    }
}
