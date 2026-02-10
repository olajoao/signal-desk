import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import jwt from "@fastify/jwt";
import authPlugin from "./plugins/auth.ts";
import { authRoutes } from "./routes/auth.ts";
import { eventRoutes } from "./routes/events.ts";
import { ruleRoutes } from "./routes/rules.ts";
import { notificationRoutes } from "./routes/notifications.ts";
import { apiKeyRoutes } from "./routes/api-keys.ts";
import { usageRoutes } from "./routes/usage.ts";
import { billingRoutes } from "./routes/billing.ts";
import { addClient, getClientCount } from "./ws/handler.ts";

const PORT = Number(process.env.API_PORT) || 3001;
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET env var is required");
  process.exit(1);
}
const JWT_SECRET: string = process.env.JWT_SECRET;

const fastify = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
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
    origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await fastify.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: "15m" },
  });

  await fastify.register(websocket);

  // Health check (before auth)
  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    wsClients: getClientCount(),
  }));

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

  // Start server
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API server running on http://localhost:${PORT}`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
