# 💀 DOOM Multiplayer Platform

A production-ready multiplayer game platform built on Spring Boot + React + PostgreSQL,
featuring a browser-based raycasting DOOM engine with real-time WebSocket multiplayer.

---

## 1. Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         DOOM PLATFORM                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │   FRONTEND  (Vercel)                                      │    │
│   │   React + Vite + Tailwind                                 │    │
│   │                                                           │    │
│   │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │    │
│   │  │ Login/Register│  │  Dashboard   │  │  Leaderboard  │  │    │
│   │  └──────────────┘  └──────────────┘  └───────────────┘  │    │
│   │  ┌─────────────────────────────────────────────────────┐ │    │
│   │  │          GameRoom — Browser Raycasting Engine        │ │    │
│   │  │  Canvas 2D · WASD+Mouse · NPC AI · Real-time sync   │ │    │
│   │  └─────────────────────────────────────────────────────┘ │    │
│   │                                                           │    │
│   │  Axios (REST) ─────────────┐                             │    │
│   │  WebSocket (WS) ───────────┤                             │    │
│   └────────────────────────────│─────────────────────────────┘    │
│                                │                                   │
│   ┌────────────────────────────▼─────────────────────────────┐    │
│   │   BACKEND  (Render)                                       │    │
│   │   Spring Boot 3.2 · Java 17 · Monolith                   │    │
│   │                                                           │    │
│   │  ┌───────────┐  ┌───────────┐  ┌────────────────────┐   │    │
│   │  │ /api/auth │  │/api/game  │  │  /api/leaderboard  │   │    │
│   │  └─────┬─────┘  └─────┬─────┘  └────────┬───────────┘   │    │
│   │        └──────────────┴──────────────────┘               │    │
│   │                   Service Layer                           │    │
│   │              Repository (Spring Data JPA)                 │    │
│   │                                                           │    │
│   │  ┌─────────────────────────────────────────────────────┐ │    │
│   │  │ /ws/game/{sessionCode}  — GameWebSocketHandler      │ │    │
│   │  │  Rooms Map · PlayerState Map · Broadcast             │ │    │
│   │  └─────────────────────────────────────────────────────┘ │    │
│   └────────────────────────────┬─────────────────────────────┘    │
│                                │ JDBC / JPA                        │
│   ┌────────────────────────────▼─────────────────────────────┐    │
│   │   DATABASE  (Supabase)                                    │    │
│   │   PostgreSQL 15                                           │    │
│   │   users · game_sessions · match_history                   │    │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                    │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │   OPTIONAL: Python Game Bridge (Local)                    │   │
│   │   doom_bridge.py — connects Python DOOM engine to WS      │   │
│   │   Monkey-patches Player.update() → state_queue → WS       │   │
│   └───────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. WebSocket Flow

```
BROWSER                          SPRING BOOT WS                    OTHER PLAYERS
  │                                    │                                 │
  │── WS connect /ws/game/CODE?token ─►│                                 │
  │                                    │── validates JWT                 │
  │◄── PLAYER_JOINED (player list) ───│── broadcasts to room ──────────►│
  │                                    │                                 │
  │── PLAYER_STATE {x,y,angle,hp} ───►│                                 │
  │                                    │── STATE_UPDATE (all players) ──►│
  │◄─────────────────────────────────────────────────────────────────────│
  │                                    │                                 │
  │── SHOOT {x,y,angle} ─────────────►│── PLAYER_SHOT broadcast ───────►│
  │                                    │                                 │
  │── GAME_EVENT {type:KILL} ────────►│── GAME_EVENT broadcast ─────────►│
  │                                    │                                 │
  │◄── GAME_START ─────────────────────│ (from creator clicking Start)   │
  │◄── GAME_END ───────────────────────│ (when host ends session)        │
  │                                    │                                 │
  │── WS close ──────────────────────►│── PLAYER_LEFT broadcast ────────►│
```

---

## 3. API Endpoints

| Method | Endpoint                        | Auth | Description                     |
|--------|---------------------------------|------|---------------------------------|
| POST   | /api/auth/register              | ✗    | Register new user               |
| POST   | /api/auth/login                 | ✗    | Login → JWT token               |
| GET    | /api/leaderboard                | ✗    | Top 50 players by score         |
| POST   | /api/game/sessions              | ✓    | Create a game session           |
| GET    | /api/game/sessions              | ✓    | List open (WAITING) sessions    |
| GET    | /api/game/sessions/{code}       | ✓    | Get session by 8-char code      |
| POST   | /api/game/sessions/join         | ✓    | Join session by code            |
| POST   | /api/game/sessions/{code}/start | ✓    | Start session (creator only)    |
| POST   | /api/game/result                | ✓    | Submit match result             |
| GET    | /api/game/history               | ✓    | Current user's match history    |
| WS     | /ws/game/{sessionCode}?token=   | JWT  | Real-time game WebSocket        |

---

## 4. Python Game Integration

