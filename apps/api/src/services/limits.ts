import { prisma } from "@signaldesk/db";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

interface PlanLimits {
  eventsPerMonth: number;
  rulesLimit: number;
  retentionDays: number;
  rateLimit: number;
  overageRate: number;
}

interface UsageInfo {
  eventsCount: number;
  eventsLimit: number;
  eventsRemaining: number;
  rulesCount: number;
  rulesLimit: number;
  rulesRemaining: number;
  percentUsed: number;
  isOverLimit: boolean;
  overageEvents: number;
}

// Cache plan limits in memory (they rarely change)
const planCache = new Map<string, PlanLimits>();

export async function getPlanLimits(planId: string): Promise<PlanLimits> {
  if (planCache.has(planId)) {
    return planCache.get(planId)!;
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    // Default to free plan limits if not found
    return {
      eventsPerMonth: 10000,
      rulesLimit: 3,
      retentionDays: 7,
      rateLimit: 60,
      overageRate: 0,
    };
  }

  const limits: PlanLimits = {
    eventsPerMonth: plan.eventsPerMonth,
    rulesLimit: plan.rulesLimit,
    retentionDays: plan.retentionDays,
    rateLimit: plan.rateLimit,
    overageRate: plan.overageRate,
  };

  planCache.set(planId, limits);
  return limits;
}

// Get or create usage record for current billing period
async function getOrCreateUsage(orgId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let usage = await prisma.usage.findUnique({
    where: { orgId_periodStart: { orgId, periodStart } },
  });

  if (!usage) {
    usage = await prisma.usage.create({
      data: { orgId, periodStart, periodEnd },
    });
  }

  return usage;
}

export async function getUsageInfo(orgId: string, planId: string): Promise<UsageInfo> {
  const [usage, limits, rulesCount] = await Promise.all([
    getOrCreateUsage(orgId),
    getPlanLimits(planId),
    prisma.rule.count({ where: { orgId } }),
  ]);

  const eventsRemaining = Math.max(0, limits.eventsPerMonth - usage.eventsCount);
  const rulesRemaining = Math.max(0, limits.rulesLimit - rulesCount);
  const percentUsed = Math.round((usage.eventsCount / limits.eventsPerMonth) * 100);

  return {
    eventsCount: usage.eventsCount,
    eventsLimit: limits.eventsPerMonth,
    eventsRemaining,
    rulesCount,
    rulesLimit: limits.rulesLimit,
    rulesRemaining,
    percentUsed: Math.min(100, percentUsed),
    isOverLimit: usage.eventsCount >= limits.eventsPerMonth && limits.overageRate === 0,
    overageEvents: usage.overageEvents,
  };
}

// Check if org can accept more events
export async function canAcceptEvent(orgId: string, planId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getPlanLimits(planId);
  const usage = await getOrCreateUsage(orgId);

  // If over limit and no overage allowed (free plan)
  if (usage.eventsCount >= limits.eventsPerMonth && limits.overageRate === 0) {
    return {
      allowed: false,
      reason: `Monthly event limit reached (${limits.eventsPerMonth.toLocaleString()}). Upgrade your plan.`,
    };
  }

  return { allowed: true };
}

// Check if org can create more rules
export async function canCreateRule(orgId: string, planId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getPlanLimits(planId);
  const rulesCount = await prisma.rule.count({ where: { orgId } });

  if (rulesCount >= limits.rulesLimit) {
    return {
      allowed: false,
      reason: `Rule limit reached (${limits.rulesLimit}). Upgrade your plan.`,
    };
  }

  return { allowed: true };
}

// Increment event usage
export async function incrementEventUsage(orgId: string, planId: string): Promise<void> {
  const limits = await getPlanLimits(planId);
  const usage = await getOrCreateUsage(orgId);

  const isOverage = usage.eventsCount >= limits.eventsPerMonth;

  await prisma.usage.update({
    where: { id: usage.id },
    data: {
      eventsCount: { increment: 1 },
      ...(isOverage ? { overageEvents: { increment: 1 } } : {}),
    },
  });
}

// Rate limiting using Redis sliding window
export async function checkRateLimit(
  orgId: string,
  planId: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const limits = await getPlanLimits(planId);
  const key = `ratelimit:${orgId}`;
  const window = 60; // 1 minute window

  try {
    const now = Date.now();
    const windowStart = now - window * 1000;

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    const count = await redis.zcard(key);

    if (count >= limits.rateLimit) {
      // Get oldest entry to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
      const resetIn = oldest.length > 1 ? Math.ceil((Number(oldest[1]) + window * 1000 - now) / 1000) : window;

      return { allowed: false, remaining: 0, resetIn };
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, window);

    return {
      allowed: true,
      remaining: limits.rateLimit - count - 1,
      resetIn: window,
    };
  } catch {
    // If Redis is unavailable, allow request but with 0 remaining to signal degraded state
    return { allowed: true, remaining: 0, resetIn: window };
  }
}

// Detect anomalies (usage spikes)
export async function checkForAnomalies(orgId: string): Promise<void> {
  const usage = await getOrCreateUsage(orgId);

  // Check if usage spiked dramatically (more than 10x normal daily rate)
  const daysInMonth = new Date().getDate();
  const dailyAverage = usage.eventsCount / Math.max(1, daysInMonth);

  // Get today's count from Redis
  const todayKey = `daily:${orgId}:${new Date().toISOString().split("T")[0]}`;
  const todayCount = Number(await redis.get(todayKey)) || 0;

  if (todayCount > dailyAverage * 10 && todayCount > 1000) {
    // Check if we already have an unresolved alert for this
    const existingAlert = await prisma.systemAlert.findFirst({
      where: { orgId, type: "usage_spike", resolved: false },
    });

    if (!existingAlert) {
      await prisma.systemAlert.create({
        data: {
          orgId,
          type: "usage_spike",
          message: `Unusual activity detected: ${todayCount.toLocaleString()} events today vs ${Math.round(dailyAverage).toLocaleString()} daily average`,
          metadata: { todayCount, dailyAverage, threshold: dailyAverage * 10 },
        },
      });
    }
  }
}

// Track daily events for anomaly detection
export async function trackDailyEvent(orgId: string): Promise<void> {
  const todayKey = `daily:${orgId}:${new Date().toISOString().split("T")[0]}`;
  await redis.incr(todayKey);
  await redis.expire(todayKey, 86400 * 2); // Keep for 2 days
}
