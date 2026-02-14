FROM oven/bun:1 AS base
WORKDIR /app

# Copy all workspace manifests (bun.lock needs full workspace)
COPY package.json bun.lock turbo.json ./
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/queue/package.json packages/queue/

RUN bun install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY apps/worker/ apps/worker/

# Generate Prisma client
RUN cd packages/db && bunx prisma generate

CMD ["bun", "apps/worker/src/index.ts"]
