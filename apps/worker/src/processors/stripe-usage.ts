import Stripe from "stripe";
import { prisma } from "@signaldesk/db";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_OVERAGE_METER_EVENT = process.env.STRIPE_OVERAGE_METER_EVENT ?? "overage_events";

export async function reportOverageUsage(orgId: string, overageEvents: number): Promise<void> {
  if (!STRIPE_SECRET_KEY || overageEvents <= 0) return;

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!org.stripeCustomerId || !org.stripeSubscriptionId) return;

  await stripe.billing.meterEvents.create({
    event_name: STRIPE_OVERAGE_METER_EVENT,
    payload: {
      stripe_customer_id: org.stripeCustomerId,
      value: String(Math.ceil(overageEvents / 1000)),
    },
  });

  console.log(`[Stripe] Reported ${overageEvents} overage events for org ${orgId}`);
}
