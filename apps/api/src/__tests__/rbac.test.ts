import { describe, it, expect } from "vitest";
import { requireRole, requireScope } from "../plugins/rbac.ts";

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    authType: "jwt",
    role: "member",
    apiKeyScopes: [] as string[],
    method: "GET",
    url: "/events",
    ...overrides,
  } as Parameters<ReturnType<typeof requireRole>>[0];
}

function mockReply() {
  const reply = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(body: unknown) {
      reply.body = body;
      return reply;
    },
  };
  return reply as unknown as Parameters<ReturnType<typeof requireRole>>[1];
}

// ── requireRole ──

describe("requireRole", () => {
  it("allows owner for admin-required route", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(mockRequest({ role: "owner" }), reply);
    expect(reply.statusCode).toBe(200);
  });

  it("allows admin for admin-required route", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(mockRequest({ role: "admin" }), reply);
    expect(reply.statusCode).toBe(200);
  });

  it("blocks member for admin-required route", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(mockRequest({ role: "member" }), reply);
    expect(reply.statusCode).toBe(403);
  });

  it("allows member for member-required route", async () => {
    const handler = requireRole("member");
    const reply = mockReply();
    await handler(mockRequest({ role: "member" }), reply);
    expect(reply.statusCode).toBe(200);
  });

  // API key scope checks
  it("allows api key with empty scopes (full access)", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(
      mockRequest({ authType: "api_key", apiKeyScopes: [], method: "POST", url: "/events" }),
      reply
    );
    expect(reply.statusCode).toBe(200);
  });

  it("allows api key with matching scope", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(
      mockRequest({
        authType: "api_key",
        apiKeyScopes: ["events:write"],
        method: "POST",
        url: "/events",
      }),
      reply
    );
    expect(reply.statusCode).toBe(200);
  });

  it("blocks api key with missing scope", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(
      mockRequest({
        authType: "api_key",
        apiKeyScopes: ["events:read"],
        method: "POST",
        url: "/events",
      }),
      reply
    );
    expect(reply.statusCode).toBe(403);
  });

  it("matches UUID params in URL for scope check", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(
      mockRequest({
        authType: "api_key",
        apiKeyScopes: ["rules:write"],
        method: "PATCH",
        url: "/rules/550e8400-e29b-41d4-a716-446655440000",
      }),
      reply
    );
    expect(reply.statusCode).toBe(200);
  });

  it("blocks api key on mismatched scope for UUID route", async () => {
    const handler = requireRole("admin");
    const reply = mockReply();
    await handler(
      mockRequest({
        authType: "api_key",
        apiKeyScopes: ["events:read"],
        method: "DELETE",
        url: "/rules/550e8400-e29b-41d4-a716-446655440000",
      }),
      reply
    );
    expect(reply.statusCode).toBe(403);
  });
});

// ── requireScope ──

describe("requireScope", () => {
  it("passes through for JWT users", async () => {
    const handler = requireScope("events:write");
    const reply = mockReply();
    await handler(mockRequest({ authType: "jwt" }), reply);
    expect(reply.statusCode).toBe(200);
  });

  it("passes through for api key with empty scopes", async () => {
    const handler = requireScope("events:write");
    const reply = mockReply();
    await handler(mockRequest({ authType: "api_key", apiKeyScopes: [] }), reply);
    expect(reply.statusCode).toBe(200);
  });

  it("allows api key with matching scope", async () => {
    const handler = requireScope("events:write");
    const reply = mockReply();
    await handler(mockRequest({ authType: "api_key", apiKeyScopes: ["events:write"] }), reply);
    expect(reply.statusCode).toBe(200);
  });

  it("blocks api key without matching scope", async () => {
    const handler = requireScope("events:write");
    const reply = mockReply();
    await handler(
      mockRequest({ authType: "api_key", apiKeyScopes: ["events:read"] }),
      reply
    );
    expect(reply.statusCode).toBe(403);
  });
});
