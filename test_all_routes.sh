#!/bin/bash
echo "Testing ALL Religion Routes..."
echo "=============================="

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
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$route")
  if [ "$status" -eq 200 ]; then
    echo "✅ $status - $route"
  else
    echo "❌ $status - $route"
  fi
done

echo "=============================="
