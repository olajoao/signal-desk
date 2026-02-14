ARG SERVICE=api

# Shared dependency install
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/queue/package.json packages/queue/
RUN bun install --frozen-lockfile

# --- WEB BUILD ---
FROM node:20-slim AS web-build
WORKDIR /app
RUN npm install -g bun@1.3.6
COPY --from=deps /app .
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SENTRY_DSN
RUN cd apps/web && bun run build

# --- WEB PRODUCTION ---
FROM node:20-slim AS web
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --from=web-build /app/apps/web/public ./apps/web/public
COPY --from=web-build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]

# --- API ---
FROM oven/bun:1 AS api
WORKDIR /app
COPY --from=deps /app .
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN cd packages/db && bunx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "cd packages/db && bunx prisma migrate deploy && cd /app && bun apps/api/src/index.ts"]

# --- WORKER ---
FROM oven/bun:1 AS worker
WORKDIR /app
COPY --from=deps /app .
COPY packages/ packages/
COPY apps/worker/ apps/worker/
RUN cd packages/db && bunx prisma generate
CMD ["bun", "apps/worker/src/index.ts"]

# Select service via build arg
FROM ${SERVICE}
