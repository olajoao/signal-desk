import { z } from "zod";

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  expiresIn: z.enum(["never", "30d", "90d", "1y"]).optional(),
});

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  expiresAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
