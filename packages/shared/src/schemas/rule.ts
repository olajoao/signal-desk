import { z } from "zod";

export const RuleConditionSchema = z.enum(["count_gte", "count_gt", "count_eq"]);

const WebhookConfigSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
});

const DiscordConfigSchema = z.object({
  webhookUrl: z.string().url().refine((u) => u.includes("discord.com/api/webhooks"), {
    message: "Must be a Discord webhook URL",
  }),
});

const SlackConfigSchema = z.object({
  webhookUrl: z.string().url().refine((u) => u.includes("hooks.slack.com"), {
    message: "Must be a Slack webhook URL",
  }),
});

const EmailConfigSchema = z.object({
  to: z.string().email(),
});

const InAppConfigSchema = z.record(z.string(), z.unknown()).default({});

const actionConfigByChannel = {
  webhook: WebhookConfigSchema,
  discord: DiscordConfigSchema,
  slack: SlackConfigSchema,
  email: EmailConfigSchema,
  in_app: InAppConfigSchema,
} as const;

export const RuleActionSchema = z
  .object({
    channel: z.enum(["webhook", "discord", "in_app", "slack", "email"]),
    config: z.record(z.string(), z.unknown()),
  })
  .superRefine((val, ctx) => {
    const schema = actionConfigByChannel[val.channel];
    const result = schema.safeParse(val.config);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["config", ...issue.path] });
      }
    }
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

export const UpdateRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  enabled: z.boolean().optional(),
  threshold: z.number().int().min(1).optional(),
  windowSeconds: z.number().int().min(1).max(86400).optional(),
  cooldownSeconds: z.number().int().min(0).max(86400).optional(),
  actions: z.array(RuleActionSchema).min(1).optional(),
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
export type UpdateRule = z.infer<typeof UpdateRuleSchema>;
export type Rule = z.infer<typeof RuleSchema>;
