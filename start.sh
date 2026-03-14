#!/bin/sh
echo "Starting BorderPass..."

# Express backend — background
node /app/backend/server.js &

# Next.js frontend — foreground (Railway health-checks this)
exec node /app/frontend/server.js
