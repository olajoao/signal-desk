FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace root
COPY package.json bun.lock turbo.json ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/queue/package.json packages/queue/
COPY apps/api/package.json apps/api/

# Install deps
RUN bun install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma client
RUN cd packages/db && bunx prisma generate

EXPOSE 3001

# Migrate + start
CMD ["sh", "-c", "cd packages/db && bunx prisma migrate deploy && cd /app && bun apps/api/src/index.ts"]
