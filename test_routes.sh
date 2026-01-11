#!/bin/bash
echo "Testing Religion Routes..."
echo "=========================="

routes=(
  "/religions"
  "/religions/islam" 
  "/religions/christianity"
  "/religions/judaism"
  "/religions/hinduism"
)

for route in "${routes[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$route")
  echo "$status - $route"
done

echo "=========================="
echo "All 200: ✅ Success"
echo "Any 404: ⚠️ Missing route"
