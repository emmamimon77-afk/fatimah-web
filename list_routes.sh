#!/bin/bash
echo "All Routes in Order:"
echo "===================="
grep -n "app\\.get\\|app\\.post\\|app\\.use" server.js | head -40
echo "===================="
