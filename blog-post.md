# Building SignalDesk: From Zero to Production in 10 Days (and 12 Deployment Fixes)

I built a real-time alerting platform from scratch. It ingests events, evaluates rules against sliding windows, and fires notifications through five different channels. Multi-tenant, billing-ready, the whole thing. The build phase was smooth. The deploy? That's where the comedy begins.

## What even is SignalDesk?

Think of it as a self-hosted PagerDuty meets Datadog alerts. You send events via API, define rules like "if `checkout_failed` happens 3+ times in 60 seconds, yell at me on Discord", and the system handles the rest.

The core loop is simple:

1. **Ingest** an event via REST API
2. **Queue** it for async processing (BullMQ)
3. **Evaluate** it against rules using Redis sorted sets as sliding windows
4. **Fire** notifications (webhook, Discord, Slack, email, in-app WebSocket)

The cool part is the sliding window. Instead of querying Postgres every time an event comes in ("how many `checkout_failed` in the last 60s?"), I use Redis sorted sets. Score is the timestamp, member is the event ID. To check a window, you just `ZREMRANGEBYSCORE` to prune stale entries and `ZCARD` to count. O(log N) and no DB pressure.

```typescript
async function getEventCountInWindow(orgId: string, eventType: string, windowSeconds: number) {
  const key = `org:${orgId}:events:${eventType}`;
  await redis.zremrangebyscore(key, 0, Date.now() - windowSeconds * 1000);
  return redis.zcard(key);
}
```

Cooldowns work the same way. A simple `SETEX` with the rule ID as key. If the key exists, skip. No DB queries during the hot path.

## The Stack

I went with what I know and like:

| Layer | Tech |
|-------|------|
| Runtime | Bun |
| Monorepo | Turborepo |
| Frontend | Next.js 15 + React 19 + TanStack Query |
| Backend | Fastify 5 |
| DB | Postgres + Prisma |
| Queue | Redis + BullMQ |
| Real-time | WebSockets (Fastify plugin) |
| Billing | Stripe |
| Email | Resend |

Monorepo has three apps (`api`, `web`, `worker`) and three shared packages (`db`, `shared`, `queue`). Turborepo handles the build graph. Bun handles everything else.

## The Build Phase: 9 Commits, 7600 Lines

Looking at the git log, the entire core was built in a single evening:

```
23:25:20  project scaffold: monorepo config, docker, docs
23:25:29  shared: zod schemas for events, rules, auth, api-keys
23:25:33  db: prisma schema, seed, migration helper (14 models)
23:25:37  queue: bullmq queues for events, notifications, cleanup
23:25:42  api: fastify server, auth, rbac, routes, rate limiting, websocket
23:25:47  worker: bullmq processors for events, notifications, cleanup
23:26:37  web: nextjs config, auth provider, api client, components, hooks
23:27:46  web auth: login, signup, password reset, invite accept pages
23:27:49  web pages: marketing, dashboard, rules, notifications, settings
```

9 commits in under 3 minutes of wall-clock time. From empty repo to a working multi-tenant SaaS with auth, RBAC, billing, WebSockets, 5 notification channels, and a full dashboard. 97 files changed, +7623 lines.

The Prisma schema alone has 13 models covering everything: users, orgs, memberships, events, rules, notifications, API keys (SHA256-hashed, scoped), refresh tokens, password reset tokens, invites, usage tracking, plans, and system alerts.

A few days later I fixed the forgot-password flow, wired up the WebSocket auth properly (Redis pub/sub for cross-instance broadcasting), and fixed a Fastify plugin registration order bug that was killing socket connections. Standard stuff.

## The Architecture Decisions That Mattered

**Multi-tenancy via `orgId` foreign keys.** Every core table (events, rules, notifications, API keys) has an `orgId`. Simple, effective, no schema-per-tenant madness.

**API keys are hashed.** SHA256 before storage, `sk_` prefix + 48 random hex chars. You see the full key once on creation, never again. This is the right way.

**Notifications are resilient.** Each channel has its own formatter. Discord gets rich embeds. Slack gets blocks. Email gets HTML with collapsible metadata. Retries use exponential backoff (3-5 attempts), and each notification tracks its status: `pending` > `sent` | `retrying` > `failed`. Every error message is captured per attempt.

**WebSocket auth uses ephemeral tickets.** Instead of putting JWTs in WebSocket URLs (which end up in server logs, proxy logs, browser history), the client fetches a 30-second ticket from `/auth/ws-ticket` and passes that. The ticket is verified and discarded.

**The event processor rolls back on failure.** If the DB transaction fails after adding an event to the Redis window, it removes the event from the window. No phantom counts.

```typescript
try {
  // ... process event, create notifications ...
} catch (err) {
  await removeEventFromWindow(orgId, type, eventId).catch(() => {});
  throw err;
}
```

## Then Came Deployment Day

February 13th, 9:29 PM. I pushed the "pre deploy setup" commit and pointed Railway at the repo.

What followed was approximately 4 hours of increasingly unhinged commits.

### Act 1: The Dockerfile Identity Crisis

I had a multi-stage Dockerfile. One `FROM` for each service (api, web, worker), with a final `FROM ${SERVICE}` that selects which stage to use via build arg. Elegant in theory.

```dockerfile
ARG SERVICE=api
# ... stages ...
FROM ${SERVICE}
```

Railway lets you set build args per service. Except I also had a `railway.toml` that was overriding everything. The web service was building the API image. Every time. I kept seeing `api COPY`, `api RUN prisma generate` in the web build logs and wondering why the web service was serving Fastify on port 3001.

