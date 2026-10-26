import { asc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { regions } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { CATEGORIES } from "@/lib/catalog";
import { ListingForm } from "@/components/ListingForm";

export default async function NewListing() {
  const { provider } = await currentProvider();
  const rs = await db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(asc(regions.sort));
  return (
    <div className="max-w-3xl">
      <Link href="/provider/listings" className="link text-[15px]">Listings</Link>
      <h1 className="mb-6 mt-2 text-[30px] font-extrabold">New listing</h1>
      <ListingForm
        regions={rs}
        categories={CATEGORIES}
        commissionPct={provider.commissionBps / 100}
        defaults={{ regionId: provider.regionId }}
      />
    </div>
  );
}
