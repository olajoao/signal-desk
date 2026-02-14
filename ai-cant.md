  1. External services setup

  Resend (email)
  - Sign up at resend.com
  - Create API key, verify your sending domain
  - Set RESEND_API_KEY and EMAIL_FROM in .env

  Stripe (billing)
  - Create products + prices in Stripe dashboard for Pro and Enterprise plans
  - Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID, STRIPE_ENTERPRISE_PRICE_ID
  - Create webhook endpoint pointing to https://yourdomain.com/billing/webhook
  - Subscribe to events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed

  Sentry (optional)
  - Create project at sentry.io (one for Node, one for Next.js)
  - Set SENTRY_DSN (api + worker), NEXT_PUBLIC_SENTRY_DSN (web), SENTRY_ORG, SENTRY_PROJECT

  2. Infrastructure / deploy

  Domain + DNS
  - Point yourdomain.com at your server (A record)
  - Point api.yourdomain.com at the API (or use a reverse proxy path)

  SSL/TLS
  - Use a reverse proxy (Caddy, nginx, Traefik) in front of docker-compose
  - Caddy is simplest — auto-HTTPS with Let's Encrypt:
  yourdomain.com {
      reverse_proxy web:3000
  }
  api.yourdomain.com {
      reverse_proxy api:3001
  }

  Deploy
  1. Copy .env.example to .env on server, fill all values
  2. Generate a strong JWT_SECRET: openssl rand -hex 32
  3. Run:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  4. Seed the plans table (first time only):
  docker compose exec api sh -c "cd packages/db && bunx prisma db seed"

  3. CI/CD deploy workflow

  You have CI (typecheck + test + build) but no CD. Options:
  - Simple: SSH + docker compose on push to main
  - Docker registry: Build images in CI, push to registry, pull on server
  - Platform: Deploy to Railway, Render, Fly.io, or AWS ECS

  4. Production .env checklist

  Before going live, verify:
  - JWT_SECRET — random 256-bit string, not the default
  - DATABASE_URL — production Postgres with SSL (?sslmode=require)
  - REDIS_URL — production Redis with password
  - CORS_ORIGINS — your actual domain(s), not localhost
  - APP_URL / NEXT_PUBLIC_API_URL / NEXT_PUBLIC_APP_URL — production URLs
  - NEXT_PUBLIC_WS_URL — wss://api.yourdomain.com (note wss://, not ws://)
  - RESEND_API_KEY — real key, domain verified
  - STRIPE_* — live keys (not test keys)
  - Postgres backups configured
  - Redis persistence configured (or accept volatile)

  5. Post-launch

  - Monitor Sentry for errors
  - Watch /health endpoint with uptime monitor (e.g. BetterStack, UptimeRobot)
  - Set up Postgres backups (pg_dump cron or managed DB)
  - Review rate limits for your plan tiers match real usage
