import type { FastifyInstance } from "fastify";
import { prisma } from "@signaldesk/db";
import { getUsageInfo, getPlanLimits } from "../services/limits.ts";

export async function usageRoutes(fastify: FastifyInstance) {
  // Get current usage
  fastify.get("/usage", async (request, reply) => {
    const [usage, limits, org] = await Promise.all([
      getUsageInfo(request.orgId, request.planId),
      getPlanLimits(request.planId),
      prisma.organization.findUnique({
        where: { id: request.orgId },
        include: { plan: true },
      }),
    ]);

    return reply.send({
      plan: {
        id: org?.plan.id,
        name: org?.plan.displayName,
        priceMonthly: org?.plan.priceMonthly,
      },
      usage: {
        events: {
          used: usage.eventsCount,
          limit: usage.eventsLimit,
          remaining: usage.eventsRemaining,
          percentUsed: usage.percentUsed,
        },
        rules: {
          used: usage.rulesCount,
          limit: usage.rulesLimit,
          remaining: usage.rulesRemaining,
        },
        overage: {
          events: usage.overageEvents,
          cost: usage.overageEvents > 0 ? Math.ceil(usage.overageEvents / 1000) * (limits.overageRate / 100) : 0,
        },
      },
      limits: {
        rateLimit: limits.rateLimit,
        retentionDays: limits.retentionDays,
      },
      billing: {
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      },
    });
  });

  // Get available plans
  fastify.get("/plans", async (_request, reply) => {
    const plans = await prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
    });

    return reply.send({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        priceMonthly: p.priceMonthly,
        eventsPerMonth: p.eventsPerMonth,
        rulesLimit: p.rulesLimit,
        retentionDays: p.retentionDays,
        rateLimit: p.rateLimit,
      })),
    });
  });
}
