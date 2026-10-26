"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings, reviews } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { BookingError, cancelBooking, createBooking } from "@/lib/bookings";
import { startCardPayment } from "@/lib/payments";
import { rateLimit } from "@/lib/ratelimit";
import { recomputeRating } from "@/lib/queries";
import { audit } from "@/lib/audit";
import type { FormState } from "./session";

const bookSchema = z.object({
  listingId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  guests: z.coerce.number().int().min(1).max(200),
  payDeposit: z.enum(["0", "1"]).transform((v) => v === "1"),
  leadName: z.string().trim().min(2, "Enter the lead guest's full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a phone number with country code").max(30),
  country: z.string().trim().min(2, "Choose a country").max(60),
  notes: z.string().trim().max(1000).optional(),
  method: z.enum(["CARD", "ORANGE_MONEY", "MYZAKA", "SMEGA", "BANK_TRANSFER"], { message: "Choose how you'll pay" }),
  terms: z.literal("on", { message: "Accept the booking terms to continue" }),
});

export async function bookAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("book", 20, 3600))) return { error: "Too many booking attempts. Try again in an hour." };
  const parsed = bookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await getUser();
  const d = parsed.data;
  let redirectTo: string;
  try {
    const booking = await createBooking({ ...d, userId: user?.id ?? null });
    if (booking.method === "CARD") {
      const [l] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, booking.listingId));
      redirectTo = await startCardPayment(booking, l.title);
    } else {
      redirectTo = `/bookings/${booking.ref}?t=${booking.manageToken}&new=1`;
    }
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    console.error("booking failed", err);
    return { error: "We couldn't start the payment. Your card hasn't been charged. Try again, or choose mobile money." };
  }
  redirect(redirectTo);
}

async function bookingByToken(ref: string, token: string) {
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.ref, ref), eq(bookings.manageToken, token)))
    .limit(1);
  return b ?? null;
}

export async function retryPaymentAction(formData: FormData) {
  const b = await bookingByToken(String(formData.get("ref")), String(formData.get("t")));
  if (!b || b.status !== "PENDING_PAYMENT" || !b.expiresAt || b.expiresAt < new Date()) redirect("/trips");
  const [l] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, b.listingId));
  const url = await startCardPayment(b, l.title);
  redirect(url);
}

export async function cancelByGuestAction(formData: FormData) {
  const ref = String(formData.get("ref"));
  const t = String(formData.get("t"));
  const b = await bookingByToken(ref, t);
  if (!b) redirect("/trips");
  const user = await getUser();
  try {
    await cancelBooking(b.id, "tourist", user?.id ?? null, "Cancelled by guest");
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
  }
  redirect(`/bookings/${ref}?t=${t}`);
}

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5),
  body: z.string().trim().min(20, "Write at least a sentence or two (20+ characters)").max(2000),
});

export async function reviewAction(_: FormState, formData: FormData): Promise<FormState> {
  const b = await bookingByToken(String(formData.get("ref")), String(formData.get("t")));
  if (!b || b.status !== "COMPLETED") return { error: "You can review once your experience has taken place." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const firstName = b.leadName.split(" ")[0];
  const inserted = await db
    .insert(reviews)
    .values({ bookingId: b.id, listingId: b.listingId, author: firstName, country: b.country, ...parsed.data })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) return { error: "You've already reviewed this booking." };
  await recomputeRating(b.listingId);
  await audit(b.userId, "review.created", "listing", b.listingId, { bookingId: b.id });
  return { ok: "Thanks. Your review is live." };
}
