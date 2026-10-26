import "server-only";
import { and, eq, inArray, isNull, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings } from "@/db/schema";
import { providerPayoutFor } from "./money";

/**
 * Bookings whose money the platform holds and must pass on to the operator:
 * completed trips, plus cancellations where the platform kept some money (partial refunds),
 * that haven't been included in a payout yet.
 */
export async function unpaidBookings(providerId?: string) {
  const rows = await db
    .select({ booking: bookings, title: listings.title, providerId: listings.providerId })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .where(
      and(
        providerId ? eq(listings.providerId, providerId) : undefined,
        isNull(bookings.payoutId),
        gt(bookings.paidThebe, 0),
        inArray(bookings.status, ["COMPLETED", "CANCELLED"]),
        // cancelled ones only once any refund is settled
        sql`(${bookings.status} = 'COMPLETED' or ${bookings.refundStatus} <> 'DUE')`,
      ),
    );
  return rows
    .map((r) => ({ ...r, owed: providerPayoutFor(r.booking.paidThebe, r.booking.commissionThebe, r.booking.refundThebe) }))
    .filter((r) => r.owed > 0);
}

export async function upcomingPayable(providerId: string) {
  const rows = await db
    .select({ paid: bookings.paidThebe, commission: bookings.commissionThebe })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .where(and(eq(listings.providerId, providerId), eq(bookings.status, "CONFIRMED")));
  return rows.reduce((s, r) => s + providerPayoutFor(r.paid, r.commission), 0);
}
