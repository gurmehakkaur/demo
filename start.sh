#!/bin/sh
set -e

echo "Starting BorderPass..."

# Backend on port 3001 (background)
node /app/backend/server.js &

# Frontend on port 3000 (foreground — this is what Railway health-checks)
exec env HOSTNAME=0.0.0.0 node /app/frontend/server.js
