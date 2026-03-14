# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# API URL is baked into the Next.js bundle at compile time
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# ── Frontend ──────────────────────────────────────────────────────────────────
WORKDIR /app/my-app

COPY my-app/package*.json ./
RUN npm ci

COPY my-app/ ./
RUN npm run build

# Fail loudly if standalone wasn't produced (catches missing output:"standalone")
RUN ls .next/standalone/server.js

# ── Backend ───────────────────────────────────────────────────────────────────
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# ── Root (concurrently) ───────────────────────────────────────────────────────
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 appuser

# concurrently
COPY --from=builder /app/package.json  ./
COPY --from=builder /app/node_modules  ./node_modules

# Backend
COPY --from=builder /app/backend       ./backend

# Frontend — standalone output + static assets + public
COPY --from=builder --chown=appuser:nodejs /app/my-app/.next/standalone/ ./frontend/
COPY --from=builder --chown=appuser:nodejs /app/my-app/.next/static/     ./frontend/.next/static/
COPY --from=builder --chown=appuser:nodejs /app/my-app/public/           ./frontend/public/

USER appuser

EXPOSE 3000 3001

CMD ["node_modules/.bin/concurrently", \
     "-n", "API,WEB", \
     "-c", "yellow,cyan", \
     "node backend/server.js", \
     "HOSTNAME=0.0.0.0 PORT=3000 node frontend/server.js"]
