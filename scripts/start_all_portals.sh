#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

mkdir -p .logs

echo "======================================================"
echo "🚀 SPICEHUB ENTERPRISE: STARTING ALL PORTALS"
echo "======================================================"

# Clean up any stale processes on these ports first
for port in 5000 3001 3002 3003 3004 3005 3006 3007 3008; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Freeing port $port (PID $pids)..."
    kill -9 $pids 2>/dev/null || true
  fi
done

# 1. Start Backend API Server (:5000)
echo "Starting Backend API (:5000)..."
nohup npm run dev:backend > .logs/backend.log 2>&1 &
echo $! > .logs/backend.pid

# Wait for backend to be healthy
echo "Waiting for Backend API to initialize..."
for i in {1..30}; do
  if curl -s http://localhost:5000/api/v1/health | grep -q "UP"; then
    echo "✅ Backend API is UP on http://localhost:5000"
    break
  fi
  sleep 1
done

# 2. Start Frontend Portals
PORTALS=(
  "customer|dev:customer|3001|Customer Table Portal"
  "waiter|dev:waiter|3002|Waiter Mobile Portal"
  "kds|dev:kds|3003|Kitchen KDS Portal"
  "guest|dev:guest|3004|Guest Room Portal"
  "admin|dev:admin|3005|Hotel Admin ERP Portal"
  "superadmin|dev:superadmin|3006|Super Admin SaaS Portal"
  "cashier|dev:cashier|3007|Cashier POS Portal"
  "reception|dev:reception|3008|Reception Front Desk Portal"
)

for item in "${PORTALS[@]}"; do
  IFS="|" read -r key script port name <<< "$item"
  echo "Starting $name on :$port..."
  nohup npm run "$script" > ".logs/${key}.log" 2>&1 &
  echo $! > ".logs/${key}.pid"
done

echo ""
echo "Waiting for all frontend portals to listen..."
sleep 4

for item in "${PORTALS[@]}"; do
  IFS="|" read -r key script port name <<< "$item"
  for attempt in {1..15}; do
    if curl -s -I "http://localhost:$port" 2>&1 | grep -q "200 OK"; then
      echo "✅ $name is LIVE at http://localhost:$port"
      break
    fi
    sleep 1
  done
done

echo "======================================================"
echo "🎉 ALL SPICEHUB PORTALS ARE RUNNING"
echo "======================================================"
