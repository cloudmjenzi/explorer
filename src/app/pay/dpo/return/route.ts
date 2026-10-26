import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { verifyDpo } from "@/lib/payments";
import { config } from "@/lib/config";

/** DPO sends the tourist back here. We verify server-to-server before trusting anything. */
export async function GET(req: Request) {
  const paymentId = new URL(req.url).searchParams.get("p") ?? "";
  const [row] = await db
    .select({ ref: bookings.ref, token: bookings.manageToken })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(eq(payments.id, paymentId));
  if (!row) return NextResponse.redirect(`${config.appUrl}/trips`);
  let result: "paid" | "pending" | "failed" = "pending";
  try {
    result = await verifyDpo(paymentId);
  } catch (err) {
    console.error("DPO verify failed", err);
  }
  const flag = result === "paid" ? "1" : result;
  return NextResponse.redirect(`${config.appUrl}/bookings/${row.ref}?t=${row.token}&paid=${flag}`);
}
