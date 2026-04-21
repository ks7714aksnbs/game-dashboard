#!/usr/bin/env bash
# ── Doom Platform — Local Dev Setup & Run ─────────────────────────────────
# Usage:
#   chmod +x setup.sh
#   ./setup.sh            # start both backend and frontend
#   ./setup.sh backend    # start backend only
#   ./setup.sh frontend   # start frontend only
#   ./setup.sh clear      # clear browser tokens (prints instructions)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# ── Step 1: ensure backend .env exists ──────────────────────────────────────
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "⚠  No backend/.env found — creating one from .env.example"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo ""
  echo "  ➜  Edit $BACKEND_DIR/.env and fill in:"
  echo "       DATABASE_URL, DB_USERNAME, DB_PASSWORD"
  echo "     (JWT_SECRET already has a dev default)"
  echo ""
fi

# ── Step 2: ensure frontend .env.local exists ────────────────────────────────
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
  echo "⚠  No frontend/.env.local found — creating with defaults"
  cat > "$FRONTEND_DIR/.env.local" << 'EOF'
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
EOF
fi

MODE="${1:-both}"

start_backend() {
  echo "🚀 Starting backend on :8080 …"
  cd "$BACKEND_DIR"
  # Export vars from .env so mvn can read them
  set -o allexport
  source .env 2>/dev/null || true
  set +o allexport
  mvn spring-boot:run
}

start_frontend() {
  echo "🎮 Starting frontend on :5173 …"
  cd "$FRONTEND_DIR"
  npm install --silent
  npm run dev
}

case "$MODE" in
  backend)  start_backend ;;
  frontend) start_frontend ;;
  clear)
    echo ""
    echo "To clear stale JWT tokens from your browser:"
    echo "  1. Open DevTools (F12) → Application → Local Storage → http://localhost:5173"
    echo "  2. Delete the 'token' and 'user' keys"
    echo "  OR run this in the browser console:"
    echo "     localStorage.removeItem('token'); localStorage.removeItem('user'); location.reload();"
    echo ""
    ;;
  both)
    # Run backend in background, frontend in foreground
    echo "Starting both services…"
    (start_backend &)
    sleep 3
    start_frontend
    ;;
esac
