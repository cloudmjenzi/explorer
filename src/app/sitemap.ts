import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, providers, regions } from "@/db/schema";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ls, rs] = await Promise.all([
    db
      .select({ slug: listings.slug, updatedAt: listings.updatedAt })
      .from(listings)
      .innerJoin(providers, eq(providers.id, listings.providerId))
      .where(and(eq(listings.status, "PUBLISHED"), eq(providers.status, "APPROVED"))),
    db.select({ slug: regions.slug }).from(regions),
  ]);
  const u = config.appUrl;
  return [
    { url: `${u}/`, changeFrequency: "daily", priority: 1 },
    { url: `${u}/explore`, changeFrequency: "daily" },
    { url: `${u}/regions` },
    { url: `${u}/partners` },
    ...rs.map((r) => ({ url: `${u}/regions/${r.slug}`, changeFrequency: "weekly" as const })),
    ...ls.map((l) => ({ url: `${u}/experiences/${l.slug}`, lastModified: l.updatedAt })),
  ];
}
