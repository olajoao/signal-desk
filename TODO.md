# SignalDesk TODO

- [x] Email service — integrate Resend for forgot-password + invite flows
- [x] WebSocket auth — JWT verify on connect, org-scoped broadcast
- [x] WebSocket token refresh — 4401 close triggers refreshAuth, token state update re-runs WS effect
- [x] Worker WS broadcast — Redis pub/sub bridge: worker publishes to `ws:broadcast:${orgId}`, API subscribes per-org and forwards to WS clients
- [ ] Tests — auth flows, RBAC, rate limiting
- [x] Dashboard polish — stat cards (usage/rules/notifications), live alert feed (API + WS merged), event type filter
- [x] WS auth bypass — `/ws` added to PUBLIC_ROUTES; `fp()` auth plugin was blocking WS upgrade (token is in query param, not header)
- [x] WS StrictMode fix — defer close on CONNECTING sockets, null handlers on cleanup to prevent stale state
- [ ] Tests — auth flows, RBAC, rate limiting
- [ ] CI/CD — GitHub Actions for typecheck/build/test on PRs
