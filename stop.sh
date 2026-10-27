#!/usr/bin/env bash
# Rasoi stopper — kills services by port PID.
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
echo "Rasoi services stopped."
