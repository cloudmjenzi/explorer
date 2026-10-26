"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { blockedDates, bookings, listingImages, listings, providers, regions, reviews, users } from "@/db/schema";
import { requireProvider, requireUser } from "@/lib/auth";
import { uniqueSlug } from "@/lib/slug";
import { config } from "@/lib/config";
import { mail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { deleteUpload, saveListingPhoto } from "@/lib/uploads";
import { BookingError, cancelBooking } from "@/lib/bookings";
import { isIsoDate, addDays } from "@/lib/dates";
import type { FormState } from "./session";

const phone = z.string().trim().min(7, "Enter a phone number with country code").max(30);

const profileSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(100),
  about: z.string().trim().min(40, "Tell travellers about your business in at least a few sentences (40+ characters)").max(2000),
  phone,
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid business email"),
  regionId: z.string().min(1, "Choose your main region"),
  licenceNumber: z.string().trim().min(3, "Enter your Botswana Tourism Organisation licence number").max(50),
  cipaNumber: z.string().trim().max(50).optional(),
  payoutMethod: z.enum(["BANK", "ORANGE_MONEY", "MYZAKA", "SMEGA"]),
  payoutDetails: z.string().trim().min(6, "Enter the account or wallet you want to be paid into").max(500),
});

export async function applyAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/partners/apply");
  if (user.provider) redirect("/provider");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (formData.get("agree") !== "on") return { error: "Accept the operator terms to continue." };
  const [region] = await db.select().from(regions).where(eq(regions.id, parsed.data.regionId));
  if (!region) return { error: "Choose your main region" };
  const [p] = await db
    .insert(providers)
    .values({
      ...parsed.data,
      whatsapp: parsed.data.whatsapp || null,
      cipaNumber: parsed.data.cipaNumber || null,
      userId: user.id,
      slug: uniqueSlug(parsed.data.businessName),
      commissionBps: config.defaultCommissionBps,
    })
    .returning();
  if (user.role === "TOURIST") await db.update(users).set({ role: "PROVIDER" }).where(eq(users.id, user.id));
  await audit(user.id, "provider.applied", "provider", p.id);
  await mail.providerApplicationReceived(p.email, p.businessName);
  await mail.adminAlert(`New operator application: ${p.businessName}`, [
    `${p.businessName}, ${region.name}. Licence ${p.licenceNumber}.`,
  ]);
  redirect("/provider?welcome=1");
}

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireProvider();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db
    .update(providers)
    .set({ ...parsed.data, whatsapp: parsed.data.whatsapp || null, cipaNumber: parsed.data.cipaNumber || null })
    .where(eq(providers.id, user.provider.id));
  await audit(user.id, "provider.updated", "provider", user.provider.id);
  revalidatePath("/provider", "layout");
  return { ok: "Profile saved." };
}

/* ---------- Listings ---------- */

const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

const listingSchema = z.object({
  title: z.string().trim().min(8, "Give the experience a descriptive title (8+ characters)").max(90),
  category: z.enum(["GAME_DRIVE", "MOKORO", "BOAT_CRUISE", "SCENIC_FLIGHT", "WALKING_SAFARI", "HORSEBACK", "FISHING", "CULTURAL", "MULTI_DAY", "TRANSFER", "STAY"]),
  regionId: z.string().min(1, "Choose a region"),
  summary: z.string().trim().min(40, "Write a summary of at least 40 characters").max(300),
  description: z.string().trim().min(100, "Describe the experience in at least 100 characters").max(6000),
  meetingPoint: z.string().trim().min(5, "Say where guests meet you").max(300),
  durationLabel: z.string().trim().min(2, "Say how long it lasts").max(40),
  price: z.coerce.number().positive("Enter a price in pula").max(1_000_000),
  pricingUnit: z.enum(["PER_PERSON", "PER_GROUP"]),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(500),
  minGuests: z.coerce.number().int().min(1).max(100),
  maxGroupSize: z.coerce.number().int().min(1).max(100),
  startTimes: z
    .string()
    .transform((s) => Array.from(new Set(s.split(/[,\s]+/).filter(Boolean))).sort())
    .refine((a) => a.length > 0 && a.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)), "Enter start times like 06:00, 15:30"),
  leadTimeHours: z.coerce.number().int().min(0).max(24 * 60),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]),
  depositPercent: z.coerce.number().int().min(0).max(100),
});

