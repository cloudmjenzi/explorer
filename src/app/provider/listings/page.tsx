import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { listingImages, listings } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { formatBwp } from "@/lib/money";
import { categoryLabel } from "@/lib/catalog";
import { Photo, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { listingStatusAction } from "@/app/actions/provider";

export default async function ProviderListings() {
  const { provider } = await currentProvider();
  const rows = await db.select().from(listings).where(eq(listings.providerId, provider.id)).orderBy(desc(listings.updatedAt));
  const imgs = rows.length
    ? await db.select().from(listingImages).where(inArray(listingImages.listingId, rows.map((r) => r.id))).orderBy(asc(listingImages.sort))
    : [];
  const cover = (id: string) => imgs.find((i) => i.listingId === id) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[30px] font-extrabold">Listings</h1>
        <Link href="/provider/listings/new" className="btn-primary">New listing</Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-ink-2">No listings yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((l) => (
            <li key={l.id} className="panel flex flex-wrap items-center gap-4 p-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-sky-soft">
                <Photo image={cover(l.id)} category={l.category} className="h-full w-full" sizes="96px" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/provider/listings/${l.id}`} className="font-bold hover:text-delta">{l.title}</Link>
                <p className="text-[14px] text-ink-2">
                  {categoryLabel(l.category)} · {formatBwp(l.priceThebe)} {l.pricingUnit === "PER_PERSON" ? "pp" : "per group"} · {cover(l.id) ? "" : "no photos · "}
                  <StatusBadge status={l.status} />
                </p>
                {l.adminNote && (l.status === "REJECTED" || l.status === "DRAFT") && (
                  <p className="mt-1 text-[14px] text-danger">Note from review: {l.adminNote}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/provider/listings/${l.id}/availability`} className="btn-secondary py-2">Calendar</Link>
                <Link href={`/provider/listings/${l.id}`} className="btn-secondary py-2">Edit</Link>
                {(l.status === "DRAFT" || l.status === "REJECTED") && (
                  <form action={listingStatusAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <SubmitButton name="intent" value="submit" className="btn-primary py-2" pending="Sending…">Submit for review</SubmitButton>
                  </form>
                )}
                {l.status === "PUBLISHED" && (
                  <>
                    <Link href={`/experiences/${l.slug}`} className="btn-ghost py-2">View</Link>
                    <form action={listingStatusAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <SubmitButton name="intent" value="pause" className="btn-secondary py-2">Pause</SubmitButton>
                    </form>
                  </>
                )}
                {l.status === "PAUSED" && (
                  <form action={listingStatusAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <SubmitButton name="intent" value="resume" className="btn-primary py-2">Resume</SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
