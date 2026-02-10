import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { prisma } from "@signaldesk/db";
import { createHash } from "crypto";
import { checkRateLimit } from "../services/limits.ts";

declare module "fastify" {
  interface FastifyRequest {
    orgId: string;
    planId: string;
    authType: "api_key" | "jwt" | "none";
    userId: string;
    role: string;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; orgId: string; role: string };
    user: { userId: string; orgId: string; role: string };
  }
}

const PUBLIC_ROUTES = [
  "/health",
  "/ws",
  "/auth/signup",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/accept-invite",
  "/plans",
  "/billing/webhook",
];

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("orgId", "");
  fastify.decorateRequest("planId", "free");
  fastify.decorateRequest("authType", "none");
  fastify.decorateRequest("userId", "");
  fastify.decorateRequest("role", "");

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for public routes
    if (PUBLIC_ROUTES.some((r) => request.url.startsWith(r))) {
      return;
    }

    const authHeader = request.headers.authorization;

    // API key auth (machine-to-machine)
    if (authHeader?.startsWith("Bearer sk_")) {
      const key = authHeader.slice(7);
      const keyHash = hashApiKey(key);

      const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { org: { select: { id: true, planId: true } } },
      });

      if (!apiKey) {
        return reply.status(401).send({ error: "Invalid API key" });
      }

      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return reply.status(401).send({ error: "API key expired" });
      }

      // Update last used (fire and forget)
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      request.orgId = apiKey.orgId;
      request.planId = apiKey.org.planId;
      request.authType = "api_key";
      request.role = "owner"; // API keys have full org access
      return;
    }

    // JWT auth (dashboard users)
    if (authHeader?.startsWith("Bearer ey")) {
      try {
        await request.jwtVerify();
        const { userId, orgId, role } = request.user;

        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { planId: true },
        });

        request.orgId = orgId;
        request.planId = org?.planId ?? "free";
        request.authType = "jwt";
        request.userId = userId;
        request.role = role;
        return;
      } catch {
        return reply.status(401).send({ error: "Invalid token" });
      }
    }

    return reply.status(401).send({ error: "Authentication required" });
  });

  // Per-org rate limiting (after auth resolves)
  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.orgId || PUBLIC_ROUTES.some((r) => request.url.startsWith(r))) return;

    const result = await checkRateLimit(request.orgId, request.planId);
    reply.header("X-RateLimit-Remaining", result.remaining);
    reply.header("X-RateLimit-Reset", result.resetIn);

    if (!result.allowed) {
      return reply.status(429).send({ error: "Rate limit exceeded", retryAfter: result.resetIn });
    }
  });
}

export default fp(authPlugin, { name: "auth" });
