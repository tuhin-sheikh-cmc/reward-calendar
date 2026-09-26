# ---- Build stage: install deps + compile API and web assets ----
FROM node:20-alpine AS build

WORKDIR /app

# Build tools needed to compile the better-sqlite3 native binding (musl).
RUN apk add --no-cache python3 make g++ libc-dev

COPY package.json package-lock.json ./
# The repo's "allowScripts" list permits the native post-install hooks
# (better-sqlite3, esbuild, @parcel/watcher).
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage: only what is needed to serve ----
FROM node:20-alpine

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=/data/rewards.db

WORKDIR /app

RUN addgroup -S puroshkar && adduser -S puroshkar -G puroshkar \
    && mkdir -p /data \
    && chown -R puroshkar:puroshkar /app /data

COPY --from=build --chown=puroshkar:puroshkar /app/node_modules ./node_modules
COPY --from=build --chown=puroshkar:puroshkar /app/dist ./dist
COPY --from=build --chown=puroshkar:puroshkar /app/public ./public
COPY --from=build --chown=puroshkar:puroshkar /app/package.json ./package.json

USER puroshkar

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/healthCheck || exit 1

CMD ["node", "dist/index.js"]