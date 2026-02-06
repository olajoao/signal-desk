# SignalDesk TODO

- [x] Email service — integrate Resend for forgot-password + invite flows
- [x] WebSocket auth — JWT verify on connect, org-scoped broadcast
- [x] WebSocket token refresh — 4401 close triggers refreshAuth, token state update re-runs WS effect
- [x] Worker WS broadcast — Redis pub/sub bridge: worker publishes to `ws:broadcast:${orgId}`, API subscribes per-org and forwards to WS clients
- [ ] Tests — auth flows, RBAC, rate limiting
- [ ] Dashboard polish — real-time WebSocket integration in frontend
- [ ] CI/CD — GitHub Actions for typecheck/build/test on PRs
