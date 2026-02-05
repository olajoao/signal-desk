import type { FastifyInstance } from "fastify";
import { prisma } from "@signaldesk/db";
import { CreateApiKeySchema } from "@signaldesk/shared";
import { randomBytes, createHash } from "crypto";
import { requireRole } from "../plugins/rbac.ts";

function generateApiKey(): string {
  return `sk_${randomBytes(24).toString("hex")}`;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function computeExpiry(expiresIn: string | undefined): Date | null {
  if (!expiresIn || expiresIn === "never") return null;
  const now = new Date();
  const days: Record<string, number> = { "30d": 30, "90d": 90, "1y": 365 };
  const d = days[expiresIn];
  if (!d) return null;
  now.setDate(now.getDate() + d);
  return now;
}

export async function apiKeyRoutes(fastify: FastifyInstance) {
  // Create API key
  fastify.post("/api-keys", { preHandler: requireRole("admin") }, async (request, reply) => {
    const parsed = CreateApiKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const key = generateApiKey();
    const keyHash = hashKey(key);
    const prefix = key.slice(0, 12) + "...";
    const expiresAt = computeExpiry(parsed.data.expiresIn);

    const apiKey = await prisma.apiKey.create({
      data: {
        name: parsed.data.name,
        keyHash,
        prefix,
        expiresAt,
        orgId: request.orgId,
      },
    });

    return reply.status(201).send({
      id: apiKey.id,
      name: apiKey.name,
      key, // plaintext, shown only once
      keyPrefix: prefix,
      expiresAt: apiKey.expiresAt?.toISOString() ?? null,
      createdAt: apiKey.createdAt.toISOString(),
    });
  });

  // List API keys (without revealing the key)
  fastify.get("/api-keys", async (request, reply) => {
    const keys = await prisma.apiKey.findMany({
      where: { orgId: request.orgId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      apiKeys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.prefix,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    });
  });

  // Delete API key
  fastify.delete("/api-keys/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.apiKey.findFirst({ where: { id, orgId: request.orgId } });
    if (!existing) {
      return reply.status(404).send({ error: "API key not found" });
    }

    await prisma.apiKey.delete({ where: { id } });
    return reply.status(204).send();
  });
}
