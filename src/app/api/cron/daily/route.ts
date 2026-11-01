import { timingSafeEqual } from "node:crypto";
import { runHousekeeping } from "@/lib/bookings";
import { reconcileCardPayments } from "@/lib/payments";
import { config } from "@/lib/config";

/** Called by the cron container: expires unpaid holds, completes past trips, sends review requests. */
export async function POST(req: Request) {
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(config.cronSecret);
  if (!config.cronSecret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Settle any card payments first so a paid booking is never expired.
  const reconciled = config.cardGateway === "none" ? { checked: 0, paid: 0 } : await reconcileCardPayments();
  const result = await runHousekeeping();
  return Response.json({ reconciled, ...result });
}
