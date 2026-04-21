package com.doomplatform.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

public class GameDtos {

    // ── CreateSessionRequest ───────────────────────────────────────────────
    public static class CreateSessionRequest {
        @NotBlank @Size(min = 3, max = 60) private String  name;
        @Min(2) @Max(8)                    private Integer maxPlayers;

        public CreateSessionRequest() {}
        public String  getName()       { return name; }
        public Integer getMaxPlayers() { return maxPlayers; }
        public void setName(String v)        { this.name = v; }
        public void setMaxPlayers(Integer v) { this.maxPlayers = v; }
    }

    // ── JoinSessionRequest ─────────────────────────────────────────────────
    public static class JoinSessionRequest {
        @NotBlank @Size(min = 8, max = 8) private String code;

        public JoinSessionRequest() {}
        public String getCode() { return code; }
        public void setCode(String v) { this.code = v; }
    }

    // ── SessionResponse ────────────────────────────────────────────────────
    public static class SessionResponse {
        private Long          id;
        private String        code;
        private String        name;
        private String        status;
        private String        creatorUsername;
        private int           maxPlayers;
        private int           currentPlayers;
        private LocalDateTime createdAt;

        public SessionResponse() {}
        public Long          getId()              { return id; }
        public String        getCode()            { return code; }
        public String        getName()            { return name; }
        public String        getStatus()          { return status; }
        public String        getCreatorUsername() { return creatorUsername; }
        public int           getMaxPlayers()      { return maxPlayers; }
        public int           getCurrentPlayers()  { return currentPlayers; }
        public LocalDateTime getCreatedAt()       { return createdAt; }

        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private final SessionResponse r = new SessionResponse();
            public Builder id(Long v)               { r.id              = v; return this; }
            public Builder code(String v)           { r.code            = v; return this; }
            public Builder name(String v)           { r.name            = v; return this; }
            public Builder status(String v)         { r.status          = v; return this; }
            public Builder creatorUsername(String v){ r.creatorUsername = v; return this; }
            public Builder maxPlayers(int v)        { r.maxPlayers      = v; return this; }
            public Builder currentPlayers(int v)    { r.currentPlayers  = v; return this; }
            public Builder createdAt(LocalDateTime v){ r.createdAt      = v; return this; }
            public SessionResponse build()          { return r; }
        }
    }

    // ── SubmitResultRequest ────────────────────────────────────────────────
    public static class SubmitResultRequest {
        @NotBlank private String  sessionCode;
        private int     score;
        private int     kills;
        private int     deaths;
        private boolean winner;
        private int     durationSeconds;

        public SubmitResultRequest() {}
        public String  getSessionCode()     { return sessionCode; }
        public int     getScore()           { return score; }
        public int     getKills()           { return kills; }
        public int     getDeaths()          { return deaths; }
        public boolean isWinner()           { return winner; }
        public int     getDurationSeconds() { return durationSeconds; }
        public void setSessionCode(String v)    { this.sessionCode = v; }
        public void setScore(int v)             { this.score = v; }
        public void setKills(int v)             { this.kills = v; }
        public void setDeaths(int v)            { this.deaths = v; }
        public void setWinner(boolean v)        { this.winner = v; }
        public void setDurationSeconds(int v)   { this.durationSeconds = v; }
    }

    // ── LeaderboardEntry ───────────────────────────────────────────────────
    public static class LeaderboardEntry {
        private int    rank;
        private Long   userId;
        private String username;
        private int    totalScore;
        private int    gamesPlayed;
        private int    wins;
        private int    kills;
        private double winRate;

        public LeaderboardEntry() {}
        public int    getRank()        { return rank; }
        public Long   getUserId()      { return userId; }
        public String getUsername()    { return username; }
        public int    getTotalScore()  { return totalScore; }
        public int    getGamesPlayed() { return gamesPlayed; }
        public int    getWins()        { return wins; }
        public int    getKills()       { return kills; }
        public double getWinRate()     { return winRate; }

        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private final LeaderboardEntry e = new LeaderboardEntry();
            public Builder rank(int v)        { e.rank        = v; return this; }
            public Builder userId(Long v)     { e.userId      = v; return this; }
            public Builder username(String v) { e.username    = v; return this; }
            public Builder totalScore(int v)  { e.totalScore  = v; return this; }
            public Builder gamesPlayed(int v) { e.gamesPlayed = v; return this; }
            public Builder wins(int v)        { e.wins        = v; return this; }
            public Builder kills(int v)       { e.kills       = v; return this; }
            public Builder winRate(double v)  { e.winRate     = v; return this; }
            public LeaderboardEntry build()   { return e; }
        }
    }

    // ── MatchHistoryResponse ───────────────────────────────────────────────
    public static class MatchHistoryResponse {
        private Long          id;
        private String        sessionCode;
        private String        sessionName;
        private int           score;
        private int           kills;
        private int           deaths;
        private boolean       winner;
        private int           durationSeconds;
        private LocalDateTime playedAt;

        public MatchHistoryResponse() {}
        public Long          getId()              { return id; }
        public String        getSessionCode()     { return sessionCode; }
        public String        getSessionName()     { return sessionName; }
        public int           getScore()           { return score; }
        public int           getKills()           { return kills; }
        public int           getDeaths()          { return deaths; }
        public boolean       isWinner()           { return winner; }
        public int           getDurationSeconds() { return durationSeconds; }
        public LocalDateTime getPlayedAt()        { return playedAt; }

        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private final MatchHistoryResponse r = new MatchHistoryResponse();
            public Builder id(Long v)               { r.id              = v; return this; }
            public Builder sessionCode(String v)    { r.sessionCode     = v; return this; }
            public Builder sessionName(String v)    { r.sessionName     = v; return this; }
            public Builder score(int v)             { r.score           = v; return this; }
            public Builder kills(int v)             { r.kills           = v; return this; }
            public Builder deaths(int v)            { r.deaths          = v; return this; }
            public Builder winner(boolean v)        { r.winner          = v; return this; }
            public Builder durationSeconds(int v)   { r.durationSeconds = v; return this; }
            public Builder playedAt(LocalDateTime v){ r.playedAt        = v; return this; }
            public MatchHistoryResponse build()     { return r; }
        }
    }
}
