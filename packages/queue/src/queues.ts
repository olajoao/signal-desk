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

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export const eventQueue = new Queue<EventJobData>("events", {
  connection,
  defaultJobOptions,
});

export const notificationQueue = new Queue<NotificationJobData>("notifications", {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
  },
});

export const QUEUE_NAMES = {
  EVENTS: "events",
  NOTIFICATIONS: "notifications",
} as const;
