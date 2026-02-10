import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, cleanDb, createTestUser, prisma } from "./setup.ts";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await cleanDb();
});

describe("Billing", () => {
  it("checkout returns 503 when Stripe not configured", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { authorization: `Bearer ${user.accessToken}` },
      payload: { planId: "pro" },
    });

    // Stripe isn't configured in test env
    expect(res.statusCode).toBe(503);
  });

  it("portal returns 503 when Stripe not configured", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "GET",
      url: "/billing/portal",
      headers: { authorization: `Bearer ${user.accessToken}` },
    });

    expect(res.statusCode).toBe(503);
  });

  it("webhook rejects missing signature", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/billing/webhook",
      payload: { type: "checkout.session.completed" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("free tier blocks events over limit", async () => {
    const user = await createTestUser(app);

    // Set usage to plan limit
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    await prisma.usage.create({
      data: {
        orgId: user.orgId,
        periodStart,
        periodEnd,
        eventsCount: 1001,
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${user.accessToken}` },
      payload: { type: "test_event" },
    });

    expect(res.statusCode).toBe(402);
    const body = JSON.parse(res.body);
    expect(body.code).toBe("LIMIT_EXCEEDED");
  });
});
