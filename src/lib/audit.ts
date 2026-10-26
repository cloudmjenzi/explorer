import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({ actorId, action, entity, entityId, meta: meta ?? null });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
