import { startEventWorker } from "./processors/event.ts";
import { startNotificationWorker } from "./processors/notification.ts";
import { runRetentionCleanup, runAnomalyCheck, reconcileUsage } from "./processors/cleanup.ts";

console.log("Starting SignalDesk workers...");

const eventWorker = startEventWorker();
const notificationWorker = startNotificationWorker();

console.log("Workers started:");
console.log("  - Event processor");
console.log("  - Notification sender");
console.log("  - Scheduled jobs (cleanup, anomaly, usage)");

// Schedule cleanup jobs
let cleanupInterval: Timer | null = null;
let anomalyInterval: Timer | null = null;
let usageInterval: Timer | null = null;

function startScheduledJobs() {
  // Run retention cleanup every hour
  cleanupInterval = setInterval(() => {
    runRetentionCleanup().catch((err) => console.error("[Cleanup] Error:", err.message));
  }, 60 * 60 * 1000);

  // Run anomaly check every 15 minutes
  anomalyInterval = setInterval(() => {
    runAnomalyCheck().catch((err) => console.error("[Anomaly] Error:", err.message));
  }, 15 * 60 * 1000);

  // Reconcile usage every 5 minutes
  usageInterval = setInterval(() => {
    reconcileUsage().catch((err) => console.error("[Usage] Error:", err.message));
  }, 5 * 60 * 1000);

  // Run once on startup (after 10 seconds)
  setTimeout(() => {
    reconcileUsage().catch((err) => console.error("[Usage] Error:", err.message));
  }, 10000);
}

startScheduledJobs();

// Graceful shutdown
const shutdown = async () => {
  console.log("\nShutting down workers...");

  if (cleanupInterval) clearInterval(cleanupInterval);
  if (anomalyInterval) clearInterval(anomalyInterval);
  if (usageInterval) clearInterval(usageInterval);

  await Promise.all([
    eventWorker.close(),
    notificationWorker.close(),
  ]);
  console.log("Workers stopped");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
