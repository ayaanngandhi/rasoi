#!/usr/bin/env bash
# Rasoi starter — kills old services by port PID, starts backend then frontend.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Absolute path to the interpreter that actually has uvicorn/fastapi installed.
#
# This must NOT be bare `python3`. On this box `python3` resolves to Hermes' own
# bundled 3.14 toolchain, which has no uvicorn — so the backend died instantly and
# the frontend then returned 500s from its proxy (ECONNREFUSED to 127.0.0.1:8601).
# Baked in as an absolute path because systemd units inherit a minimal PATH and a
# bare `python3` there resolves differently again. /usr/bin/python3.12 has both
# fastapi and uvicorn installed.
PYTHON=/usr/bin/python3.12

kill_port() {
  local port="$1"
  local pids
  pids=$(ss -tlnp 2>/dev/null | awk -v pat=":${port}\$" '$4 ~ pat' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
  done
}

kill_port 8601
kill_port 8600

# Backend: FastAPI + uvicorn on 8601
cd "$ROOT/backend"
nohup "$PYTHON" -m uvicorn main:app --host 0.0.0.0 --port 8601 >> "$ROOT/backend/server.log" 2>&1 &

# Frontend: production Next.js on 8600 (never dev)
cd "$ROOT/frontend"
[ -d node_modules ] || npm install --no-audit --no-fund
[ -d .next ] || [ -d .next/production ] || npm run build
nohup npx next start -p 8600 >> "$ROOT/frontend/server.log" 2>&1 &

# Wait for a TCP port to start listening, up to 60s.
#
# A flat `sleep 3` is not enough. `npx next start` routinely takes longer than
# that to bind, and the old check then printed "Startup failed" and exited 1
# while uvicorn and next were still coming up — so systemd marked the unit
# failed even though Rasoi was serving normally a moment later. That is why
# `systemctl --user status rasoi` could say "failed" while the site worked.
wait_for_port() {
  local port="$1"
  local deadline=$((SECONDS + 60))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if ss -tln 2>/dev/null | awk '{print $4}' | grep -q ":${port}\$"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

ok=1
for p in 8601 8600; do
  if wait_for_port "$p"; then
    echo "port $p: UP"
  else
    echo "port $p: DOWN (not listening after 60s)"
    ok=0
  fi
done
[ "$ok" = "1" ] && echo "Rasoi is running: http://127.0.0.1:8600" || { echo "Startup failed — check backend/server.log and frontend/server.log"; exit 1; }
