import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

const plans = [
  {
    id: "free",
    name: "free",
    displayName: "Free",
    priceMonthly: 0,
    eventsPerMonth: 1000,
    rulesLimit: 3,
    retentionDays: 7,
    rateLimit: 60, // 60 req/min
    overageRate: 0, // no overage allowed
    stripePriceId: null,
  },
  {
    id: "pro",
    name: "pro",
    displayName: "Pro",
    priceMonthly: 2900, // $29
    eventsPerMonth: 500000,
    rulesLimit: 25,
    retentionDays: 30,
    rateLimit: 300, // 300 req/min
    overageRate: 200, // $2 per 1000 events
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
  },
  {
    id: "enterprise",
    name: "enterprise",
    displayName: "Enterprise",
    priceMonthly: 19900, // $199
    eventsPerMonth: 5000000,
    rulesLimit: 1000,
    retentionDays: 90,
    rateLimit: 1000, // 1000 req/min
    overageRate: 100, // $1 per 1000 events
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? null,
  },
];

async function main() {
  console.log("Seeding plans...");

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    console.log(`  - ${plan.displayName}: ${plan.eventsPerMonth.toLocaleString()} events/mo`);
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
