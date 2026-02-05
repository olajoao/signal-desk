# SignalDesk

Real-time activity, alerts & insights platform.

## Stack

- **Runtime**: Bun
- **Monorepo**: Turborepo
- **Frontend**: Next.js 15 + React 19 + Tailwind v4 + TanStack Query
- **Backend**: Fastify + Prisma + BullMQ
- **Database**: PostgreSQL + Redis
- **Real-time**: WebSockets

## Quick Start

```bash
# Start infrastructure
docker compose up -d

# Install deps
bun install

# Generate Prisma client + push schema
cd packages/db && DATABASE_URL="postgresql://signaldesk:signaldesk@localhost:5432/signaldesk" bunx prisma db push

# Run all services
bun run dev
```

## Commands

```bash
bun run dev          # Start all services (turbo)
bun run build        # Build all
bun run typecheck    # Typecheck all
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| web     | 3000 | Next.js dashboard |
| api     | 3001 | Fastify API gateway |
| worker  | -    | BullMQ processors |

## Project Structure

```
apps/
  api/      # Fastify gateway (events, rules, notifications, API keys)
  worker/   # Event processor + notification sender
  web/      # Next.js dashboard

packages/
  shared/   # Zod schemas + types
  db/       # Prisma client
  queue/    # BullMQ queues
```

## API Endpoints

All endpoints require `Authorization: Bearer <api_key>` header.

```
POST /events          # Ingest event
GET  /events          # List events
POST /rules           # Create rule
GET  /rules           # List rules
PATCH /rules/:id      # Update rule
DELETE /rules/:id     # Delete rule
GET  /notifications   # List notifications
POST /api-keys        # Create API key
GET  /api-keys        # List API keys
DELETE /api-keys/:id  # Delete API key
GET  /ws              # WebSocket (no auth)
GET  /health          # Health check (no auth)
```

## Creating First API Key

```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name":"default"}'
```

Note: The first API key creation bypasses auth. After that, all requests need the key.

## Example: Create Rule + Send Event

```bash
# Create rule: alert if 'checkout_failed' >= 3 times in 60s
curl -X POST http://localhost:3001/rules \
  -H "Authorization: Bearer sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Checkout failures",
    "eventType": "checkout_failed",
    "condition": "count_gte",
    "threshold": 3,
    "windowSeconds": 60,
    "cooldownSeconds": 120,
    "actions": [{"channel": "in_app", "config": {}}]
  }'

# Send event
curl -X POST http://localhost:3001/events \
  -H "Authorization: Bearer sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout_failed", "metadata": {"userId": "123"}}'
```

## Bun Usage

Use Bun instead of Node.js:
- `bun <file>` instead of `node <file>`
- `bun install` instead of npm/yarn/pnpm install
- `bunx <pkg>` instead of `npx <pkg>`
- Bun auto-loads .env files
