import type { FastifyInstance } from "fastify";
import { prisma } from "@signaldesk/db";

export async function notificationRoutes(fastify: FastifyInstance) {
  // List notifications
  fastify.get("/notifications", async (request, reply) => {
    const { limit = "50", offset = "0", status } = request.query as {
      limit?: string;
      offset?: string;
      status?: string;
    };

    const take = Math.min(Math.max(1, Math.floor(Number(limit)) || 50), 100);
    const skip = Math.max(0, Math.floor(Number(offset)) || 0);

    const notifications = await prisma.notification.findMany({
      where: { orgId: request.orgId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        rule: { select: { name: true } },
        event: { select: { type: true } },
      },
    });

    return reply.send({
      notifications: notifications.map((n) => ({
        id: n.id,
        ruleId: n.ruleId,
        ruleName: n.rule.name,
        eventId: n.eventId,
        eventType: n.event.type,
        channel: n.channel,
        status: n.status,
        sentAt: n.sentAt?.toISOString() ?? null,
        error: n.error,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  });

  // Get single notification
  fastify.get("/notifications/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const notification = await prisma.notification.findFirst({
      where: { id, orgId: request.orgId },
      include: {
        rule: { select: { name: true } },
        event: { select: { type: true, metadata: true } },
      },
    });

    if (!notification) {
      return reply.status(404).send({ error: "Notification not found" });
    }

    return reply.send({
      id: notification.id,
      ruleId: notification.ruleId,
      ruleName: notification.rule.name,
      eventId: notification.eventId,
      eventType: notification.event.type,
      eventMetadata: notification.event.metadata,
      channel: notification.channel,
      payload: notification.payload,
      status: notification.status,
      sentAt: notification.sentAt?.toISOString() ?? null,
      error: notification.error,
      createdAt: notification.createdAt.toISOString(),
    });
  });
}
