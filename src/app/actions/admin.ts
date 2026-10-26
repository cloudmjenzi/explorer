"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings, payments, payouts, providers, reviews, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { mail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { BookingError, cancelBooking } from "@/lib/bookings";
import { confirmManualPayment, stripe } from "@/lib/payments";
import { recomputeRating } from "@/lib/queries";
import { unpaidBookings } from "@/lib/earnings";
import type { FormState } from "./session";

export async function providerDecisionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const intent = String(formData.get("intent"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const [p] = await db.select().from(providers).where(eq(providers.id, id));
  if (!p) return;
  const status = intent === "approve" ? "APPROVED" : intent === "reject" ? "REJECTED" : intent === "suspend" ? "SUSPENDED" : p.status;
  await db
    .update(providers)
    .set({ status, adminNote: note, approvedAt: status === "APPROVED" ? (p.approvedAt ?? new Date()) : p.approvedAt })
    .where(eq(providers.id, id));
  await audit(admin.id, `provider.${intent}`, "provider", id, { note });
  if (intent === "approve" || intent === "reject") await mail.providerDecision(p.email, p.businessName, intent === "approve", note);
  revalidatePath("/admin/providers");
}

export async function providerCommissionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const pct = Number(formData.get("commission"));
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) return;
  await db.update(providers).set({ commissionBps: Math.round(pct * 100) }).where(eq(providers.id, id));
  await audit(admin.id, "provider.commission", "provider", id, { pct });
  revalidatePath("/admin/providers");
}

export async function listingDecisionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const intent = String(formData.get("intent"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const [row] = await db
    .select({ l: listings, email: providers.email })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .where(eq(listings.id, id));
  if (!row) return;
  if (intent === "feature" || intent === "unfeature") {
    await db.update(listings).set({ featured: intent === "feature" }).where(eq(listings.id, id));
  } else {
    const status = intent === "approve" ? "PUBLISHED" : intent === "reject" ? "REJECTED" : intent === "unpublish" ? "PAUSED" : row.l.status;
    await db.update(listings).set({ status, adminNote: note }).where(eq(listings.id, id));
    if (intent === "approve" || intent === "reject") await mail.listingDecision(row.email, row.l.title, intent === "approve", note);
  }
  await audit(admin.id, `listing.${intent}`, "listing", id, { note });
  revalidatePath("/admin/listings");
}

export async function confirmManualPaymentAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const [b] = await db.select().from(bookings).where(eq(bookings.id, String(formData.get("bookingId"))));
  if (!b) return { error: "Booking not found" };
  if (!["AWAITING_MANUAL_PAYMENT", "EXPIRED"].includes(b.status)) return { error: "This booking isn't waiting for a manual payment." };
  const payerRef = String(formData.get("payerRef") ?? "").trim();
  if (payerRef.length < 3) return { error: "Enter the transaction ID from the statement." };
  const dup = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.payerRef, payerRef), eq(payments.status, "SUCCEEDED")));
  if (dup.length) return { error: "That transaction ID was already used to confirm another booking." };
  await confirmManualPayment(b, payerRef, admin.id);
  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings?confirmed=${b.ref}`);
}

export async function adminCancelAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    await cancelBooking(String(formData.get("bookingId")), "admin", admin.id, String(formData.get("reason") ?? "") || "Cancelled by support");
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
  }
  revalidatePath("/admin/bookings");
}

export async function refundProcessedAction(formData: FormData) {
  const admin = await requireAdmin();
  const [b] = await db.select().from(bookings).where(eq(bookings.id, String(formData.get("bookingId"))));
  if (!b || b.refundStatus !== "DUE") return;
  // Stripe refunds can be issued automatically; DPO and mobile money are refunded by finance, then marked here.
  if (formData.get("auto") === "1") {
    const [p] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, b.id), eq(payments.gateway, "STRIPE"), eq(payments.status, "SUCCEEDED")));
    if (p?.externalRef) {
      const session = await stripe().checkout.sessions.retrieve(p.externalRef);
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (pi) await stripe().refunds.create({ payment_intent: pi, amount: Math.round((p.amountMinor * b.refundThebe) / p.amountThebe) });
    }
  }
  await db.update(bookings).set({ refundStatus: "PROCESSED" }).where(eq(bookings.id, b.id));
  await audit(admin.id, "booking.refunded", "booking", b.id, { refundThebe: b.refundThebe });
  revalidatePath("/admin/bookings");
}

export async function createPayoutAction(formData: FormData) {
  const admin = await requireAdmin();
  const providerId = String(formData.get("providerId"));
  const rows = await unpaidBookings(providerId);
  if (!rows.length) return;
  const amount = rows.reduce((s, r) => s + r.owed, 0);
  await db.transaction(async (tx) => {
    const [p] = await tx.insert(payouts).values({ providerId, amountThebe: amount }).returning();
    await tx.update(bookings).set({ payoutId: p.id }).where(inArray(bookings.id, rows.map((r) => r.booking.id)));
  });
  await audit(admin.id, "payout.created", "provider", providerId, { amount });
  revalidatePath("/admin/payouts");
}

export async function markPayoutPaidAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return;
  await db.update(payouts).set({ status: "PAID", paidAt: new Date(), reference }).where(eq(payouts.id, id));
  await audit(admin.id, "payout.paid", "payout", id, { reference });
  revalidatePath("/admin/payouts");
}

export async function reviewVisibilityAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const hidden = formData.get("hidden") === "1";
  const [r] = await db.update(reviews).set({ hidden }).where(eq(reviews.id, id)).returning();
  if (r) await recomputeRating(r.listingId);
  await audit(admin.id, hidden ? "review.hidden" : "review.shown", "review", id);
  revalidatePath("/admin/reviews");
}

export async function setRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  if (id === admin.id || !["TOURIST", "PROVIDER", "ADMIN"].includes(role)) return;
  await db.update(users).set({ role: role as "TOURIST" | "PROVIDER" | "ADMIN" }).where(eq(users.id, id));
  await audit(admin.id, "user.role", "user", id, { role });
  revalidatePath("/admin/users");
}
