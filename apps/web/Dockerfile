FROM node:20-alpine AS base

# Install bun
RUN npm install -g bun@1.3.6

WORKDIR /app

# Copy workspace manifests
COPY package.json bun.lock turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

# Install deps
RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

# Build
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SENTRY_DSN
RUN bun run build --filter=@signaldesk/web

# Production
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g bun@1.3.6

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
