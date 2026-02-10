import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.ts";

export interface EventJobData {
  eventId: string;
  type: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  orgId: string;
}

export interface NotificationJobData {
  notificationId: string;
  ruleId: string;
  eventId: string;
  channel: "webhook" | "discord" | "in_app" | "slack" | "email";
  payload: Record<string, unknown>;
  orgId: string;
}

const connection = getRedisConnection();

export const eventQueue = new Queue<EventJobData>("events", { connection });
export const notificationQueue = new Queue<NotificationJobData>("notifications", { connection });

export const QUEUE_NAMES = {
  EVENTS: "events",
  NOTIFICATIONS: "notifications",
} as const;
