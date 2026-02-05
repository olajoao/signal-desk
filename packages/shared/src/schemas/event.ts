import { z } from "zod";

export const EventMetadataSchema = z.record(z.string(), z.unknown());

export const CreateEventSchema = z.object({
  type: z.string().min(1).max(255),
  metadata: EventMetadataSchema.optional().default({}),
  timestamp: z.string().datetime().optional(),
});

export const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  metadata: EventMetadataSchema,
  timestamp: z.date(),
  processed: z.boolean(),
  createdAt: z.date(),
});

export type EventMetadata = z.infer<typeof EventMetadataSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type Event = z.infer<typeof EventSchema>;
