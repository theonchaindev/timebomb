#!/bin/bash
# Usage: ./reset-timer.sh [seconds]  (default 600)
SECONDS=${1:-600}
TS=$(python3 -c "import time; print(int(time.time() * 1000) + $SECONDS * 1000)")
TOKEN=$(gh auth token)
RESULT=$(curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"files\":{\"state.json\":{\"content\":\"{\\\"detonatesAt\\\":$TS,\\\"totalBuys\\\":0,\\\"totalSells\\\":0,\\\"totalAdded\\\":0,\\\"totalRemoved\\\":0,\\\"processed\\\":[]}\"}}" \
  "https://api.github.com/gists/03c70801f3de8a60d68319ede614efc1")
echo "Timer reset to $SECONDS seconds from now (detonatesAt: $TS)"
