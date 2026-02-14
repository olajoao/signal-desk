import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@signaldesk/db";
import { getRedisConnection, type NotificationJobData } from "@signaldesk/queue";
import { Resend } from "resend";
import { logger } from "../index.ts";

interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
}

interface DiscordConfig {
  webhookUrl: string;
}

interface SlackConfig {
  webhookUrl: string;
}

interface EmailConfig {
  to: string;
}

async function sendWebhook(url: string, payload: Record<string, unknown>, headers?: Record<string, string>): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
}

async function sendDiscord(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
  const ruleName = payload.ruleName as string;
  const eventType = payload.eventType as string;
  const count = payload.count as number;
  const threshold = payload.threshold as number;
  const windowSeconds = payload.windowSeconds as number;
  const metadata = payload.eventMetadata as Record<string, unknown>;

  const discordPayload = {
    embeds: [{
      title: `Alert: ${ruleName}`,
      color: 0xff4444,
      fields: [
        { name: "Event Type", value: `\`${eventType}\``, inline: true },
        { name: "Count", value: `${count} / ${threshold}`, inline: true },
        { name: "Window", value: `${windowSeconds}s`, inline: true },
        { name: "Metadata", value: `\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\``, inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "SignalDesk" },
    }],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(discordPayload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
  }
}

async function sendSlack(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
  const ruleName = payload.ruleName as string;
  const eventType = payload.eventType as string;
  const count = payload.count as number;
  const threshold = payload.threshold as number;
  const windowSeconds = payload.windowSeconds as number;
  const metadata = payload.eventMetadata as Record<string, unknown>;

  const slackPayload = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `Alert: ${ruleName}` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Event Type*\n\`${eventType}\`` },
          { type: "mrkdwn", text: `*Count*\n${count} / ${threshold}` },
          { type: "mrkdwn", text: `*Window*\n${windowSeconds}s` },
          { type: "mrkdwn", text: `*Time*\n${new Date().toISOString()}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Metadata*\n\`\`\`${JSON.stringify(metadata, null, 2)}\`\`\``,
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: "Sent by *SignalDesk*" }],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackPayload),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
  }
}

async function sendAlertEmail(to: string, payload: Record<string, unknown>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "SignalDesk <noreply@signaldesk.dev>";

  const ruleName = payload.ruleName as string;
  const eventType = payload.eventType as string;
  const count = payload.count as number;
  const threshold = payload.threshold as number;
  const windowSeconds = payload.windowSeconds as number;
  const metadata = payload.eventMetadata as Record<string, unknown>;

  if (!apiKey) {
    logger.info({ to, ruleName, eventType, count, threshold }, "Email alert skipped (no RESEND_API_KEY)");
    return;
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[SignalDesk] Alert: ${ruleName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px;color:#ef4444">Alert: ${ruleName}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Event Type</td><td style="padding:8px;border-bottom:1px solid #eee"><code>${eventType}</code></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Count</td><td style="padding:8px;border-bottom:1px solid #eee">${count} / ${threshold}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Window</td><td style="padding:8px;border-bottom:1px solid #eee">${windowSeconds}s</td></tr>
        </table>
        <details style="margin-bottom:16px">
          <summary style="cursor:pointer;color:#666;font-size:14px">Event Metadata</summary>
          <pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;overflow-x:auto">${JSON.stringify(metadata, null, 2)}</pre>
        </details>
        <p style="color:#999;font-size:12px">Sent by SignalDesk</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Email alert failed: ${error.message}`);
  }
}

const publisher = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

async function broadcastToWebSocket(orgId: string, notificationId: string, payload: Record<string, unknown>): Promise<void> {
  const message = JSON.stringify({ type: "notification:new", payload: { ...payload, notificationId } });
  await publisher.publish(`ws:broadcast:${orgId}`, message);
}

async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { notificationId, channel, payload } = job.data;

  try {
    if (channel === "webhook") {
      const config = payload.actionConfig as WebhookConfig | undefined;
      if (!config?.url) {
        throw new Error("Webhook URL not configured");
      }
      await sendWebhook(config.url, payload, config.headers);
    } else if (channel === "discord") {
      const config = payload.actionConfig as DiscordConfig | undefined;
      if (!config?.webhookUrl) {
        throw new Error("Discord webhook URL not configured");
      }
      await sendDiscord(config.webhookUrl, payload);
    } else if (channel === "slack") {
      const config = payload.actionConfig as SlackConfig | undefined;
      if (!config?.webhookUrl) {
        throw new Error("Slack webhook URL not configured");
      }
      await sendSlack(config.webhookUrl, payload);
    } else if (channel === "email") {
      const config = payload.actionConfig as EmailConfig | undefined;
      if (!config?.to) {
        throw new Error("Email address not configured");
      }
      await sendAlertEmail(config.to, payload);
    } else if (channel === "in_app") {
      await broadcastToWebSocket(job.data.orgId, notificationId, payload);
    }

    // Mark as sent
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "sent", sentAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isLastAttempt = (job.attemptsMade + 1) >= (job.opts.attempts ?? 3);

    // Only mark as permanently failed on last attempt
    await prisma.notification.update({
      where: { id: notificationId },
      data: isLastAttempt
        ? { status: "failed", error: message }
        : { status: "retrying", error: `Attempt ${job.attemptsMade + 1} failed: ${message}` },
    });

    throw error;
  }
}

export function startNotificationWorker(): Worker<NotificationJobData> {
  const worker = new Worker<NotificationJobData>("notifications", processNotification, {
    connection: getRedisConnection(),
    concurrency: 5,
    lockDuration: 60000,
  });

  worker.on("completed", (job) => {
    logger.info({ notificationId: job.data.notificationId, channel: job.data.channel }, "Notification sent");
  });

  worker.on("failed", (job, err) => {
    logger.error({ notificationId: job?.data.notificationId, channel: job?.data.channel, error: err.message, attempt: job?.attemptsMade }, "Notification failed");
  });

  return worker;
}
