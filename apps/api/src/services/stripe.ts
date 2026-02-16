import Stripe from "stripe";
import { prisma } from "@signaldesk/db";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(STRIPE_SECRET_KEY);
}

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

async function getOrCreateCustomer(orgId: string, email: string): Promise<string> {
  const stripe = getStripe();

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { stripeCustomerId: true, name: true },
  });

  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: org.name,
    metadata: { orgId },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id, billingEmail: email },
  });

  return customer.id;
}

export async function createCheckoutSession(orgId: string, planId: string, email: string): Promise<string> {
  const stripe = getStripe();

  const plan = await prisma.plan.findUniqueOrThrow({
    where: { id: planId },
    select: { stripePriceId: true, displayName: true },
  });

  if (!plan.stripePriceId) {
    throw new Error(`Plan ${planId} has no Stripe price configured`);
  }

  const customerId = await getOrCreateCustomer(orgId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${APP_URL}/settings?billing=success`,
    cancel_url: `${APP_URL}/settings?billing=cancel`,
    metadata: { orgId, planId },
  });

  if (!session.url) throw new Error("Failed to create checkout session");
  return session.url;
}

export async function createBillingPortalSession(orgId: string): Promise<string> {
  const stripe = getStripe();

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });

  if (!org.stripeCustomerId) {
    throw new Error("No billing account found. Subscribe to a plan first.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${APP_URL}/settings`,
  });

  return session.url;
}

const STRIPE_OVERAGE_METER_EVENT = process.env.STRIPE_OVERAGE_METER_EVENT ?? "overage_events";

export async function reportOverageUsage(orgId: string, overageEvents: number): Promise<void> {
  const stripe = getStripe();

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!org.stripeCustomerId || !org.stripeSubscriptionId || overageEvents <= 0) return;

  await stripe.billing.meterEvents.create({
    event_name: STRIPE_OVERAGE_METER_EVENT,
    payload: {
      stripe_customer_id: org.stripeCustomerId,
      value: String(Math.ceil(overageEvents / 1000)),
    },
  });
}

export async function handleWebhookEvent(payload: string, signature: string): Promise<void> {
  const stripe = getStripe();

  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  const event = await stripe.webhooks.constructEventAsync(payload, signature, STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.metadata?.orgId;
      const planId = session.metadata?.planId;
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

      if (!orgId || !planId || !subscriptionId) break;

      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!plan) break;

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          planId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: plan.stripePriceId,
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!org) break;

      const priceId = subscription.items.data[0]?.price.id;
      if (!priceId) break;

      const plan = await prisma.plan.findFirst({ where: { stripePriceId: priceId } });
      if (!plan) break;

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          planId: plan.id,
          stripePriceId: priceId,
          stripeSubscriptionId: subscription.id,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!org) break;

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          planId: "free",
          stripeSubscriptionId: null,
          stripePriceId: null,
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;
      if (!customerId) break;

      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!org) break;

      await prisma.systemAlert.create({
        data: {
          orgId: org.id,
          type: "payment_failed",
          message: `Payment failed for subscription. Invoice: ${invoice.id}`,
          metadata: { invoiceId: invoice.id },
        },
      });
      break;
    }
  }
}