### Option A — Browser Engine (Recommended, Zero Setup)
The `GameRoom.jsx` contains a complete raycasting engine ported from your Python code:
- Same map layout from `map.py`
- Same FOV, movement, wall-collision logic from `settings.py` + `player.py`
- NPC AI mirroring `npc.py` (pathfinding, attack, health)
- Runs natively in the browser canvas — no Python needed

### Option B — Python Bridge (Native DOOM Engine)
Connects the real Python game to the platform:

```bash
cd game-bridge
pip install -r requirements.txt

# Run the bridge (Python game opens in a window AND syncs to platform)
python doom_bridge.py \
  --session-code ABC12345 \
  --username your_username \
  --password your_password

# Headless simulation (no display, for testing)
python doom_bridge.py \
  --session-code ABC12345 \
  --username your_username \
  --password your_password \
  --simulate
```

The bridge monkey-patches `Player.update()` to emit state into a queue,
which is forwarded to the Spring Boot WebSocket without any changes to game logic.

---

## 5. Local Development Setup

### Prerequisites
- Java 17+  (`java -version`)
- Maven 3.9+ (`mvn -version`)
- Node 18+  (`node -v`)
- Git

### Step 1 — Clone & configure backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials and JWT secret
```

Set environment variables (Linux/Mac):
```bash
export DATABASE_URL="jdbc:postgresql://db.xxx.supabase.co:5432/postgres?sslmode=require"
export DB_USERNAME="postgres"
export DB_PASSWORD="your-password"
export JWT_SECRET="$(openssl rand -base64 64)"
export CORS_ORIGINS="http://localhost:5173"
```

### Step 2 — Run backend

```bash
cd backend
mvn spring-boot:run
# Backend starts at http://localhost:8080
# JPA auto-creates tables on first run
```

### Step 3 — Configure & run frontend

```bash
cd frontend
cp .env.example .env.local
# .env.local already points to localhost:8080 — no changes needed for local dev

npm install
npm run dev
# Frontend starts at http://localhost:5173
```

### Step 4 — Test it

```bash
# Register a user
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"t@t.com","password":"pass123"}' | python3 -m json.tool

# Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Create session
curl -s -X POST http://localhost:8080/api/game/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","maxPlayers":4}' | python3 -m json.tool

# Get leaderboard (no auth needed)
curl -s http://localhost:8080/api/leaderboard | python3 -m json.tool
```

---

## 6. Supabase Setup

1. Go to https://supabase.com → New Project
2. Choose a region close to your Render server (e.g. US East)
3. Note your **Database Password** (set during creation)
4. Go to **Settings → Database** and copy the **Connection String (URI)**
   - It looks like: `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres`
   - Convert to JDBC: `jdbc:postgresql://db.xxx.supabase.co:5432/postgres?sslmode=require`
5. (Optional) Run `schema.sql` in the Supabase SQL Editor for seed data

---

## 7. Render Deployment (Backend)

1. Push your code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo, set **Root Directory** to `backend`
4. Settings:
   - **Runtime**: Java
   - **Build Command**: `mvn clean package -DskipTests`
   - **Start Command**: `java -jar target/doom-platform-backend-1.0.0.jar`
5. Add **Environment Variables** in Render dashboard:
   ```
   DATABASE_URL    = jdbc:postgresql://db.xxx.supabase.co:5432/postgres?sslmode=require
   DB_USERNAME     = postgres
   DB_PASSWORD     = <your Supabase DB password>
   JWT_SECRET      = <output of: openssl rand -base64 64>
   CORS_ORIGINS    = https://your-app.vercel.app
   PORT            = 8080
   ```
6. Click **Deploy** — first deploy takes ~5 minutes
7. Note your Render URL: `https://doom-platform-xxxxx.onrender.com`

> **Note:** Free tier Render instances sleep after 15 min inactivity.
> The first request after sleep takes ~30s (cold start). Upgrade to paid to avoid.

---

## 8. Vercel Deployment (Frontend)

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite** (auto-detected)
4. Add **Environment Variables**:
   ```
   VITE_API_URL = https://doom-platform-xxxxx.onrender.com
   VITE_WS_URL  = wss://doom-platform-xxxxx.onrender.com
   ```
   > Use `wss://` (not `ws://`) for secure WebSocket in production
5. Click **Deploy** — takes ~1 minute
6. Visit your Vercel URL and register an account!

---

## 9. Folder Structure

