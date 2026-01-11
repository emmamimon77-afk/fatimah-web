#!/bin/bash
echo "Testing Religion Routes on RENDER..."
echo "====================================="

BASE_URL="https://fatimah-web.onrender.com"
routes=(
  "/religions"
  "/religions/islam"
  "/religions/christianity"
  "/religions/judaism"
  "/religions/hinduism"
  "/religions/buddhism"
  "/religions/sikhism"
  "/religions/other"
  "/religions/scriptures"
)

for route in "${routes[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${route}")
  if [ "$status" -eq 200 ]; then
    echo "✅ $status - ${route}"
  else
    echo "❌ $status - ${route}"
  fi
done

echo "====================================="
echo "All should show ✅ 200"
