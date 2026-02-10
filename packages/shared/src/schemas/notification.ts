import { z } from "zod";

export const NotificationStatusSchema = z.enum(["pending", "sent", "failed"]);
export const NotificationChannelSchema = z.enum(["webhook", "discord", "in_app", "slack", "email"]);

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  eventId: z.string().uuid(),
  channel: NotificationChannelSchema,
  payload: z.record(z.string(), z.unknown()),
  status: NotificationStatusSchema,
  sentAt: z.date().nullable(),
  error: z.string().nullable(),
  createdAt: z.date(),
});

export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
