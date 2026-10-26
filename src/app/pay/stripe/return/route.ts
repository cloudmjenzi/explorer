import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { verifyStripe } from "@/lib/payments";
import { config } from "@/lib/config";

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
    result = await verifyStripe(paymentId);
  } catch (err) {
    console.error("Stripe verify failed", err);
  }
  return NextResponse.redirect(`${config.appUrl}/bookings/${row.ref}?t=${row.token}&paid=${result === "paid" ? "1" : result}`);
}
