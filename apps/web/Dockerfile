FROM node:20-alpine AS base
WORKDIR /app

RUN npm install -g bun@1.3.6

# Copy all workspace manifests (bun.lock needs full workspace)
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/queue/package.json packages/queue/

RUN bun install --frozen-lockfile

# Copy only source needed for web
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SENTRY_DSN

RUN cd apps/web && bun run build

# Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
