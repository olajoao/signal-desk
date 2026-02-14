import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

const plans = [
  {
    id: "free",
    name: "free",
    displayName: "Free",
    priceMonthly: 0,
    eventsPerMonth: 100,
    rulesLimit: 3,
    retentionDays: 7,
    rateLimit: 30,
    overageRate: 0,
    stripePriceId: null,
  },
  {
    id: "pro",
    name: "pro",
    displayName: "Pro",
    priceMonthly: 1400,
    eventsPerMonth: 25_000,
    rulesLimit: 25,
    retentionDays: 30,
    rateLimit: 120,
    overageRate: 100,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
  },
  {
    id: "max",
    name: "max",
    displayName: "Max",
    priceMonthly: 7000,
    eventsPerMonth: 300_000,
    rulesLimit: 999,
    retentionDays: 90,
    rateLimit: 500,
    overageRate: 50,
    stripePriceId: process.env.STRIPE_MAX_PRICE_ID ?? null,
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }
  console.log("Seeded plans: free, pro, max");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
