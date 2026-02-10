# SignalDesk TODO

## Phase 1 — Stripe Billing

- [x] Stripe fields on schema (Organization + Plan)
- [x] Stripe service — checkout, portal, overage, webhooks
- [x] Billing routes — checkout, portal, webhook
- [x] Billing UI — upgrade buttons, manage billing link
- [x] Overage reporting in worker reconciliation
- [x] Seed with Stripe price IDs
- [x] Billing schema in shared package

## Phase 2 — Production Hardening

- [x] `.env.example` + enforce `JWT_SECRET`
- [x] Error boundaries (error.tsx, not-found.tsx, global-error.tsx)
- [x] Mobile responsive sidebar (hamburger + overlay)
- [x] SEO: OG meta, sitemap.ts, robots.ts
- [x] Toast notification system
- [x] Confirm dialog component (reusable)
- [ ] Wire confirm dialogs to delete rule/key/member buttons

## Phase 3 — Slack + Email Channels

- [x] Expand channel enum (slack, email)
- [x] Slack processor (Block Kit)
- [x] Email alert processor (Resend)
- [x] Rule form: Slack URL + email inputs
- [x] Event processor channel assertion update

## Phase 4 — Deployment

- [x] Dockerfiles (API + worker, Bun-based)
- [x] Railway config
- [x] Vercel config
- [ ] Switch to `prisma migrate` (generate initial migration)

## Phase 5 — Testing + CI/CD

- [x] Vitest setup
- [x] Auth tests (5)
- [x] Event tests (4)
- [x] Rule matching tests (3)
- [x] Billing tests (4)
- [x] GitHub Actions CI

## Phase 6 — Launch Polish

- [x] Onboarding checklist
- [x] Pagination (notifications)
- [x] Usage warning banners (80%/100%)

## Remaining

- [ ] Wire confirm dialogs to destructive actions
- [ ] Generate initial Prisma migration
- [ ] Create Stripe products/prices in dashboard
- [ ] Set up Vercel + Railway projects
- [ ] Verify end-to-end flow in production
