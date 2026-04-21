-- ══════════════════════════════════════════════════════════════════════════
--  DOOM PLATFORM — Database Schema
--  Run this in your Supabase SQL Editor (or let JPA auto-create it)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
    id               BIGSERIAL PRIMARY KEY,
    username         VARCHAR(30)  UNIQUE NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    password         VARCHAR(255) NOT NULL,
    total_score      INTEGER      NOT NULL DEFAULT 0,
    games_played     INTEGER      NOT NULL DEFAULT 0,
    wins             INTEGER      NOT NULL DEFAULT 0,
    kills            INTEGER      NOT NULL DEFAULT 0,
    deaths           INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(8)   UNIQUE NOT NULL,
    name             VARCHAR(60)  NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'WAITING',
    creator_id       BIGINT       NOT NULL REFERENCES users(id),
    max_players      INTEGER      NOT NULL DEFAULT 4,
    current_players  INTEGER      NOT NULL DEFAULT 0,
    duration_seconds INTEGER               DEFAULT 0,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    started_at       TIMESTAMP,
    ended_at         TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_history (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users(id),
    session_id       BIGINT       NOT NULL REFERENCES game_sessions(id),
    score            INTEGER      NOT NULL DEFAULT 0,
    kills            INTEGER      NOT NULL DEFAULT 0,
    deaths           INTEGER      NOT NULL DEFAULT 0,
    winner           BOOLEAN      NOT NULL DEFAULT FALSE,
    duration_seconds INTEGER      NOT NULL DEFAULT 0,
    played_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Indexes for leaderboard and history queries
CREATE INDEX IF NOT EXISTS idx_users_total_score    ON users(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status      ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_history_user_id      ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_session_id   ON match_history(session_id);

-- ── Sample seed data ───────────────────────────────────────────────────────
-- Passwords are BCrypt of "password123"
INSERT INTO users (username, email, password, total_score, games_played, wins, kills)
VALUES
  ('DoomSlayer',  'doom@example.com',    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBpwTvBiLQ9hSi', 4500, 12, 8, 87),
  ('CacoDemon',   'caco@example.com',    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBpwTvBiLQ9hSi', 3200, 10, 5, 62),
  ('UACSoldier',  'uac@example.com',     '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBpwTvBiLQ9hSi', 1800,  7, 2, 34)
ON CONFLICT DO NOTHING;