Deleted `railway.toml`. Problem partially solved.

Then Railway cached the old config. I had to push dummy commits just to trigger redeployments:

```
e387ebe  chore: update readme
f8c1b40  chore: update readme to trigger redeploy (clear cache)
```

Eventually I gave up and deleted the Railway services entirely. Recreated them from scratch. Sometimes the best debugging technique is `rm -rf` with extra steps.

### Act 2: Prisma's Build-Time Tantrum

`prisma generate` needs a `DATABASE_URL`. Not to connect. Just to validate the schema. At build time. In a Dockerfile. Where there is no database.

The fix is gloriously dumb:

```dockerfile
RUN cd packages/db && DATABASE_URL="postgresql://x:x@localhost:5432/x" bunx prisma generate
```

A fake URL pointing nowhere, satisfying a validator that doesn't even use it. `x:x@localhost:5432/x`. Peak engineering.

### Act 3: CORS, My Old Friend

First request from the deployed frontend: blocked by CORS. Classic. Set `CORS_ORIGINS` to include the Railway web URL. Done.

But then.

### Act 4: The Cookie Apocalypse

Login worked. Tokens came back. Every subsequent request: 401 Unauthorized. Every. Single. One.

The auth was using HttpOnly cookies. `sameSite: "strict"`. The API lives on `signal-desk-api-production.up.railway.app`. The web lives on `signaldeskweb-production.up.railway.app`. Different subdomains. Different origins.

Changed `sameSite` to `"none"`. Still 401.

Here's the thing about modern browsers: they block third-party cookies across different domains. Period. It doesn't matter what your `sameSite` is. It doesn't matter if `credentials: "include"` is set. Two different `.up.railway.app` subdomains? Those are different registrable domains. No cookies for you.

The fix: abandon cookies entirely. Store tokens in localStorage. Send them via `Authorization: Bearer` header.

```typescript
// token-store.ts - the entire auth state management
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== "undefined") {
    accessToken = localStorage.getItem("access_token");
  }
  return accessToken;
}
```

Rewrote the entire API client layer. Removed `credentials: "include"` from every fetch call. Added `Authorization` headers everywhere. The API already supported both cookies and Bearer tokens (because the auth plugin checks both), so the backend needed zero changes.

Is localStorage vulnerable to XSS? Technically yes. But React escapes output by default, the tokens are short-lived (15 min access, 30 day refresh with rotation), and unless you're running `dangerouslySetInnerHTML` with user input, you're fine. Every major SPA in production does this.

### Act 5: The Rate Limit Wall

Got everything working. Logged in. Dashboard loaded. Clicked around for 30 seconds. 429 Too Many Requests.

The global Fastify rate limit was 100 requests per minute. The dashboard makes parallel TanStack Query requests on mount: events, rules, notifications, usage, API keys, members, billing. That's 7+ requests per page load. Add navigation and you're done in under a minute.

Bumped it to 300/min. There's also a per-org rate limit using Redis sliding windows (same technique as the event counter), which defaults to 60/min on the free plan. That one might need bumping too.

### Act 6: WebSocket Woes

The WebSocket wouldn't connect. `NEXT_PUBLIC_WS_URL` was still pointing to `ws://localhost:3001/ws`. In production you need `wss://` (secure WebSocket) and the actual Railway API domain.

`NEXT_PUBLIC_*` env vars in Next.js are baked at build time. You can't just set them as runtime env vars in Railway. You have to set them as build-time args and redeploy.

## The Commit Log Tells the Story

Here's the deployment phase, annotated:

```
21:29  feat: pre deploy setup          # optimism
22:44  fix: railway settings            # 1h15m later, trouble
22:48  fix: railway deploy config file  # 4 min later, more trouble
23:01  chore: try single dockerfile     # desperation
23:03  chore: fix prisma command        # the fake URL era begins
23:10  trigger: redeploy                # literally just a trigger commit
00:19  fix: wrong file path             # 1am, still going
00:27  chore: update readme             # cache clearing commit #1
00:34  chore: update readme             # cache clearing commit #2
00:50  fix: dummy database url          # prisma strikes again
01:15  chore: change sameSite config    # the cookie false hope
01:25  fix: jwt instead of cookies      # the cookie funeral
01:31  feat: increase rate limit        # the final boss
```

12 commits across 4 hours. From "pre deploy setup" (innocent, hopeful) to "increase request rate limit" (battle-scarred, 1:31 AM).

## What I'd Do Differently

**Custom domain from day one.** If `api.signaldesk.dev` and `app.signaldesk.dev` shared a parent domain, cookies would've worked. The entire localStorage migration was caused by Railway's default subdomain structure.

**Test the Dockerfile locally before deploying.** I was debugging Dockerfile issues through Railway's build logs with 3-minute feedback loops. `docker build --build-arg SERVICE=web .` locally would've caught the `railway.toml` override instantly.

**Set realistic rate limits early.** 100 req/min sounds generous until your SPA makes 10 parallel requests on every page transition.

## The Numbers

- **26 commits** total
- **97+ files** in the core build
- **13 database models** with proper indexes
- **5 notification channels** (webhook, Discord, Slack, email, in-app)
- **3 services** (API, web, worker)
- **1 evening** to build
- **1 painful night** to deploy
- **12 fix commits** to get it live
- **0 cookies** survived

SignalDesk is live. It processes events, evaluates rules against sliding windows, and yells at you through whatever channel you prefer. The code is clean. The architecture scales. And I will never use `sameSite: "strict"` across different Railway subdomains again.
