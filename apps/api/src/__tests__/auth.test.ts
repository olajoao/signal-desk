import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, cleanDb, createTestUser } from "./setup.ts";

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

describe("Auth", () => {
  it("signup creates user + org", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        email: "new@test.com",
        password: "password123",
        name: "Test",
        orgName: "My Org",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.email).toBe("new@test.com");
    expect(body.org.name).toBe("My Org");
    expect(body.org.role).toBe("owner");
  });

  it("login returns tokens", async () => {
    // Create user first
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        email: "login@test.com",
        password: "password123",
        name: "Test",
        orgName: "Login Org",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "login@test.com", password: "password123" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("refresh rotates token", async () => {
    const user = await createTestUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: user.refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).not.toBe(user.refreshToken);
  });

  it("rejects invalid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "fake@test.com", password: "wrong" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("rejects expired refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "rt_invalid_token_here" },
    });

    expect(res.statusCode).toBe(401);
  });
});
