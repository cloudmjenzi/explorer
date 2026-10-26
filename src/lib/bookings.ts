import "server-only";
import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  blockedDates,
  bookings,
  listings,
  payments,
  providers,
  users,
  type Booking,
  type Listing,
  type PaymentMethod,
} from "@/db/schema";
import { addDays, dayOfWeek, hoursUntil, isIsoDate, todayInBotswana } from "./dates";
import { commissionFor, dueNowFor, totalFor, unitsFor } from "./money";
import { bookingRef, secureToken } from "./ids";
import { config } from "./config";
import { mail } from "./email";
import { refundFor } from "./refunds";
import { audit } from "./audit";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Statuses that hold capacity. Pending ones only while their hold has not expired. */
function holdsCapacity(now: Date) {
  return or(
    inArray(bookings.status, ["CONFIRMED", "COMPLETED"]),
    and(inArray(bookings.status, ["PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"]), gt(bookings.expiresAt, now)),
  );
}

export interface Departure {
  time: string;
  remaining: number;
}

export async function usedUnits(
  q: Tx | typeof db,
  listing: Pick<Listing, "id" | "pricingUnit" | "maxGroupSize">,
  date: string,
): Promise<Map<string, number>> {
  const rows = await q
    .select({ startTime: bookings.startTime, guests: bookings.guests })
    .from(bookings)
    .where(and(eq(bookings.listingId, listing.id), eq(bookings.date, date), holdsCapacity(new Date())));
  const used = new Map<string, number>();
  for (const r of rows) {
    used.set(r.startTime, (used.get(r.startTime) ?? 0) + unitsFor({ ...listing, guests: r.guests }));
  }
  return used;
}

export function earliestBookableDate(leadTimeHours: number, now = new Date()): string {
  return todayInBotswana(new Date(now.getTime() + leadTimeHours * 3_600_000));
}

/** Departures with remaining capacity for a date. Empty list = not bookable that day. */
export async function departuresFor(listing: Listing, date: string): Promise<Departure[]> {
  if (!isIsoDate(date)) return [];
  if (!listing.operatingDays.includes(dayOfWeek(date))) return [];
  if (date > addDays(todayInBotswana(), 540)) return [];
  const blocked = await db
    .select({ id: blockedDates.id })
    .from(blockedDates)
    .where(and(eq(blockedDates.listingId, listing.id), eq(blockedDates.date, date)))
    .limit(1);
  if (blocked.length) return [];
  const used = await usedUnits(db, listing, date);
  return listing.startTimes
    .filter((t) => hoursUntil(date, t) >= listing.leadTimeHours)
    .map((t) => ({ time: t, remaining: listing.capacity - (used.get(t) ?? 0) }));
}

/** Next N days' availability summary for the date picker. */
export async function availabilityCalendar(listing: Listing, days = 60): Promise<Record<string, number>> {
  const start = todayInBotswana();
  const end = addDays(start, days);
  const [blockedRows, bookingRows] = await Promise.all([
    db
      .select({ date: blockedDates.date })
      .from(blockedDates)
      .where(and(eq(blockedDates.listingId, listing.id), sql`${blockedDates.date} between ${start} and ${end}`)),
    db
      .select({ date: bookings.date, startTime: bookings.startTime, guests: bookings.guests })
      .from(bookings)
      .where(
        and(
          eq(bookings.listingId, listing.id),
          sql`${bookings.date} between ${start} and ${end}`,
          holdsCapacity(new Date()),
        ),
      ),
  ]);
  const blocked = new Set(blockedRows.map((r) => r.date));
  const used = new Map<string, number>();
  for (const r of bookingRows) {
    const k = `${r.date} ${r.startTime}`;
    used.set(k, (used.get(k) ?? 0) + unitsFor({ ...listing, guests: r.guests }));
  }
  const out: Record<string, number> = {};
  for (let i = 0; i <= days; i++) {
    const d = addDays(start, i);
    if (blocked.has(d) || !listing.operatingDays.includes(dayOfWeek(d))) {
      out[d] = 0;
      continue;
    }
    let best = 0;
    for (const t of listing.startTimes) {
      if (hoursUntil(d, t) < listing.leadTimeHours) continue;
      best = Math.max(best, listing.capacity - (used.get(`${d} ${t}`) ?? 0));
    }
    out[d] = best;
  }
  return out;
}

export interface BookingRequest {
  listingId: string;
  date: string;
  startTime: string;
  guests: number;
  leadName: string;
  email: string;
  phone: string;
  country: string;
  notes?: string;
  method: PaymentMethod;
  payDeposit: boolean;
  userId?: string | null;
}

export class BookingError extends Error {}

