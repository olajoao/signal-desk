import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma, type Prisma } from "@signaldesk/db";
import { getRedisConnection, notificationQueue, type EventJobData } from "@signaldesk/queue";
import type { RuleAction } from "@signaldesk/shared";
import { logger } from "../index.ts";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

interface RuleWithActions {
  id: string;
  name: string;
  eventType: string;
  condition: string;
  threshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
  actions: RuleAction[];
  enabled: boolean;
}

async function getEventCountInWindow(orgId: string, eventType: string, windowSeconds: number): Promise<number> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const key = `org:${orgId}:events:${eventType}`;

  // Remove old entries outside window
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count events in window
  return redis.zcard(key);
}

async function addEventToWindow(orgId: string, eventType: string, eventId: string, timestamp: number): Promise<void> {
  const key = `org:${orgId}:events:${eventType}`;
  await redis.zadd(key, timestamp, eventId);
  // Set TTL on the key (max window is 24h)
  await redis.expire(key, 86400);
}

async function isInCooldown(ruleId: string): Promise<boolean> {
  const key = `cooldown:${ruleId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

async function setCooldown(ruleId: string, cooldownSeconds: number): Promise<void> {
  if (cooldownSeconds <= 0) return;
  const key = `cooldown:${ruleId}`;
  await redis.setex(key, cooldownSeconds, "1");
}

function evaluateCondition(condition: string, count: number, threshold: number): boolean {
  switch (condition) {
    case "count_gte":
      return count >= threshold;
    case "count_gt":
      return count > threshold;
    case "count_eq":
      return count === threshold;
    default:
      return false;
  }
}

async function removeEventFromWindow(orgId: string, eventType: string, eventId: string): Promise<void> {
  const key = `org:${orgId}:events:${eventType}`;
  await redis.zrem(key, eventId);
}

async function processEvent(job: Job<EventJobData>): Promise<void> {
  const { eventId, type, metadata, timestamp, orgId } = job.data;

  // Add event to sliding window (scoped by org)
  await addEventToWindow(orgId, type, eventId, new Date(timestamp).getTime());

  try {
    // Find matching rules for this org
    const rules = await prisma.rule.findMany({
      where: { eventType: type, enabled: true, orgId },
    });

    // Collect all notifications to create
    const notificationsToCreate: Array<{
      ruleId: string;
      channel: string;
      payload: Prisma.InputJsonValue;
    }> = [];

    for (const rule of rules) {
      const ruleWithActions = rule as unknown as RuleWithActions;

      if (await isInCooldown(rule.id)) continue;

      const count = await getEventCountInWindow(orgId, type, rule.windowSeconds);
      if (!evaluateCondition(rule.condition, count, rule.threshold)) continue;

      await setCooldown(rule.id, rule.cooldownSeconds);

      for (const action of ruleWithActions.actions) {
        notificationsToCreate.push({
          ruleId: rule.id,
          channel: action.channel,
          payload: {
            ruleName: rule.name,
            eventType: type,
            eventMetadata: metadata,
            threshold: rule.threshold,
            windowSeconds: rule.windowSeconds,
            count,
            triggeredAt: new Date().toISOString(),
            actionConfig: action.config,
          } as Prisma.InputJsonValue,
        });
      }
    }

    // Batch create notifications + mark event processed in a transaction
    if (notificationsToCreate.length > 0) {
      const notifications = await prisma.$transaction(async (tx) => {
        const created = await Promise.all(
          notificationsToCreate.map((n) =>
            tx.notification.create({
              data: { ruleId: n.ruleId, eventId, channel: n.channel, payload: n.payload, orgId },
            })
          )
        );
        await tx.event.update({ where: { id: eventId }, data: { processed: true } });
        return created;
      });

      // Queue all notifications for delivery
      await notificationQueue.addBulk(
        notifications.map((n, i) => ({
          name: "send",
          data: {
            notificationId: n.id,
            ruleId: notificationsToCreate[i]!.ruleId,
            eventId,
            channel: n.channel as "webhook" | "discord" | "in_app" | "slack" | "email",
            payload: n.payload as Record<string, unknown>,
            orgId,
          },
        }))
      );
    } else {
      await prisma.event.update({ where: { id: eventId }, data: { processed: true } });
    }
  } catch (err) {
    // Roll back Redis window entry on DB failure
    await removeEventFromWindow(orgId, type, eventId).catch(() => {});
    throw err;
  }
}

export function startEventWorker(): Worker<EventJobData> {
  const worker = new Worker<EventJobData>("events", processEvent, {
    connection: getRedisConnection(),
    concurrency: 10,
    lockDuration: 30000,
  });

  worker.on("completed", (job) => {
    logger.info({ eventId: job.data.eventId }, "Event processed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ eventId: job?.data.eventId, error: err.message, attempt: job?.attemptsMade }, "Event processing failed");
  });

  return worker;
}
