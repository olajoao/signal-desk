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

