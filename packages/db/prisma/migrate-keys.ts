import { createHash } from "crypto";

// Direct Prisma client for migration (uses old schema with both key and keyHash)
// Run this BEFORE dropping the `key` column
import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

async function main() {
  // Raw query to find keys that still have the old `key` column
  const keys = await prisma.$queryRaw<
    Array<{ id: string; key: string }>
  >`SELECT id, key FROM api_keys WHERE key_hash IS NULL AND key IS NOT NULL`;

  console.log(`Found ${keys.length} API keys to migrate`);

  for (const k of keys) {
    const hash = createHash("sha256").update(k.key).digest("hex");
    const prefix = k.key.slice(0, 12) + "...";

    await prisma.$executeRaw`UPDATE api_keys SET key_hash = ${hash}, prefix = ${prefix} WHERE id = ${k.id}`;
    console.log(`  Migrated key ${k.id} (${prefix})`);
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