```
doom-platform/
├── backend/
│   ├── pom.xml
│   ├── .env.example
│   ├── render.yaml
│   └── src/main/
│       ├── java/com/doomplatform/
│       │   ├── DoomPlatformApplication.java
│       │   ├── config/
│       │   │   ├── SecurityConfig.java
│       │   │   └── WebSocketConfig.java
│       │   ├── controller/
│       │   │   ├── AuthController.java
│       │   │   ├── GameController.java
│       │   │   └── LeaderboardController.java
│       │   ├── dto/
│       │   │   ├── AuthDtos.java
│       │   │   └── GameDtos.java
│       │   ├── entity/
│       │   │   ├── User.java
│       │   │   ├── GameSession.java
│       │   │   └── MatchHistory.java
│       │   ├── exception/
│       │   │   ├── GlobalExceptionHandler.java
│       │   │   ├── ResourceNotFoundException.java
│       │   │   └── ConflictException.java
│       │   ├── repository/
│       │   │   ├── UserRepository.java
│       │   │   ├── GameSessionRepository.java
│       │   │   └── MatchHistoryRepository.java
│       │   ├── security/
│       │   │   ├── JwtUtils.java
│       │   │   ├── JwtAuthFilter.java
│       │   │   └── UserDetailsServiceImpl.java
│       │   ├── service/
│       │   │   ├── AuthService.java
│       │   │   └── GameService.java
│       │   └── websocket/
│       │       ├── GameWebSocketHandler.java
│       │       ├── WsMessage.java
│       │       └── PlayerState.java
│       └── resources/
│           └── application.properties
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json
│   ├── .env.example
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   ├── client.js      ← Axios with JWT interceptor
│       │   └── index.js       ← Auth + Game + Leaderboard calls
│       ├── hooks/
│       │   └── useGameSocket.js ← WS hook with auto-reconnect
│       ├── store/
│       │   └── authStore.js   ← Zustand auth state
│       ├── components/
│       │   └── Layout.jsx     ← Navbar + Outlet
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Dashboard.jsx  ← Create/Join/History
│           ├── GameRoom.jsx   ← DOOM raycaster + WS sync
│           └── Leaderboard.jsx
│
├── game-bridge/
│   ├── doom_bridge.py         ← Python ↔ Spring Boot bridge
│   └── requirements.txt
│
└── schema.sql                 ← Manual DB schema + seed data
```

---

## 10. Common Errors & Fixes

### Backend

| Error | Fix |
|-------|-----|
| `Could not connect to database` | Check `DATABASE_URL` format — must be JDBC format with `?sslmode=require` |
| `Weak key` / JWT error | `JWT_SECRET` must be Base64 of ≥32 bytes. Use `openssl rand -base64 64` |
| `CORS policy blocked` | Add your frontend URL to `CORS_ORIGINS` env var (no trailing slash) |
| `Port 8080 already in use` | `lsof -ti:8080 \| xargs kill` or change `PORT` env var |
| Maven build fails | Verify Java 17: `java -version`, set `JAVA_HOME=/usr/lib/jvm/java-17-openjdk` |
| `schema-validation failed` | Set `spring.jpa.hibernate.ddl-auto=update` (already set in config) |

### Frontend

| Error | Fix |
|-------|-----|
| Axios 401 on all requests | Token expired or missing — log out and log in again |
| WS connects then immediately closes | JWT token invalid — ensure `?token=` param is correct |
| `VITE_API_URL is undefined` | Ensure `.env.local` exists (not `.env`) and restart `npm run dev` |
| Canvas mouse not captured | Click the canvas first — pointer lock requires a user gesture |
| Game runs slowly | Browser raycaster is CPU-bound. Close other tabs. `W/2` rays = 400 casts/frame |
| WebSocket in production uses `ws://` | Change `VITE_WS_URL` to `wss://` for HTTPS deployments |

### Supabase

| Error | Fix |
|-------|-----|
| SSL connection required | Add `?sslmode=require` to JDBC URL |
| Max connections exceeded | Free tier limit is 60. Use `spring.datasource.hikari.maximum-pool-size=5` |
| Table doesn't exist | JPA auto-creates on startup — check logs for SQL errors |

### Python Bridge

| Error | Fix |
|-------|-----|
| `pygame.error: No video mode has been set` | Run with `--simulate` flag on headless servers |
| `ModuleNotFoundError: doom` | Run bridge from project root, not from game-bridge/ |
| Bridge connects but no state appears | Ensure session code is correct and session exists |

---

## 11. Generating a Secure JWT_SECRET

```bash
# Linux / Mac
openssl rand -base64 64

# Python (any OS)
python3 -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(64)).decode())"
```

Copy the output exactly into your `JWT_SECRET` environment variable.

---

## 12. Quick Test Checklist

- [ ] Backend starts: `curl http://localhost:8080/api/leaderboard` returns `[]`
- [ ] Register works: POST /api/auth/register returns `{"token":"..."}`
- [ ] Login works: POST /api/auth/login returns `{"token":"..."}`
- [ ] Create session: POST /api/game/sessions with Bearer token returns session code
- [ ] Frontend loads: `http://localhost:5173` shows login screen
- [ ] Register in browser → redirected to dashboard
- [ ] Create a session → navigates to game room
- [ ] Canvas renders DOOM world (grey walls, floor, ceiling)
- [ ] Click canvas → mouse captured → WASD moves player
- [ ] Click to shoot → demons can be killed
- [ ] Open second browser tab, log in as different user, join same session
- [ ] Both players see each other moving (cyan sprite)
- [ ] Submit result → appears in match history and leaderboard
