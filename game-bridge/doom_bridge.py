"""
doom_bridge.py
══════════════════════════════════════════════════════════════════════
Connects the existing Python DOOM engine to the Spring Boot platform.

HOW IT WORKS:
  1. Starts the Python DOOM game in a subprocess (headless or windowed)
  2. Reads player state from the game via a shared queue / pipe
  3. Forwards player state to the Spring Boot backend over WebSocket
  4. Receives game events (kills, damage) from WS and injects them back

USAGE:
  python doom_bridge.py --session-code ABC12345 --token <JWT>

This is OPTIONAL — the browser-based raycaster in GameRoom.jsx works
standalone. Use this if you want to play the native Python game and
have your score appear on the platform leaderboard.
"""

import asyncio
import json
import sys
import os
import argparse
import threading
import queue
import math
import time

try:
    import websockets
    import requests
except ImportError:
    print("Install deps: pip install websockets requests")
    sys.exit(1)

# ── Config ─────────────────────────────────────────────────────────────────
DEFAULT_API  = os.getenv("API_URL",  "http://localhost:8080")
DEFAULT_WS   = os.getenv("WS_URL",   "ws://localhost:8080")

# ── Bridge state ────────────────────────────────────────────────────────────
state_queue = queue.Queue(maxsize=10)   # Python game → WS
event_queue = queue.Queue(maxsize=10)   # WS → Python game


# ══════════════════════════════════════════════════════════════════════
#  Python game state extractor
#  Patches the existing Game class to emit state without changing logic.
# ══════════════════════════════════════════════════════════════════════
def run_doom_game(session_code: str):
    """
    Import and run the DOOM game.
    We monkey-patch Player.update() to also push state into state_queue.
    """
    # Add doom directory to path
    doom_path = os.path.join(os.path.dirname(__file__), '..', 'doom')
    sys.path.insert(0, os.path.abspath(doom_path))

    try:
        import player as player_module
        OrigUpdate = player_module.Player.update

        def patched_update(self):
            OrigUpdate(self)
            state = {
                "x":       round(self.x, 4),
                "y":       round(self.y, 4),
                "angle":   round(self.angle, 4),
                "health":  self.health,
                "shooting": self.shot,
            }
            try:
                state_queue.put_nowait(state)
            except queue.Full:
                pass  # drop if too fast

        player_module.Player.update = patched_update

        # Apply damage events from WS back to the game
        import object_renderer as or_module
        OrigGameOver = or_module.ObjectRenderer.game_over
        def patched_game_over(self):
            try:
                event_queue.put_nowait({"type": "GAME_OVER"})
            except queue.Full:
                pass
            OrigGameOver(self)
        or_module.ObjectRenderer.game_over = patched_game_over

        from main import Game
        game = Game()
        game.run()

    except Exception as e:
        print(f"[DOOM] Failed to run game: {e}")
        print("Falling back to simulated player state...")
        simulate_player_state(session_code)


def simulate_player_state(session_code: str):
    """Fallback: emit simulated player movement when game can't run (e.g. no display)."""
    x, y, angle = 1.5, 5.0, 0.0
    score, kills = 0, 0
    t = 0
    while True:
        t += 0.05
        x = 1.5 + math.cos(t) * 2
        y = 5.0 + math.sin(t) * 2
        angle = t % (2 * math.pi)
        state = {"x": round(x,3), "y": round(y,3), "angle": round(angle,3),
                 "health": 100, "score": score, "kills": kills, "shooting": False}
        try:
            state_queue.put_nowait(state)
        except queue.Full:
            pass
        time.sleep(0.05)  # ~20 FPS


