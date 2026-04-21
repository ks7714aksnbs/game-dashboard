package com.doomplatform.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "match_history")
public class MatchHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @Column(nullable = false) private Integer score           = 0;
    @Column(nullable = false) private Integer kills           = 0;
    @Column(nullable = false) private Integer deaths          = 0;
    @Column(nullable = false) private Boolean winner          = false;
    @Column(nullable = false) private Integer durationSeconds = 0;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime playedAt;

    public MatchHistory() {}

    public Long          getId()              { return id; }
    public User          getUser()            { return user; }
    public GameSession   getSession()         { return session; }
    public Integer       getScore()           { return score; }
    public Integer       getKills()           { return kills; }
    public Integer       getDeaths()          { return deaths; }
    public Boolean       getWinner()          { return winner; }
    public Integer       getDurationSeconds() { return durationSeconds; }
    public LocalDateTime getPlayedAt()        { return playedAt; }

    public void setUser(User v)                { this.user = v; }
    public void setSession(GameSession v)      { this.session = v; }
    public void setScore(Integer v)            { this.score = v; }
    public void setKills(Integer v)            { this.kills = v; }
    public void setDeaths(Integer v)           { this.deaths = v; }
    public void setWinner(Boolean v)           { this.winner = v; }
    public void setDurationSeconds(Integer v)  { this.durationSeconds = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final MatchHistory m = new MatchHistory();
        public Builder user(User v)               { m.user = v;             return this; }
        public Builder session(GameSession v)     { m.session = v;          return this; }
        public Builder score(Integer v)           { m.score = v;            return this; }
        public Builder kills(Integer v)           { m.kills = v;            return this; }
        public Builder deaths(Integer v)          { m.deaths = v;           return this; }
        public Builder winner(Boolean v)          { m.winner = v;           return this; }
        public Builder durationSeconds(Integer v) { m.durationSeconds = v;  return this; }
        public MatchHistory build()               { return m; }
    }
}
