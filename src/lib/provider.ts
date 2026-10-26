import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { requireProvider } from "./auth";

export async function currentProvider() {
  const user = await requireProvider();
  const [p] = await db.select().from(providers).where(eq(providers.id, user.provider.id));
  return { user, provider: p };
}
