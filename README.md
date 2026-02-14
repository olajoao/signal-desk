# SignalDesk

Real-time activity, alerts & insights platform for modern engineering teams.

Monitor events, define smart rules, and get instant notifications — all in one place. Think: GitHub notifications + Datadog events + Slack alerts — simplified and opinionated.

## Architecture

```
┌─────────────┐     ┌──────────────┐
│   Frontend  │◄───►│  API Gateway │
│  (Next.js)  │     │  (Fastify)   │
└─────────────┘     └──────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────────────┐   ┌────────────────┐  ┌─────────────────┐
│ Event Ingest │   │ Rule Engine    │  │ Notification    │
│ POST /events │   │ Sliding Window │  │ Service         │
└──────┬───────┘   └──────┬─────────┘  └────────┬────────┘
       │                  │                     │
       ▼                  ▼                     ▼
┌─────────────┐   ┌──────────────┐     ┌─────────────────┐
│ Redis Queue │   │ PostgreSQL   │     │ WebSocket       │
│ (BullMQ)    │   │ (Prisma)     │     │ Broadcast       │
└─────────────┘   └──────────────┘     └─────────────────┘
       │
       ▼
┌─────────────┐
│ Worker Pool │
└─────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Monorepo | Turborepo |
| Frontend | Next.js 15, React 19, Tailwind v4, TanStack Query |
| Backend | Fastify, WebSocket |
| Database | PostgreSQL, Prisma ORM |
| Queue | Redis, BullMQ |
| Validation | Zod |

## Features

- **Event Ingestion** — High-throughput API with rate limiting and schema validation
- **Rule Engine** — User-defined rules with sliding window, thresholds, and cooldowns
- **Async Processing** — BullMQ workers with configurable concurrency
- **Real-time UI** — WebSocket-powered live event feed, alert stream, and stat cards
- **API Key Auth** — Secure access with usage tracking

## Quick Start

```bash
# Start Postgres + Redis
docker compose up -d

# Install dependencies
bun install

# Setup database
cd packages/db && DATABASE_URL="postgresql://signaldesk:signaldesk@localhost:5432/signaldesk" bunx prisma db push

# Run all services
bun run dev
```

Services:
- Web: http://localhost:3000
- API: http://localhost:3001

## API

### Create API Key (bootstrap)
```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name":"my-key"}'
```

### Create Rule
```bash
curl -X POST http://localhost:3001/rules \
  -H "Authorization: Bearer sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Checkout failures",
    "eventType": "checkout_failed",
    "condition": "count_gte",
    "threshold": 5,
    "windowSeconds": 60,
    "cooldownSeconds": 120,
    "actions": [{"channel": "in_app", "config": {}}]
  }'
```

### Ingest Event
```bash
curl -X POST http://localhost:3001/events \
  -H "Authorization: Bearer sk_..." \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout_failed", "metadata": {"userId": "123"}}'
```

## Project Structure

```
signaldesk/
├─ apps/
│  ├─ api/          # Fastify gateway
│  ├─ worker/       # BullMQ processors
│  └─ web/          # Next.js dashboard
├─ packages/
│  ├─ shared/       # Zod schemas
│  ├─ db/           # Prisma client
│  └─ queue/        # BullMQ wrapper
└─ docker-compose.yml
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| BullMQ over Kafka | Simpler ops, sufficient for medium scale, Redis already needed for rate limiting |
| Fastify over Express | Better performance, native TypeScript, built-in validation hooks |
| Sliding window in Redis | O(log N) operations with sorted sets, automatic TTL cleanup |
| Monorepo with Turborepo | Shared types, atomic changes, parallel builds |

## Scaling Considerations

- **Horizontal scaling**: Stateless API + workers, scale independently
- **Event throughput**: Batch inserts, Redis pipeline commands
- **Rule evaluation**: Cache active rules, partition by event type
- **WebSocket**: Redis pub/sub for multi-instance broadcast

## Bugs Found & Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| WS connection always fails | `fp()` auth plugin applies `onRequest` globally; `/ws` not in `PUBLIC_ROUTES` so upgrade rejected with 401 | Added `/ws` to `PUBLIC_ROUTES` |
| "WebSocket closed before connection established" warning | React StrictMode double-invokes effects; cleanup called `.close()` on CONNECTING socket | Defer close via `onopen` callback, null out handlers on cleanup |

## Future Improvements

- [x] JWT authentication (access + refresh tokens, org-scoped)
- [ ] Slack/Email notification channels
- [ ] ClickHouse for event analytics
- [ ] Terraform + CI/CD pipeline
- [ ] Multi-tenant isolation
- [ ] Backpressure handling
