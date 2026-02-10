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

describe("Events", () => {
  it("ingests event with auth", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${user.accessToken}` },
      payload: { type: "test_event", metadata: { key: "value" } },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.type).toBe("test_event");
  });

  it("rejects unauthenticated event", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/events",
      payload: { type: "test_event" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("enforces quota on free plan", async () => {
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
        eventsCount: 1000, // free plan limit
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${user.accessToken}` },
      payload: { type: "test_event" },
    });

    expect(res.statusCode).toBe(402);
  });

  it("lists events for org", async () => {
    const user = await createTestUser(app);

    // Create event
    await app.inject({
      method: "POST",
      url: "/events",
      headers: { authorization: `Bearer ${user.accessToken}` },
      payload: { type: "listed_event", metadata: {} },
    });

    const res = await app.inject({
      method: "GET",
      url: "/events",
      headers: { authorization: `Bearer ${user.accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.events.length).toBe(1);
    expect(body.events[0].type).toBe("listed_event");
  });
});
