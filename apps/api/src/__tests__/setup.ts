import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import authPlugin from "../plugins/auth.ts";
import { authRoutes } from "../routes/auth.ts";
import { eventRoutes } from "../routes/events.ts";
import { ruleRoutes } from "../routes/rules.ts";
import { notificationRoutes } from "../routes/notifications.ts";
import { apiKeyRoutes } from "../routes/api-keys.ts";
import { usageRoutes } from "../routes/usage.ts";
import { billingRoutes } from "../routes/billing.ts";
import { prisma } from "@signaldesk/db";

const JWT_SECRET = "test-secret-key";

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors);
  await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: "15m" },
    cookie: { cookieName: "access_token", signed: false },
  });
  await app.register(cookie);
  await app.register(websocket);

  // Raw body parser for webhook tests
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        const json = JSON.parse(body as string);
        (req as unknown as Record<string, string>).rawBody = body as string;
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(authPlugin);
  await app.register(eventRoutes);
  await app.register(ruleRoutes);
  await app.register(notificationRoutes);
  await app.register(apiKeyRoutes);
  await app.register(usageRoutes);
  await app.register(billingRoutes);

  return app;
}

export async function cleanDb() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.event.deleteMany(),
    prisma.rule.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.usage.deleteMany(),
    prisma.systemAlert.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.invite.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Ensure "free" plan exists (required FK for Organization.planId default)
  await prisma.plan.upsert({
    where: { id: "free" },
    update: {},
    create: {
      id: "free",
      name: "free",
      displayName: "Free",
      eventsPerMonth: 100,
      rulesLimit: 3,
      retentionDays: 7,
      rateLimit: 30,
    },
  });
}

interface TestUser {
  accessToken: string;
  refreshToken: string;
  userId: string;
  orgId: string;
  email: string;
}

let counter = 0;

export async function createTestUser(app: ReturnType<typeof Fastify>): Promise<TestUser> {
  counter++;
  const email = `test${counter}-${Date.now()}@test.com`;
  const password = "testpassword123";
  const name = `Test User ${counter}`;
  const orgName = `Test Org ${counter}`;

  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email, password, name, orgName },
  });

  const body = JSON.parse(res.body);
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.user.id,
    orgId: body.org.id,
    email,
  };
}

export function generateJwt(app: ReturnType<typeof Fastify>, payload: { userId: string; orgId: string; role: string }) {
  return (app as ReturnType<typeof Fastify> & { jwt: { sign: (p: Record<string, string>) => string } }).jwt.sign(payload);
}

export { prisma };
