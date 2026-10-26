import { timingSafeEqual } from "node:crypto";
import { runHousekeeping } from "@/lib/bookings";
import { config } from "@/lib/config";

/** Called by the cron container: expires unpaid holds, completes past trips, sends review requests. */
export async function POST(req: Request) {
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(config.cronSecret);
  if (!config.cronSecret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await runHousekeeping();
  return Response.json(result);
}