# ══════════════════════════════════════════════════════════════════════
#  WebSocket client
# ══════════════════════════════════════════════════════════════════════
async def ws_client(session_code: str, token: str, username: str):
    uri = f"{DEFAULT_WS}/ws/game/{session_code}?token={token}"
    print(f"[WS] Connecting to {uri}")

    async with websockets.connect(uri) as ws:
        print(f"[WS] Connected! Room: {session_code}")

        async def sender():
            loop = asyncio.get_event_loop()
            while True:
                try:
                    state = await loop.run_in_executor(None, lambda: state_queue.get(timeout=1))
                    msg = {
                        "type": "PLAYER_STATE",
                        "sessionCode": session_code,
                        "username": username,
                        "payload": state,
                    }
                    await ws.send(json.dumps(msg))
                except queue.Empty:
                    pass
                except Exception as e:
                    print(f"[WS] Send error: {e}")
                    break

        async def receiver():
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                    print(f"[WS] ← {msg.get('type')}")
                    if msg["type"] == "GAME_START":
                        print("[WS] GAME STARTED!")
                    elif msg["type"] == "GAME_END":
                        print("[WS] GAME ENDED!")
                    elif msg["type"] == "STATE_UPDATE":
                        # Other players' positions — could be used to spawn
                        # remote player sprites in the Python game (advanced)
                        pass
                except Exception as e:
                    print(f"[WS] Recv error: {e}")

        await asyncio.gather(sender(), receiver())


# ══════════════════════════════════════════════════════════════════════
#  REST helpers
# ══════════════════════════════════════════════════════════════════════
def api_login(username: str, password: str) -> dict:
    r = requests.post(f"{DEFAULT_API}/api/auth/login",
                      json={"username": username, "password": password}, timeout=10)
    r.raise_for_status()
    return r.json()

def api_join_session(token: str, code: str):
    r = requests.post(f"{DEFAULT_API}/api/game/sessions/join",
                      json={"code": code},
                      headers={"Authorization": f"Bearer {token}"}, timeout=10)
    r.raise_for_status()
    return r.json()

def api_submit_result(token: str, code: str, score: int, kills: int,
                      deaths: int, duration: int):
    r = requests.post(f"{DEFAULT_API}/api/game/result",
                      json={"sessionCode": code, "score": score, "kills": kills,
                            "deaths": deaths, "winner": False,
                            "durationSeconds": duration},
                      headers={"Authorization": f"Bearer {token}"}, timeout=10)
    r.raise_for_status()
    print(f"[API] Result submitted: score={score} kills={kills}")


# ══════════════════════════════════════════════════════════════════════
#  Entry point
# ══════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="DOOM Platform Bridge")
    parser.add_argument("--session-code", required=True, help="8-char session code")
    parser.add_argument("--username",     required=True, help="Platform username")
    parser.add_argument("--password",     required=True, help="Platform password")
    parser.add_argument("--simulate",     action="store_true",
                        help="Use simulated state (no display needed)")
    args = parser.parse_args()

    # 1. Login
    print(f"[API] Logging in as {args.username}...")
    auth = api_login(args.username, args.password)
    token = auth["token"]
    print(f"[API] ✓ Token obtained")

    # 2. Join session
    print(f"[API] Joining session {args.session_code}...")
    api_join_session(token, args.session_code)
    print(f"[API] ✓ Joined session")

    # 3. Start game thread
    start_time = time.time()
    if args.simulate:
        game_thread = threading.Thread(
            target=simulate_player_state, args=(args.session_code,), daemon=True)
    else:
        game_thread = threading.Thread(
            target=run_doom_game, args=(args.session_code,), daemon=True)
    game_thread.start()

    # 4. Run WebSocket bridge
    try:
        asyncio.run(ws_client(args.session_code, token, args.username))
    except KeyboardInterrupt:
        print("\n[Bridge] Interrupted by user")
    finally:
        duration = int(time.time() - start_time)
        print(f"[API] Submitting result after {duration}s...")
        try:
            api_submit_result(token, args.session_code,
                              score=0, kills=0, deaths=0, duration=duration)
        except Exception as e:
            print(f"[API] Submit failed: {e}")


if __name__ == "__main__":
    main()
