import { z } from "zod";

export const RuleConditionSchema = z.enum(["count_gte", "count_gt", "count_eq"]);

export const RuleActionSchema = z.object({
  channel: z.enum(["webhook", "discord", "in_app"]),
  config: z.record(z.string(), z.unknown()),
});

export const CreateRuleSchema = z.object({
  name: z.string().min(1).max(255),
  eventType: z.string().min(1).max(255),
  condition: RuleConditionSchema,
  threshold: z.number().int().min(1),
  windowSeconds: z.number().int().min(1).max(86400), // max 24h
  cooldownSeconds: z.number().int().min(0).max(86400).default(60),
  actions: z.array(RuleActionSchema).min(1),
  enabled: z.boolean().default(true),
});

export const RuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  eventType: z.string(),
  condition: RuleConditionSchema,
  threshold: z.number(),
  windowSeconds: z.number(),
  cooldownSeconds: z.number(),
  actions: z.array(RuleActionSchema),
  enabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type RuleAction = z.infer<typeof RuleActionSchema>;
export type CreateRule = z.infer<typeof CreateRuleSchema>;
export type Rule = z.infer<typeof RuleSchema>;
