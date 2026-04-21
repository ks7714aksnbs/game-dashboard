package com.doomplatform.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank @Size(min = 3, max = 30)
    @Column(unique = true, nullable = false, length = 30)
    private String username;

    @NotBlank @Email
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank @Column(nullable = false)
    private String password;

    @Column(nullable = false) private Integer totalScore  = 0;
    @Column(nullable = false) private Integer gamesPlayed = 0;
    @Column(nullable = false) private Integer wins        = 0;
    @Column(nullable = false) private Integer kills       = 0;
    @Column(nullable = false) private Integer deaths      = 0;

    @CreationTimestamp @Column(updatable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "creator", fetch = FetchType.LAZY)
    private List<GameSession> createdSessions;
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<MatchHistory> matchHistories;

    public User() {}

    public Long    getId()          { return id; }
    public String  getUsername()    { return username; }
    public String  getEmail()       { return email; }
    public String  getPassword()    { return password; }
    public Integer getTotalScore()  { return totalScore; }
    public Integer getGamesPlayed() { return gamesPlayed; }
    public Integer getWins()        { return wins; }
    public Integer getKills()       { return kills; }
    public Integer getDeaths()      { return deaths; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setId(Long id)              { this.id = id; }
    public void setUsername(String v)       { this.username = v; }
    public void setEmail(String v)          { this.email = v; }
    public void setPassword(String v)       { this.password = v; }
    public void setTotalScore(Integer v)    { this.totalScore = v; }
    public void setGamesPlayed(Integer v)   { this.gamesPlayed = v; }
    public void setWins(Integer v)          { this.wins = v; }
    public void setKills(Integer v)         { this.kills = v; }
    public void setDeaths(Integer v)        { this.deaths = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final User u = new User();
        public Builder username(String v)  { u.username = v;    return this; }
        public Builder email(String v)     { u.email = v;       return this; }
        public Builder password(String v)  { u.password = v;    return this; }
        public Builder totalScore(int v)   { u.totalScore = v;  return this; }
        public Builder gamesPlayed(int v)  { u.gamesPlayed = v; return this; }
        public Builder wins(int v)         { u.wins = v;        return this; }
        public Builder kills(int v)        { u.kills = v;       return this; }
        public Builder deaths(int v)       { u.deaths = v;      return this; }
        public User build()                { return u; }
    }
}