async function ownListing(providerId: string, listingId: string) {
  const [l] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.providerId, providerId)))
    .limit(1);
  return l ?? null;
}

export async function saveListingAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireProvider();
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const days = formData.getAll("operatingDays").map(Number).filter((d) => d >= 0 && d <= 6);
  if (!days.length) return { error: "Choose at least one day the experience runs." };
  const d = parsed.data;
  if (d.minGuests > (d.pricingUnit === "PER_PERSON" ? d.capacity : d.maxGroupSize)) {
    return { error: "Minimum guests can't be more than the group size." };
  }
  const values = {
    title: d.title,
    category: d.category,
    regionId: d.regionId,
    summary: d.summary,
    description: d.description,
    meetingPoint: d.meetingPoint,
    durationLabel: d.durationLabel,
    priceThebe: Math.round(d.price * 100),
    pricingUnit: d.pricingUnit,
    capacity: d.capacity,
    minGuests: d.minGuests,
    maxGroupSize: d.maxGroupSize,
    startTimes: d.startTimes,
    operatingDays: days.sort(),
    leadTimeHours: d.leadTimeHours,
    cancellationPolicy: d.cancellationPolicy,
    depositPercent: d.depositPercent,
    highlights: lines(formData.get("highlights")),
    included: lines(formData.get("included")),
    excluded: lines(formData.get("excluded")),
  };
  const id = String(formData.get("id") ?? "");
  let listingId = id;
  if (id) {
    const existing = await ownListing(user.provider.id, id);
    if (!existing) return { error: "Listing not found." };
    await db.update(listings).set(values).where(eq(listings.id, id));
    await audit(user.id, "listing.updated", "listing", id);
  } else {
    const [created] = await db
      .insert(listings)
      .values({ ...values, providerId: user.provider.id, slug: uniqueSlug(`${d.title}`) })
      .returning();
    listingId = created.id;
    await audit(user.id, "listing.created", "listing", created.id);
  }

  // Photos
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(listingImages)
      .where(eq(listingImages.listingId, listingId));
    if (n + files.length > 12) return { error: `You can have up to 12 photos. You have ${n}.` };
    let sort = n;
    for (const f of files) {
      try {
        const saved = await saveListingPhoto(f);
        await db.insert(listingImages).values({ listingId, ...saved, alt: `${d.title}, photo ${sort + 1}`, sort: sort++ });
      } catch (err) {
        return { error: `${f.name}: ${(err as Error).message}` };
      }
    }
  }
  revalidatePath("/provider/listings");
  if (!id) redirect(`/provider/listings/${listingId}?created=1`);
  return { ok: "Saved." };
}

export async function deletePhotoAction(formData: FormData) {
  const user = await requireProvider();
  const imageId = String(formData.get("imageId"));
  const [img] = await db
    .select({ img: listingImages, providerId: listings.providerId })
    .from(listingImages)
    .innerJoin(listings, eq(listings.id, listingImages.listingId))
    .where(eq(listingImages.id, imageId));
  if (!img || img.providerId !== user.provider.id) return;
  await db.delete(listingImages).where(eq(listingImages.id, imageId));
  await deleteUpload(img.img.path);
  revalidatePath(`/provider/listings/${img.img.listingId}`);
}

export async function coverPhotoAction(formData: FormData) {
  const user = await requireProvider();
  const imageId = String(formData.get("imageId"));
  const [img] = await db
    .select({ listingId: listingImages.listingId, providerId: listings.providerId })
    .from(listingImages)
    .innerJoin(listings, eq(listings.id, listingImages.listingId))
    .where(eq(listingImages.id, imageId));
  if (!img || img.providerId !== user.provider.id) return;
  const all = await db.select().from(listingImages).where(eq(listingImages.listingId, img.listingId)).orderBy(asc(listingImages.sort));
  const ordered = [all.find((i) => i.id === imageId)!, ...all.filter((i) => i.id !== imageId)];
  for (let i = 0; i < ordered.length; i++) await db.update(listingImages).set({ sort: i }).where(eq(listingImages.id, ordered[i].id));
  revalidatePath(`/provider/listings/${img.listingId}`);
}

