#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "Stopping all SpiceHub portals..."
for port in 5000 3001 3002 3003 3004 3005 3006 3007 3008 3011 3012; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing processes on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
  fi
done

rm -f .logs/*.pid
echo "All portals stopped."
