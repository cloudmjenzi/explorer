import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, providers, regions } from "@/db/schema";
import { formatBwp } from "@/lib/money";
import { categoryLabel, CANCELLATION } from "@/lib/catalog";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { listingDecisionAction } from "@/app/actions/admin";

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const rows = await db
    .select({ l: listings, operator: providers.businessName, operatorStatus: providers.status, region: regions.name })
    .from(listings)
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .innerJoin(regions, eq(regions.id, listings.regionId))
    .where(status ? eq(listings.status, status as "PUBLISHED") : undefined)
    .orderBy(desc(listings.updatedAt));
  return (
    <div>
      <h1 className="mb-6 text-[30px] font-extrabold">Listings</h1>
      <div className="mb-4 flex gap-2 text-[15px]">
        <Link className="btn-secondary py-1.5" href="/admin/listings?status=PENDING_REVIEW">In review</Link>
        <Link className="btn-secondary py-1.5" href="/admin/listings?status=PUBLISHED">Published</Link>
        <Link className="btn-ghost py-1.5" href="/admin/listings">All</Link>
      </div>
      <ul className="space-y-4">
        {rows.map(({ l, operator, operatorStatus, region }) => (
          <li key={l.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-[19px] font-bold">{l.title}</p>
                <p className="text-[15px] text-ink-2">
                  {operator} ({operatorStatus.toLowerCase()}) · {region} · {categoryLabel(l.category)} · {formatBwp(l.priceThebe)} {l.pricingUnit === "PER_PERSON" ? "pp" : "per group"} · {CANCELLATION[l.cancellationPolicy].label} · deposit {l.depositPercent}%
                </p>
              </div>
              <div className="flex gap-2">
                {l.featured && <span className="badge bg-sky-soft text-delta">Featured</span>}
                <StatusBadge status={l.status} />
              </div>
            </div>
            <p className="mt-2 max-w-[80ch] text-[15px]">{l.summary}</p>
            <details className="mt-2 text-[15px]">
              <summary className="cursor-pointer text-delta">Full description</summary>
              <p className="mt-2 whitespace-pre-line text-ink-2">{l.description}</p>
            </details>
            <form action={listingDecisionAction} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={l.id} />
              <div>
                <label className="field-label text-[13px]" htmlFor={`n-${l.id}`}>Note to operator</label>
                <input id={`n-${l.id}`} name="note" className="input w-72 py-2" />
              </div>
              {l.status === "PENDING_REVIEW" && (
                <>
                  <SubmitButton name="intent" value="approve" className="btn-primary py-2">Approve and publish</SubmitButton>
                  <SubmitButton name="intent" value="reject" className="btn-danger py-2">Send back</SubmitButton>
                </>
              )}
              {l.status === "PUBLISHED" && <SubmitButton name="intent" value="unpublish" className="btn-danger py-2">Unpublish</SubmitButton>}
              <SubmitButton name="intent" value={l.featured ? "unfeature" : "feature"} className="btn-secondary py-2">{l.featured ? "Unfeature" : "Feature"}</SubmitButton>
              {l.status === "PUBLISHED" && <Link href={`/experiences/${l.slug}`} className="btn-ghost py-2">View</Link>}
            </form>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-ink-2">Nothing here.</p>}
    </div>
  );
}