export async function createBooking(req: BookingRequest): Promise<Booking> {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ listing: listings, provider: providers })
      .from(listings)
      .innerJoin(providers, eq(providers.id, listings.providerId))
      .where(eq(listings.id, req.listingId))
      .limit(1);
    if (!row || row.listing.status !== "PUBLISHED" || row.provider.status !== "APPROVED") {
      throw new BookingError("This experience is not available for booking.");
    }
    const listing = row.listing;
    if (!isIsoDate(req.date) || !listing.operatingDays.includes(dayOfWeek(req.date))) {
      throw new BookingError("The operator does not run this experience on that date.");
    }
    if (!listing.startTimes.includes(req.startTime)) throw new BookingError("Choose one of the listed start times.");
    if (hoursUntil(req.date, req.startTime) < listing.leadTimeHours) {
      throw new BookingError(`This experience must be booked at least ${listing.leadTimeHours} hours ahead.`);
    }
    if (req.guests < listing.minGuests) throw new BookingError(`The minimum is ${listing.minGuests} guests.`);
    if (req.method !== "CARD" && !config.manual[req.method]) throw new BookingError("That payment method is not available.");
    if (req.method === "CARD" && config.cardGateway === "none") throw new BookingError("Card payments are not available yet.");

    const blocked = await tx
      .select({ id: blockedDates.id })
      .from(blockedDates)
      .where(and(eq(blockedDates.listingId, listing.id), eq(blockedDates.date, req.date)))
      .limit(1);
    if (blocked.length) throw new BookingError("The operator is not available on that date.");

    // Serialise bookings for the same departure so two people can't take the last seat.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${listing.id}|${req.date}|${req.startTime}`}))`);
    const used = (await usedUnits(tx, listing, req.date)).get(req.startTime) ?? 0;
    const need = unitsFor({ ...listing, guests: req.guests });
    if (used + need > listing.capacity) {
      const left = listing.capacity - used;
      throw new BookingError(
        left > 0
          ? `Only ${left} ${listing.pricingUnit === "PER_PERSON" ? "places" : "vehicles"} left at ${req.startTime}.`
          : `${req.startTime} is fully booked. Try another time or date.`,
      );
    }

    const totalThebe = totalFor({ ...listing, guests: req.guests });
    const commissionBps = row.provider.commissionBps;
    const commissionThebe = commissionFor(totalThebe, commissionBps);
    const payDeposit = req.payDeposit && listing.depositPercent > 0;
    const dueNowThebe = dueNowFor(totalThebe, payDeposit, listing.depositPercent, commissionBps);
    const manual = req.method !== "CARD";
    const expiresAt = new Date(
      Date.now() + (manual ? config.holdHoursManual * 3_600_000 : config.holdMinutesCard * 60_000),
    );

    const [booking] = await tx
      .insert(bookings)
      .values({
        ref: bookingRef(),
        manageToken: secureToken(),
        listingId: listing.id,
        userId: req.userId ?? null,
        leadName: req.leadName,
        email: req.email.toLowerCase(),
        phone: req.phone,
        country: req.country,
        date: req.date,
        startTime: req.startTime,
        guests: req.guests,
        notes: req.notes || null,
        unitPriceThebe: listing.priceThebe,
        totalThebe,
        commissionBps,
        commissionThebe,
        payDeposit,
        dueNowThebe,
        method: req.method,
        status: manual ? "AWAITING_MANUAL_PAYMENT" : "PENDING_PAYMENT",
        expiresAt,
      })
      .returning();
    return { booking, listing };
  });

  if (result.booking.method !== "CARD") {
    await mail.manualPaymentInstructions(
      result.booking,
      result.listing,
      result.booking.method,
      config.manual[result.booking.method],
    );
    await mail.adminAlert(`Manual payment pending ${result.booking.ref}`, [
      `${result.booking.leadName} chose ${result.booking.method} for ${result.listing.title}.`,
      `Amount due: P${(result.booking.dueNowThebe / 100).toFixed(2)}`,
    ]);
  }
  return result.booking;
}

/**
 * Idempotently mark a payment as succeeded and confirm its booking.
 * Safe to call from a webhook and a return URL for the same payment.
 */
export async function markPaymentSucceeded(paymentId: string, confirmedBy?: string): Promise<Booking | null> {
  const outcome = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update").limit(1);
    if (!p) return null;
    if (p.status === "SUCCEEDED") return { booking: null, alreadyDone: true };
    await tx
      .update(payments)
      .set({ status: "SUCCEEDED", confirmedBy: confirmedBy ?? null })
      .where(eq(payments.id, p.id));
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, p.bookingId)).for("update").limit(1);
    const wasExpired = b.status === "EXPIRED" || b.status === "CANCELLED";
    const [updated] = await tx
      .update(bookings)
      .set({
        paidThebe: b.paidThebe + p.amountThebe,
        status: b.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
        expiresAt: null,
      })
      .where(eq(bookings.id, b.id))
      .returning();
    return { booking: updated, alreadyDone: false, wasExpired };
  });
  if (!outcome || outcome.alreadyDone || !outcome.booking) return null;
  const b = outcome.booking;
  const [ctx] = await db
    .select({ listing: listings, provider: providers })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .where(eq(listings.id, b.listingId));
  if (b.status === "CONFIRMED") {
    await mail.bookingConfirmed(b, ctx.listing, { name: ctx.provider.businessName, phone: ctx.provider.phone });
    await mail.operatorNewBooking(ctx.provider.email, b, ctx.listing);
  }
  if (outcome.wasExpired) {
    await mail.adminAlert(`Payment received after hold expired: ${b.ref}`, [
      "Check the departure is not overbooked, or refund the guest.",
    ]);
  }
  await audit(confirmedBy ?? null, "payment.succeeded", "booking", b.id, { paymentId });
  return b;
}

