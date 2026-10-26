import "server-only";
import { headers } from "next/headers";

/**
 * Small in-memory fixed-window limiter. Good enough for a single app instance behind Caddy.
 * If you scale to several instances, move this to Redis or Postgres.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const ip = await clientIp();
  const k = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (buckets.size > 10_000) {
      for (const [key2, v] of buckets) if (v.resetAt < now) buckets.delete(key2);
    }
    return true;
  }
  b.count++;
  return b.count <= limit;
}
