import "./sentry.ts";
import pino from "pino";
import { startEventWorker } from "./processors/event.ts";
import { startNotificationWorker } from "./processors/notification.ts";
import { runRetentionCleanup, runAnomalyCheck, reconcileUsage } from "./processors/cleanup.ts";

const isDev = process.env.NODE_ENV !== "production";
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isDev ? { transport: { target: "pino-pretty", options: { colorize: true } } } : {}),
});

logger.info("Starting SignalDesk workers...");

const eventWorker = startEventWorker();
const notificationWorker = startNotificationWorker();

logger.info("Workers started: event processor, notification sender, scheduled jobs");

// Schedule cleanup jobs
let cleanupInterval: Timer | null = null;
let anomalyInterval: Timer | null = null;
let usageInterval: Timer | null = null;

function startScheduledJobs() {
  // Run retention cleanup every hour
  cleanupInterval = setInterval(() => {
    runRetentionCleanup().catch((err) => logger.error("[Cleanup] Error:", err.message));
  }, 60 * 60 * 1000);

  // Run anomaly check every 15 minutes
  anomalyInterval = setInterval(() => {
    runAnomalyCheck().catch((err) => logger.error("[Anomaly] Error:", err.message));
  }, 15 * 60 * 1000);

  // Reconcile usage every 5 minutes
  usageInterval = setInterval(() => {
    reconcileUsage().catch((err) => logger.error("[Usage] Error:", err.message));
  }, 5 * 60 * 1000);

  // Run once on startup (after 10 seconds)
  setTimeout(() => {
    reconcileUsage().catch((err) => logger.error("[Usage] Error:", err.message));
  }, 10000);
}

startScheduledJobs();

// Graceful shutdown
const shutdown = async () => {
  logger.info("\nShutting down workers...");

  if (cleanupInterval) clearInterval(cleanupInterval);
  if (anomalyInterval) clearInterval(anomalyInterval);
  if (usageInterval) clearInterval(usageInterval);

  await Promise.all([
    eventWorker.close(),
    notificationWorker.close(),
  ]);
  logger.info("Workers stopped");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
