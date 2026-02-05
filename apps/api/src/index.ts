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
import { addClient, getClientCount } from "./ws/handler.ts";

const PORT = Number(process.env.API_PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

const fastify = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
});

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

  // WebSocket endpoint (before auth)
  fastify.get("/ws", { websocket: true }, (socket) => {
    addClient(socket);
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

  // Start server
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API server running on http://localhost:${PORT}`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
