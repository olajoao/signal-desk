import { Worker, type Job } from "bullmq";
import { prisma } from "@signaldesk/db";
import { getRedisConnection, type NotificationJobData } from "@signaldesk/queue";

interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
}

interface DiscordConfig {
  webhookUrl: string;
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

async function broadcastToWebSocket(notificationId: string, payload: Record<string, unknown>): Promise<void> {
  // In production, this would use Redis pub/sub to communicate with the API server
  console.log(`[WS Broadcast] Notification ${notificationId}:`, JSON.stringify(payload));
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
    } else if (channel === "in_app") {
      await broadcastToWebSocket(notificationId, payload);
    }

    // Mark as sent
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "sent", sentAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Mark as failed
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "failed", error: message },
    });

    throw error;
  }
}

export function startNotificationWorker(): Worker<NotificationJobData> {
  const worker = new Worker<NotificationJobData>("notifications", processNotification, {
    connection: getRedisConnection(),
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`Notification ${job.data.notificationId} sent via ${job.data.channel}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Notification ${job?.data.notificationId} failed:`, err.message);
  });

  return worker;
}
