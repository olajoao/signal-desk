import type { FastifyInstance } from "fastify";
import { prisma } from "@signaldesk/db";
import {
  createCheckoutSession,
  createBillingPortalSession,
  handleWebhookEvent,
  isStripeConfigured,
} from "../services/stripe.ts";

export async function billingRoutes(fastify: FastifyInstance) {
  // Create Stripe checkout session
  fastify.post("/billing/checkout", async (request, reply) => {
    if (!isStripeConfigured()) {
      return reply.status(503).send({ error: "Billing not configured" });
    }

    const { planId } = request.body as { planId: string };
    if (!planId) {
      return reply.status(400).send({ error: "planId required" });
    }

    // Get billing email from user or org
    const membership = await prisma.membership.findFirst({
      where: { orgId: request.orgId, userId: request.userId },
      include: { user: { select: { email: true } } },
    });

    const email = membership?.user.email;
    if (!email) {
      return reply.status(400).send({ error: "No billing email found" });
    }

    try {
      const url = await createCheckoutSession(request.orgId, planId, email);
      return reply.send({ url });
    } catch (err) {
      request.log.error(err, "Checkout session failed");
      return reply.status(502).send({ error: "Unable to start checkout. Please try again later." });
    }
  });

  // Get Stripe billing portal URL
  fastify.get("/billing/portal", async (request, reply) => {
    if (!isStripeConfigured()) {
      return reply.status(503).send({ error: "Billing not configured" });
    }

    const url = await createBillingPortalSession(request.orgId);
    return reply.send({ url });
  });

  // Stripe webhook (needs raw body)
  fastify.post("/billing/webhook", {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return reply.status(400).send({ error: "Missing stripe-signature header" });
    }

    const rawBody = (request as { rawBody?: string }).rawBody ?? request.body;
    if (!rawBody || typeof rawBody !== "string") {
      return reply.status(400).send({ error: "Missing request body" });
    }

    await handleWebhookEvent(rawBody, signature);
    return reply.status(200).send({ received: true });
  });
}