export async function listingStatusAction(formData: FormData) {
  const user = await requireProvider();
  const l = await ownListing(user.provider.id, String(formData.get("id")));
  if (!l) return;
  const intent = String(formData.get("intent"));
  let status = l.status;
  if (intent === "submit" && (l.status === "DRAFT" || l.status === "REJECTED")) status = "PENDING_REVIEW";
  if (intent === "pause" && l.status === "PUBLISHED") status = "PAUSED";
  if (intent === "resume" && l.status === "PAUSED") status = "PUBLISHED";
  if (status !== l.status) {
    await db.update(listings).set({ status, adminNote: intent === "submit" ? null : l.adminNote }).where(eq(listings.id, l.id));
    await audit(user.id, `listing.${intent}`, "listing", l.id);
    if (intent === "submit") await mail.adminAlert(`Listing to review: ${l.title}`, [`From ${user.provider.businessName}.`]);
  }
  revalidatePath("/provider/listings");
  revalidatePath(`/provider/listings/${l.id}`);
}

/* ---------- Availability ---------- */

export async function blockDatesAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireProvider();
  const l = await ownListing(user.provider.id, String(formData.get("id")));
  if (!l) return { error: "Listing not found." };
  const from = String(formData.get("from"));
  const to = String(formData.get("to") || from);
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) return { error: "Choose a valid date range." };
  const reason = String(formData.get("reason") ?? "").slice(0, 120) || null;
  let d = from;
  let n = 0;
  while (d <= to && n < 370) {
    await db.insert(blockedDates).values({ listingId: l.id, date: d, reason }).onConflictDoNothing();
    d = addDays(d, 1);
    n++;
  }
  revalidatePath(`/provider/listings/${l.id}/availability`);
  const [{ booked }] = await db
    .select({ booked: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.listingId, l.id), eq(bookings.status, "CONFIRMED"), sql`${bookings.date} between ${from} and ${to}`));
  return {
    ok: `Blocked ${n} day${n > 1 ? "s" : ""}.${booked ? ` Note: ${booked} confirmed booking${booked > 1 ? "s" : ""} already fall in this range. Blocking doesn't cancel them.` : ""}`,
  };
}

export async function unblockDateAction(formData: FormData) {
  const user = await requireProvider();
  const l = await ownListing(user.provider.id, String(formData.get("id")));
  if (!l) return;
  await db.delete(blockedDates).where(and(eq(blockedDates.listingId, l.id), eq(blockedDates.id, String(formData.get("blockId")))));
  revalidatePath(`/provider/listings/${l.id}/availability`);
}

/* ---------- Bookings & reviews ---------- */

export async function operatorCancelAction(formData: FormData) {
  const user = await requireProvider();
  const [b] = await db
    .select({ id: bookings.id, providerId: listings.providerId })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .where(eq(bookings.id, String(formData.get("bookingId"))));
  if (!b || b.providerId !== user.provider.id) return;
  const reason = String(formData.get("reason") ?? "").slice(0, 300);
  try {
    await cancelBooking(b.id, "operator", user.id, reason ? `Operator: ${reason}` : "Cancelled by operator");
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
  }
  revalidatePath("/provider/bookings");
}

export async function replyReviewAction(formData: FormData) {
  const user = await requireProvider();
  const reviewId = String(formData.get("reviewId"));
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 1000);
  const [r] = await db
    .select({ id: reviews.id, providerId: listings.providerId })
    .from(reviews)
    .innerJoin(listings, eq(listings.id, reviews.listingId))
    .where(eq(reviews.id, reviewId));
  if (!r || r.providerId !== user.provider.id) return;
  await db.update(reviews).set({ reply: reply || null }).where(eq(reviews.id, r.id));
  revalidatePath("/provider/reviews");
}