export async function cancelBooking(
  bookingId: string,
  by: "tourist" | "operator" | "admin",
  actorId: string | null,
  reason?: string,
): Promise<{ refundThebe: number }> {
  const res = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ booking: bookings, listing: listings, provider: providers })
      .from(bookings)
      .innerJoin(listings, eq(listings.id, bookings.listingId))
      .innerJoin(providers, eq(providers.id, listings.providerId))
      .where(eq(bookings.id, bookingId))
      .for("update", { of: bookings })
      .limit(1);
    if (!row) throw new BookingError("Booking not found.");
    const b = row.booking;
    if (!["CONFIRMED", "PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"].includes(b.status)) {
      throw new BookingError("This booking can no longer be cancelled.");
    }
    const { refundThebe } = refundFor({
      policy: row.listing.cancellationPolicy,
      paidThebe: b.paidThebe,
      date: b.date,
      startTime: b.startTime,
      cancelledBy: by,
    });
    // Commission is only kept on the non-refunded share.
    const keptShare = b.paidThebe > 0 ? (b.paidThebe - refundThebe) / b.paidThebe : 0;
    const [updated] = await tx
      .update(bookings)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason ?? `Cancelled by ${by}`,
        refundThebe,
        refundStatus: refundThebe > 0 ? "DUE" : "NONE",
        commissionThebe: Math.round(b.commissionThebe * keptShare),
        expiresAt: null,
      })
      .where(eq(bookings.id, b.id))
      .returning();
    return { updated, listing: row.listing, provider: row.provider, refundThebe, wasPaid: b.paidThebe > 0 };
  });
  if (res.wasPaid) {
    await mail.bookingCancelled(res.updated, res.listing, res.refundThebe);
    await mail.operatorCancelled(res.provider.email, res.updated, res.listing);
  }
  if (res.refundThebe > 0) {
    await mail.adminAlert(`Refund due on ${res.updated.ref}`, [`Refund P${(res.refundThebe / 100).toFixed(2)} to ${res.updated.email}.`]);
  }
  await audit(actorId, "booking.cancelled", "booking", bookingId, { by, refundThebe: res.refundThebe });
  return { refundThebe: res.refundThebe };
}

/** Housekeeping run by the daily cron and opportunistically by admin pages. */
export async function runHousekeeping(): Promise<{ expired: number; completed: number; reviewRequests: number }> {
  const now = new Date();
  const expired = await db
    .update(bookings)
    .set({ status: "EXPIRED" })
    .where(
      and(inArray(bookings.status, ["PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"]), lt(bookings.expiresAt, now)),
    )
    .returning({ id: bookings.id });

  const today = todayInBotswana(now);
  const completed = await db
    .update(bookings)
    .set({ status: "COMPLETED" })
    .where(and(eq(bookings.status, "CONFIRMED"), lt(bookings.date, today)))
    .returning();

  let reviewRequests = 0;
  const due = await db
    .select({ booking: bookings, title: listings.title })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .where(and(eq(bookings.status, "COMPLETED"), eq(bookings.reviewRequested, false)))
    .limit(200);
  for (const r of due) {
    await mail.reviewRequest(r.booking, { title: r.title });
    await db.update(bookings).set({ reviewRequested: true }).where(eq(bookings.id, r.booking.id));
    reviewRequests++;
  }
  return { expired: expired.length, completed: completed.length, reviewRequests };
}

export async function bookingsForUser(userId: string, email: string) {
  return db.query.bookings.findMany({
    where: or(eq(bookings.userId, userId), and(isNull(bookings.userId), eq(bookings.email, email.toLowerCase()))),
    with: { listing: { with: { images: true, region: true } } },
    orderBy: (b, { desc }) => [desc(b.date)],
  });
}

export async function linkGuestBookings(userId: string, email: string) {
  await db
    .update(bookings)
    .set({ userId })
    .where(and(isNull(bookings.userId), eq(bookings.email, email.toLowerCase())));
}

export async function operatorEmailFor(listingId: string): Promise<string | null> {
  const [r] = await db
    .select({ email: providers.email, userEmail: users.email })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .innerJoin(users, eq(users.id, providers.userId))
    .where(eq(listings.id, listingId));
  return r?.email ?? r?.userEmail ?? null;
}
