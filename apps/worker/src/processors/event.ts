import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma, type Prisma } from "@signaldesk/db";
import { getRedisConnection, notificationQueue, type EventJobData } from "@signaldesk/queue";
import type { RuleAction } from "@signaldesk/shared";

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

async function processEvent(job: Job<EventJobData>): Promise<void> {
  const { eventId, type, metadata, timestamp, orgId } = job.data;

  // Add event to sliding window (scoped by org)
  await addEventToWindow(orgId, type, eventId, new Date(timestamp).getTime());

  // Find matching rules for this org
  const rules = await prisma.rule.findMany({
    where: { eventType: type, enabled: true, orgId },
  });

  for (const rule of rules) {
    const ruleWithActions = rule as unknown as RuleWithActions;

    // Check cooldown
    if (await isInCooldown(rule.id)) {
      continue;
    }

    // Get count in window (scoped by org)
    const count = await getEventCountInWindow(orgId, type, rule.windowSeconds);

    // Evaluate condition
    if (!evaluateCondition(rule.condition, count, rule.threshold)) {
      continue;
    }

    // Set cooldown
    await setCooldown(rule.id, rule.cooldownSeconds);

    // Create notifications for each action
    const actions = ruleWithActions.actions;
    for (const action of actions) {
      const payload = {
        ruleName: rule.name,
        eventType: type,
        eventMetadata: metadata,
        threshold: rule.threshold,
        windowSeconds: rule.windowSeconds,
        count,
        triggeredAt: new Date().toISOString(),
        actionConfig: action.config,
      } as Prisma.InputJsonValue;

      const notification = await prisma.notification.create({
        data: {
          ruleId: rule.id,
          eventId,
          channel: action.channel,
          payload,
          orgId,
        },
      });

      // Queue notification for delivery
      await notificationQueue.add("send", {
        notificationId: notification.id,
        ruleId: rule.id,
        eventId,
        channel: action.channel as "webhook" | "discord" | "in_app" | "slack" | "email",
        payload: notification.payload as Record<string, unknown>,
        orgId,
      });
    }
  }

  // Mark event as processed
  await prisma.event.update({
    where: { id: eventId },
    data: { processed: true },
  });
}

export function startEventWorker(): Worker<EventJobData> {
  const worker = new Worker<EventJobData>("events", processEvent, {
    connection: getRedisConnection(),
    concurrency: 10,
  });

  worker.on("completed", (job) => {
    console.log(`Event ${job.data.eventId} processed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Event ${job?.data.eventId} failed:`, err.message);
  });

  return worker;
}
