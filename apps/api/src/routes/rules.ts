import type { FastifyInstance } from "fastify";
import { prisma, type Prisma } from "@signaldesk/db";
import { CreateRuleSchema, UpdateRuleSchema } from "@signaldesk/shared";
import { canCreateRule } from "../services/limits.ts";
import { requireRole } from "../plugins/rbac.ts";

export async function ruleRoutes(fastify: FastifyInstance) {
  // Create rule
  fastify.post("/rules", { preHandler: requireRole("admin") }, async (request, reply) => {
    // Check rule limit
    const ruleLimit = await canCreateRule(request.orgId, request.planId);
    if (!ruleLimit.allowed) {
      return reply.status(402).send({
        error: "Rule limit exceeded",
        message: ruleLimit.reason,
        code: "LIMIT_EXCEEDED",
      });
    }

    const parsed = CreateRuleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid rule", details: parsed.error.flatten() });
    }

    const rule = await prisma.rule.create({
      data: {
        name: parsed.data.name,
        eventType: parsed.data.eventType,
        condition: parsed.data.condition,
        threshold: parsed.data.threshold,
        windowSeconds: parsed.data.windowSeconds,
        cooldownSeconds: parsed.data.cooldownSeconds,
        actions: parsed.data.actions as Prisma.InputJsonValue,
        enabled: parsed.data.enabled,
        orgId: request.orgId,
      },
    });

    return reply.status(201).send({
      id: rule.id,
      name: rule.name,
      eventType: rule.eventType,
      condition: rule.condition,
      threshold: rule.threshold,
      windowSeconds: rule.windowSeconds,
      cooldownSeconds: rule.cooldownSeconds,
      actions: rule.actions,
      enabled: rule.enabled,
    });
  });

  // List rules
  fastify.get("/rules", async (request, reply) => {
    const rules = await prisma.rule.findMany({
      where: { orgId: request.orgId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        eventType: r.eventType,
        condition: r.condition,
        threshold: r.threshold,
        windowSeconds: r.windowSeconds,
        cooldownSeconds: r.cooldownSeconds,
        actions: r.actions,
        enabled: r.enabled,
      })),
    });
  });

  // Get single rule
  fastify.get("/rules/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const rule = await prisma.rule.findFirst({ where: { id, orgId: request.orgId } });
    if (!rule) {
      return reply.status(404).send({ error: "Rule not found" });
    }

    return reply.send({
      id: rule.id,
      name: rule.name,
      eventType: rule.eventType,
      condition: rule.condition,
      threshold: rule.threshold,
      windowSeconds: rule.windowSeconds,
      cooldownSeconds: rule.cooldownSeconds,
      actions: rule.actions,
      enabled: rule.enabled,
    });
  });

  // Update rule
  fastify.patch("/rules/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.rule.findFirst({ where: { id, orgId: request.orgId } });
    if (!existing) {
      return reply.status(404).send({ error: "Rule not found" });
    }

    const parsed = UpdateRuleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid rule update", details: parsed.error.flatten() });
    }

    const rule = await prisma.rule.update({
      where: { id },
      data: parsed.data as Prisma.RuleUpdateInput,
    });

    return reply.send({
      id: rule.id,
      name: rule.name,
      eventType: rule.eventType,
      condition: rule.condition,
      threshold: rule.threshold,
      windowSeconds: rule.windowSeconds,
      cooldownSeconds: rule.cooldownSeconds,
      actions: rule.actions,
      enabled: rule.enabled,
    });
  });

  // Delete rule
  fastify.delete("/rules/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.rule.findFirst({ where: { id, orgId: request.orgId } });
    if (!existing) {
      return reply.status(404).send({ error: "Rule not found" });
    }

    await prisma.rule.delete({ where: { id } });
    return reply.status(204).send();
  });
}
