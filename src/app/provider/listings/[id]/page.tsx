import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listingImages, listings, regions } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { CATEGORIES } from "@/lib/catalog";
import { ListingForm } from "@/components/ListingForm";
import { Notice, Photo, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { coverPhotoAction, deletePhotoAction, listingStatusAction } from "@/app/actions/provider";

export default async function EditListing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const { provider } = await currentProvider();
  const [l] = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.providerId, provider.id)));
  if (!l) notFound();
  const [rs, imgs] = await Promise.all([
    db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(asc(regions.sort)),
    db.select().from(listingImages).where(eq(listingImages.listingId, l.id)).orderBy(asc(listingImages.sort)),
  ]);

  return (
    <div className="max-w-3xl">
      <Link href="/provider/listings" className="link text-[15px]">Listings</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-[30px] font-extrabold">{l.title}</h1>
        <StatusBadge status={l.status} />
      </div>
      <div className="mb-6 space-y-3">
        {created && <Notice tone="success">Listing created. Add photos, then submit it for review.</Notice>}
        {l.adminNote && l.status !== "PUBLISHED" && <Notice tone="error">Note from review: {l.adminNote}</Notice>}
        {(l.status === "DRAFT" || l.status === "REJECTED") && (
          <form action={listingStatusAction} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <input type="hidden" name="id" value={l.id} />
            <p className="text-[15px]">
              {imgs.length === 0 ? "Add at least one photo before submitting. " : ""}When it's ready, send it to us to check. Most reviews take a day.
            </p>
            <SubmitButton name="intent" value="submit" pending="Sending…">Submit for review</SubmitButton>
          </form>
        )}
        <Link href={`/provider/listings/${l.id}/availability`} className="link text-[15px]">Block dates on the calendar</Link>
      </div>

      {imgs.length > 0 && (
        <section className="panel mb-6 p-5">
          <h2 className="mb-3 font-display text-[20px] font-extrabold">Photos</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {imgs.map((img, i) => (
              <li key={img.id}>
                <div className="aspect-[4/3] overflow-hidden rounded-sm">
                  <Photo image={img} category={l.category} className="h-full w-full" sizes="200px" />
                </div>
                <div className="mt-1 flex items-center justify-between text-[13px]">
                  {i === 0 ? (
                    <span className="font-bold">Cover</span>
                  ) : (
                    <form action={coverPhotoAction}>
                      <input type="hidden" name="imageId" value={img.id} />
                      <button className="link">Make cover</button>
                    </form>
                  )}
                  <form action={deletePhotoAction}>
                    <input type="hidden" name="imageId" value={img.id} />
                    <button className="text-danger hover:underline">Remove</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ListingForm
        regions={rs}
        categories={CATEGORIES}
        commissionPct={provider.commissionBps / 100}
        defaults={{ ...l, price: l.priceThebe / 100 }}
      />
    </div>
  );
}
