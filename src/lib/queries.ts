import "server-only";
import { and, asc, desc, eq, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { listingImages, listings, providers, regions, reviews, type Category } from "@/db/schema";
import type { CardListing } from "@/components/ui";
import { CATEGORIES } from "./catalog";

/** Only listings that are published AND belong to an approved operator are public. */
const publicListing = and(eq(listings.status, "PUBLISHED"), eq(providers.status, "APPROVED"));

export async function regionsWithCounts() {
  const counts = await db
    .select({ regionId: listings.regionId, n: sql<number>`count(*)::int` })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .where(publicListing)
    .groupBy(listings.regionId);
  const all = await db.select().from(regions).orderBy(asc(regions.sort));
  const m = new Map(counts.map((c) => [c.regionId, c.n]));
  return all.map((r) => ({ ...r, count: m.get(r.id) ?? 0 }));
}

async function firstImages(ids: string[]) {
  if (!ids.length) return new Map<string, { path: string; alt: string; width: number; height: number }>();
  const rows = await db
    .select()
    .from(listingImages)
    .where(inArray(listingImages.listingId, ids))
    .orderBy(asc(listingImages.sort));
  const m = new Map<string, { path: string; alt: string; width: number; height: number }>();
  for (const r of rows) if (!m.has(r.listingId)) m.set(r.listingId, r);
  return m;
}

export interface SearchFilters {
  q?: string;
  region?: string;
  category?: string;
  maxPrice?: number; // pula
  sort?: "recommended" | "price-asc" | "price-desc" | "rating";
  limit?: number;
  offset?: number;
}

export async function searchListings(f: SearchFilters): Promise<{ items: CardListing[]; total: number }> {
  const where: SQL[] = [publicListing!];
  if (f.region) where.push(eq(regions.slug, f.region));
  if (f.category && CATEGORIES.some((c) => c.value === f.category)) where.push(eq(listings.category, f.category as Category));
  if (f.maxPrice && f.maxPrice > 0) where.push(lte(listings.priceThebe, Math.round(f.maxPrice * 100)));
  if (f.q?.trim()) {
    const term = `%${f.q.trim().replace(/[%_]/g, "")}%`;
    where.push(
      or(
        ilike(listings.title, term),
        ilike(listings.summary, term),
        ilike(regions.name, term),
        ilike(providers.businessName, term),
      )!,
    );
  }
  const order =
    f.sort === "price-asc"
      ? [asc(listings.priceThebe)]
      : f.sort === "price-desc"
        ? [desc(listings.priceThebe)]
        : f.sort === "rating"
          ? [desc(listings.ratingAvg), desc(listings.ratingCount)]
          : [desc(listings.featured), desc(sql`${listings.ratingAvg} * ln(${listings.ratingCount} + 2)`), desc(listings.createdAt)];

  const base = db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      category: listings.category,
      durationLabel: listings.durationLabel,
      priceThebe: listings.priceThebe,
      pricingUnit: listings.pricingUnit,
      ratingAvg: listings.ratingAvg,
      ratingCount: listings.ratingCount,
      regionName: regions.name,
    })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .innerJoin(regions, eq(regions.id, listings.regionId))
    .where(and(...where));

  const [rows, [{ total }]] = await Promise.all([
    base.orderBy(...order).limit(f.limit ?? 24).offset(f.offset ?? 0),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(listings)
      .innerJoin(providers, eq(providers.id, listings.providerId))
      .innerJoin(regions, eq(regions.id, listings.regionId))
      .where(and(...where)),
  ]);
  const imgs = await firstImages(rows.map((r) => r.id));
  return { items: rows.map((r) => ({ ...r, image: imgs.get(r.id) ?? null })), total };
}

export async function publicListingBySlug(slug: string) {
  const row = await db.query.listings.findFirst({
    where: eq(listings.slug, slug),
    with: {
      images: { orderBy: (i, { asc }) => [asc(i.sort)] },
      region: true,
      provider: true,
    },
  });
  if (!row || row.status !== "PUBLISHED" || row.provider.status !== "APPROVED") return null;
  return row;
}

export async function listingReviews(listingId: string, limit = 20) {
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.listingId, listingId), eq(reviews.hidden, false)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function recomputeRating(listingId: string) {
  const [r] = await db
    .select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`, n: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(eq(reviews.listingId, listingId), eq(reviews.hidden, false)));
  await db.update(listings).set({ ratingAvg: r.avg, ratingCount: r.n }).where(eq(listings.id, listingId));
}

export async function minPriceByCategory() {
  return db
    .select({ category: listings.category, n: sql<number>`count(*)::int`, min: sql<number>`min(${listings.priceThebe})::int` })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .where(publicListing)
    .groupBy(listings.category);
}

