package com.doomplatform.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "game_sessions")
public class GameSession {

    public enum GameStatus { WAITING, IN_PROGRESS, FINISHED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 8)
    private String code;

    @Column(nullable = false, length = 60)
    private String name;

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private GameStatus status = GameStatus.WAITING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(nullable = false) private Integer maxPlayers     = 4;
    @Column(nullable = false) private Integer currentPlayers = 0;
    private Integer durationSeconds = 0;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    @OneToMany(mappedBy = "session", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<MatchHistory> matchHistories;

    public GameSession() {}

    public Long          getId()             { return id; }
    public String        getCode()           { return code; }
    public String        getName()           { return name; }
    public GameStatus    getStatus()         { return status; }
    public User          getCreator()        { return creator; }
    public Integer       getMaxPlayers()     { return maxPlayers; }
    public Integer       getCurrentPlayers() { return currentPlayers; }
    public Integer       getDurationSeconds(){ return durationSeconds; }
    public LocalDateTime getCreatedAt()      { return createdAt; }
    public LocalDateTime getStartedAt()      { return startedAt; }
    public LocalDateTime getEndedAt()        { return endedAt; }

    public void setId(Long id)                    { this.id = id; }
    public void setCode(String v)                 { this.code = v; }
    public void setName(String v)                 { this.name = v; }
    public void setStatus(GameStatus v)           { this.status = v; }
    public void setCreator(User v)                { this.creator = v; }
    public void setMaxPlayers(Integer v)          { this.maxPlayers = v; }
    public void setCurrentPlayers(Integer v)      { this.currentPlayers = v; }
    public void setDurationSeconds(Integer v)     { this.durationSeconds = v; }
    public void setStartedAt(LocalDateTime v)     { this.startedAt = v; }
    public void setEndedAt(LocalDateTime v)       { this.endedAt = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final GameSession s = new GameSession();
        public Builder code(String v)            { s.code = v;            return this; }
        public Builder name(String v)            { s.name = v;            return this; }
        public Builder status(GameStatus v)      { s.status = v;          return this; }
        public Builder creator(User v)           { s.creator = v;         return this; }
        public Builder maxPlayers(Integer v)     { s.maxPlayers = v;      return this; }
        public Builder currentPlayers(Integer v) { s.currentPlayers = v;  return this; }
        public Builder durationSeconds(Integer v){ s.durationSeconds = v; return this; }
        public GameSession build()               { return s; }
    }
}
