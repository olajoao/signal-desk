import "./sentry.ts";
import { Sentry } from "./sentry.ts";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import authPlugin from "./plugins/auth.ts";
import { authRoutes } from "./routes/auth.ts";
import { eventRoutes } from "./routes/events.ts";
import { ruleRoutes } from "./routes/rules.ts";
import { notificationRoutes } from "./routes/notifications.ts";
import { apiKeyRoutes } from "./routes/api-keys.ts";
import { usageRoutes } from "./routes/usage.ts";
import { billingRoutes } from "./routes/billing.ts";
import { addClient, getClientCount } from "./ws/handler.ts";
import { prisma } from "@signaldesk/db";
import Redis from "ioredis";

const PORT = Number(process.env.API_PORT) || 3001;
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET env var is required");
  process.exit(1);
}
const JWT_SECRET: string = process.env.JWT_SECRET;

const isDev = process.env.NODE_ENV !== "production";
const healthRedis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    ...(isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : {}),
  },
});

// Raw body for Stripe webhook signature verification
fastify.addContentTypeParser(
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

async function start() {
  // Plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? ["http://localhost:3000"],
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  await fastify.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: "15m" },
    cookie: { cookieName: "access_token", signed: false },
  });

  await fastify.register(cookie);
  await fastify.register(websocket);

  // Request metrics — response time + status code
  fastify.addHook("onResponse", (request, reply, done) => {
    const elapsed = reply.elapsedTime;
    fastify.log.info(
      { method: request.method, url: request.url, statusCode: reply.statusCode, ms: Math.round(elapsed) },
      "request completed"
    );
    done();
  });

  // Health check (before auth)
  fastify.get("/health", async (_, reply) => {
    const checks: Record<string, "ok" | "error"> = { api: "ok" };

    // Check DB
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = "ok";
    } catch {
      checks.db = "error";
    }

    // Check Redis
    try {
      await healthRedis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }

    const healthy = Object.values(checks).every((v) => v === "ok");

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      wsClients: getClientCount(),
      checks,
    });
  });

  // WebSocket endpoint (JWT-authenticated)
  fastify.get("/ws", { websocket: true }, (socket, request) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      socket.send(JSON.stringify({ type: "error", payload: { message: "Token required" } }));
      socket.close(4401, "Unauthorized");
      return;
    }

    try {
      const decoded = fastify.jwt.verify<{ userId: string; orgId: string; role: string }>(token);
      addClient(decoded.orgId, socket);
    } catch {
      socket.send(JSON.stringify({ type: "error", payload: { message: "Invalid token" } }));
      socket.close(4401, "Unauthorized");
    }
  });

  // Auth routes (before auth plugin, some are public)
  await fastify.register(authRoutes);

  // Auth plugin (protects subsequent routes)
  await fastify.register(authPlugin);

  // Protected routes
  await fastify.register(eventRoutes);
  await fastify.register(ruleRoutes);
  await fastify.register(notificationRoutes);
  await fastify.register(apiKeyRoutes);
  await fastify.register(usageRoutes);
  await fastify.register(billingRoutes);

  // Sentry error handler
  fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    Sentry.captureException(error, { extra: { method: request.method, url: request.url } });
    fastify.log.error(error);
    reply.status(error.statusCode ?? 500).send({ error: error.message ?? "Internal server error" });
  });

  // Start server
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`API server running on port ${PORT}`);
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  const timeout = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, 15000);
  try {
    await fastify.close();
    clearTimeout(timeout);
    process.exit(0);
  } catch (err) {
    clearTimeout(timeout);
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
