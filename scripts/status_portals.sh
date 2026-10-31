#!/usr/bin/env bash
echo "======================================================"
echo "📊 SPICEHUB PORTALS HEALTH & STATUS"
echo "======================================================"
PORTALS=(
  "Backend API:5000:/api/v1/health"
  "Customer Table App:3001:/"
  "Waiter Mobile App:3002:/"
  "Kitchen KDS App:3003:/"
  "Guest Room App:3004:/"
  "Hotel Admin ERP:3005:/"
  "Super Admin SaaS:3006:/"
  "Cashier POS App:3007:/"
  "Reception Front Desk:3008:/"
)

all_ok=true

for item in "${PORTALS[@]}"; do
  IFS=":" read -r name port path <<< "$item"
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}${path}" 2>/dev/null || echo "DOWN")
  if [ "$code" = "200" ]; then
    printf "  %-25s  Port %-5s  [🟢 200 OK]\n" "$name" "$port"
  else
    printf "  %-25s  Port %-5s  [🔴 %s]\n" "$name" "$port" "$code"
    all_ok=false
  fi
done

echo "======================================================"
if [ "$all_ok" = true ]; then
  echo "✅ ALL PORTALS ARE HEALTHY AND ACCESSIBLE"
else
  echo "⚠️ SOME PORTALS ARE NOT RESPONDING"
fi
echo "======================================================"
