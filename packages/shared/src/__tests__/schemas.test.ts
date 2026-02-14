import { describe, it, expect } from "vitest";
import {
  CreateEventSchema,
  CreateRuleSchema,
  UpdateRuleSchema,
  CreateApiKeySchema,
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../index.ts";

// ── Event Schema ──

describe("CreateEventSchema", () => {
  it("accepts valid event", () => {
    const result = CreateEventSchema.safeParse({ type: "checkout_failed" });
    expect(result.success).toBe(true);
  });

  it("accepts event with metadata", () => {
    const result = CreateEventSchema.safeParse({
      type: "checkout_failed",
      metadata: { userId: "123", amount: 99 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty type", () => {
    const result = CreateEventSchema.safeParse({ type: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const result = CreateEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("defaults metadata to empty object", () => {
    const result = CreateEventSchema.parse({ type: "test" });
    expect(result.metadata).toEqual({});
  });
});

// ── Rule Schema ──

describe("CreateRuleSchema", () => {
  const validRule = {
    name: "Test Rule",
    eventType: "checkout_failed",
    condition: "count_gte",
    threshold: 3,
    windowSeconds: 60,
    actions: [{ channel: "in_app", config: {} }],
  };

  it("accepts valid rule", () => {
    const result = CreateRuleSchema.safeParse(validRule);
    expect(result.success).toBe(true);
  });

  it("defaults cooldownSeconds to 60", () => {
    const result = CreateRuleSchema.parse(validRule);
    expect(result.cooldownSeconds).toBe(60);
  });

  it("defaults enabled to true", () => {
    const result = CreateRuleSchema.parse(validRule);
    expect(result.enabled).toBe(true);
  });

  it("rejects invalid condition", () => {
    const result = CreateRuleSchema.safeParse({ ...validRule, condition: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects threshold < 1", () => {
    const result = CreateRuleSchema.safeParse({ ...validRule, threshold: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects windowSeconds > 86400", () => {
    const result = CreateRuleSchema.safeParse({ ...validRule, windowSeconds: 86401 });
    expect(result.success).toBe(false);
  });

  it("rejects empty actions", () => {
    const result = CreateRuleSchema.safeParse({ ...validRule, actions: [] });
    expect(result.success).toBe(false);
  });

  // Channel-specific config validation
  it("accepts webhook with valid URL", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [{ channel: "webhook", config: { url: "https://example.com/hook" } }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects webhook without URL", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [{ channel: "webhook", config: {} }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects webhook with invalid URL", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [{ channel: "webhook", config: { url: "not-a-url" } }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts discord with valid webhook URL", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [
        { channel: "discord", config: { webhookUrl: "https://discord.com/api/webhooks/123/abc" } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects discord with non-discord URL", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [{ channel: "discord", config: { webhookUrl: "https://example.com/hook" } }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts slack with valid webhook URL", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [
        { channel: "slack", config: { webhookUrl: "https://hooks.slack.com/services/T00/B00/xxx" } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects slack with non-slack URL", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [{ channel: "slack", config: { webhookUrl: "https://example.com" } }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts email with valid address", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [{ channel: "email", config: { to: "user@example.com" } }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects email with invalid address", () => {
    const result = CreateRuleSchema.safeParse({
      ...validRule,
      actions: [{ channel: "email", config: { to: "not-an-email" } }],
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateRuleSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateRuleSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = UpdateRuleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects threshold < 1", () => {
    const result = UpdateRuleSchema.safeParse({ threshold: 0 });
    expect(result.success).toBe(false);
  });

  it("validates actions when provided", () => {
    const result = UpdateRuleSchema.safeParse({
      actions: [{ channel: "webhook", config: {} }],
    });
    expect(result.success).toBe(false); // missing url
  });
});

// ── API Key Schema ──

describe("CreateApiKeySchema", () => {
  it("accepts name only", () => {
    const result = CreateApiKeySchema.safeParse({ name: "my-key" });
    expect(result.success).toBe(true);
  });

  it("defaults scopes to empty array", () => {
    const result = CreateApiKeySchema.parse({ name: "my-key" });
    expect(result.scopes).toEqual([]);
  });

  it("accepts valid scopes", () => {
    const result = CreateApiKeySchema.safeParse({
      name: "my-key",
      scopes: ["events:read", "events:write"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid scope", () => {
    const result = CreateApiKeySchema.safeParse({
      name: "my-key",
      scopes: ["invalid:scope"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid expiresIn", () => {
    for (const expiresIn of ["never", "30d", "90d", "1y"]) {
      const result = CreateApiKeySchema.safeParse({ name: "key", expiresIn });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid expiresIn", () => {
    const result = CreateApiKeySchema.safeParse({ name: "key", expiresIn: "7d" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = CreateApiKeySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

// ── Auth Schema ──

describe("SignupSchema", () => {
  it("accepts valid signup", () => {
    const result = SignupSchema.safeParse({ email: "u@example.com", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = SignupSchema.safeParse({ email: "u@example.com", password: "1234567" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = SignupSchema.safeParse({ email: "not-email", password: "12345678" });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid login", () => {
    const result = LoginSchema.safeParse({ email: "u@example.com", password: "x" });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({ email: "u@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("ForgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = ForgotPasswordSchema.safeParse({ email: "u@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = ForgotPasswordSchema.safeParse({ email: "bad" });
    expect(result.success).toBe(false);
  });
});

describe("ResetPasswordSchema", () => {
  it("accepts valid reset", () => {
    const result = ResetPasswordSchema.safeParse({ token: "abc", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = ResetPasswordSchema.safeParse({ token: "abc", password: "1234567" });
    expect(result.success).toBe(false);
  });
});
