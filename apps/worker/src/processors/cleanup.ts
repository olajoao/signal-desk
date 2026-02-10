import { prisma } from "@signaldesk/db";
import { reportOverageUsage } from "./stripe-usage.ts";

// Run cleanup for all organizations based on their plan's retention policy
export async function runRetentionCleanup(): Promise<{ deleted: number; orgs: number }> {
  console.log("[Cleanup] Starting retention cleanup...");

  // Get all orgs with their plan's retention days
  const orgs = await prisma.organization.findMany({
    include: { plan: { select: { retentionDays: true } } },
  });

  let totalDeleted = 0;

  for (const org of orgs) {
    const retentionDays = org.plan.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old events (cascades to notifications)
    const result = await prisma.event.deleteMany({
      where: {
        orgId: org.id,
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      console.log(`[Cleanup] Deleted ${result.count} events for org ${org.slug} (retention: ${retentionDays} days)`);
      totalDeleted += result.count;
    }
  }

  console.log(`[Cleanup] Completed. Total deleted: ${totalDeleted} events from ${orgs.length} orgs`);

  return { deleted: totalDeleted, orgs: orgs.length };
}

// Run anomaly check across all orgs
export async function runAnomalyCheck(): Promise<void> {
  console.log("[Anomaly] Checking for usage anomalies...");

  // Find orgs with high activity today
  const orgs = await prisma.organization.findMany({
    include: {
      plan: { select: { eventsPerMonth: true } },
      usage: {
        where: {
          periodStart: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        take: 1,
      },
    },
  });

  for (const org of orgs) {
    const usage = org.usage[0];
    if (!usage) continue;

    const daysInMonth = new Date().getDate();
    const expectedDailyRate = org.plan.eventsPerMonth / 30;
    const actualDailyRate = usage.eventsCount / Math.max(1, daysInMonth);

    // Alert if daily rate is 5x higher than expected
    if (actualDailyRate > expectedDailyRate * 5 && usage.eventsCount > 1000) {
      const existingAlert = await prisma.systemAlert.findFirst({
        where: { orgId: org.id, type: "high_usage", resolved: false },
      });

      if (!existingAlert) {
        await prisma.systemAlert.create({
          data: {
            orgId: org.id,
            type: "high_usage",
            message: `High usage detected: ${Math.round(actualDailyRate)} events/day (expected ~${Math.round(expectedDailyRate)})`,
            metadata: {
              actualDailyRate,
              expectedDailyRate,
              totalEvents: usage.eventsCount,
              planLimit: org.plan.eventsPerMonth,
            },
          },
        });
        console.log(`[Anomaly] Alert created for org ${org.slug}: high usage`);
      }
    }
  }
}

// Aggregate and sync usage from events table (fallback reconciliation)
export async function reconcileUsage(): Promise<void> {
  console.log("[Usage] Reconciling usage counts...");

  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

  const orgs = await prisma.organization.findMany({
    include: { plan: { select: { eventsPerMonth: true } } },
  });

  for (const org of orgs) {
    // Count actual events this period
    const eventsCount = await prisma.event.count({
      where: {
        orgId: org.id,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const rulesCount = await prisma.rule.count({
      where: { orgId: org.id },
    });

    const notifCount = await prisma.notification.count({
      where: {
        orgId: org.id,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const overageEvents = Math.max(0, eventsCount - org.plan.eventsPerMonth);

    await prisma.usage.upsert({
      where: { orgId_periodStart: { orgId: org.id, periodStart } },
      create: {
        orgId: org.id,
        periodStart,
        periodEnd,
        eventsCount,
        rulesCount,
        notifCount,
        overageEvents,
      },
      update: {
        eventsCount,
        rulesCount,
        notifCount,
        overageEvents,
      },
    });

    // Report overage to Stripe if applicable
    if (overageEvents > 0) {
      reportOverageUsage(org.id, overageEvents).catch((err) =>
        console.error(`[Usage] Stripe overage report failed for ${org.id}:`, err.message)
      );
    }
  }

  console.log(`[Usage] Reconciled usage for ${orgs.length} orgs`);
}
