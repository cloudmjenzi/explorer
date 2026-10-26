/**
 * Production-safe seed: regions + the first admin account.
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long passphrase' npm run seed
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { REGIONS } from "../src/db/regions";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  for (const r of REGIONS) {
    await db
      .insert(schema.regions)
      .values({ ...r })
      .onConflictDoUpdate({
        target: schema.regions.slug,
        set: { name: r.name, summary: r.summary, bestTime: r.bestTime, gateway: r.gateway, lon: r.lon, lat: r.lat, sort: r.sort },
      });
  }
  console.log(`Regions: ${REGIONS.length}`);

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (existing.length) {
      await db.update(schema.users).set({ role: "ADMIN" }).where(eq(schema.users.email, email));
      console.log(`Promoted ${email} to admin`);
    } else {
      await db.insert(schema.users).values({
        email,
        name: process.env.ADMIN_NAME ?? "Admin",
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
      });
      console.log(`Created admin ${email}`);
    }
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created");
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
