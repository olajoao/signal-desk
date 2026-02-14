import type { FastifyInstance } from "fastify";
import { prisma, type Prisma } from "@signaldesk/db";
import { eventQueue } from "@signaldesk/queue";
import { CreateEventSchema } from "@signaldesk/shared";
import { broadcast } from "../ws/handler.ts";
import {
  canAcceptEvent,
  incrementEventUsage,
  trackDailyEvent,
  checkForAnomalies,
} from "../services/limits.ts";

export async function eventRoutes(fastify: FastifyInstance) {
  // Ingest event
  fastify.post("/events", async (request, reply) => {
    // Check monthly event limit
    const eventLimit = await canAcceptEvent(request.orgId, request.planId);
    if (!eventLimit.allowed) {
      return reply.status(402).send({
        error: "Event limit exceeded",
        message: eventLimit.reason,
        code: "LIMIT_EXCEEDED",
      });
    }

    const parsed = CreateEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid event", details: parsed.error.flatten() });
    }

    const { type, metadata, timestamp } = parsed.data;

    const event = await prisma.event.create({
      data: {
        type,
        metadata: metadata as Prisma.InputJsonValue,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        orgId: request.orgId,
      },
    });

    // Track usage (fire and forget)
    incrementEventUsage(request.orgId, request.planId).catch(() => {});
    trackDailyEvent(request.orgId).catch(() => {});

    // Check for anomalies periodically (1% of requests)
    if (Math.random() < 0.01) {
      checkForAnomalies(request.orgId).catch(() => {});
    }

    // Queue for processing
    await eventQueue.add("process", {
      eventId: event.id,
      type: event.type,
      metadata: event.metadata as Record<string, unknown>,
      timestamp: event.timestamp.toISOString(),
      orgId: request.orgId,
    });

    // Broadcast to connected clients
    broadcast(request.orgId, {
      type: "event:new",
      payload: {
        id: event.id,
        type: event.type,
        metadata: event.metadata,
        timestamp: event.timestamp.toISOString(),
      },
    });

    return reply.status(201).send({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp.toISOString(),
    });
  });

  // List events
  fastify.get("/events", async (request, reply) => {
    const { limit = "50", offset = "0", type } = request.query as {
      limit?: string;
      offset?: string;
      type?: string;
    };

    const take = Math.min(Math.max(1, Math.floor(Number(limit)) || 50), 100);
    const skip = Math.max(0, Math.floor(Number(offset)) || 0);

    const events = await prisma.event.findMany({
      where: { orgId: request.orgId, ...(type ? { type } : {}) },
      orderBy: { timestamp: "desc" },
      take,
      skip,
    });

    return reply.send({
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        metadata: e.metadata,
        timestamp: e.timestamp.toISOString(),
        processed: e.processed,
      })),
    });
  });

  // Get single event
  fastify.get("/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const event = await prisma.event.findFirst({ where: { id, orgId: request.orgId } });
    if (!event) {
      return reply.status(404).send({ error: "Event not found" });
    }

    return reply.send({
      id: event.id,
      type: event.type,
      metadata: event.metadata,
      timestamp: event.timestamp.toISOString(),
      processed: event.processed,
    });
  });
}
