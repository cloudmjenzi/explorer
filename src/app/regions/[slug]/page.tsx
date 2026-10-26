import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotswanaMap } from "@/components/BotswanaMap";
import { ListingCard } from "@/components/ui";
import { regionsWithCounts, searchListings } from "@/lib/queries";
import { displayCurrency } from "@/lib/currency";
import { formatIn } from "@/lib/money";
import { config } from "@/lib/config";

type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const r = (await regionsWithCounts()).find((x) => x.slug === slug);
  return r ? { title: `${r.name} tours and safaris`, description: r.summary } : {};
}

export default async function RegionPage({ params }: { params: P }) {
  const { slug } = await params;
  const regions = await regionsWithCounts();
  const region = regions.find((r) => r.slug === slug);
  if (!region) notFound();
  const [{ items, total }, cur] = await Promise.all([searchListings({ region: slug, limit: 48 }), displayCurrency()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <Link href="/regions" className="link text-[15px]">All regions</Link>
          <h1 className="mt-3 text-[40px] font-extrabold sm:text-[50px]">{region.name}</h1>
          <p className="mt-4 max-w-[60ch] text-[18px] text-ink-2">{region.summary}</p>
          <dl className="mt-6 grid gap-2 text-[15px] sm:grid-cols-[8rem_1fr]">
            <dt className="font-bold">Best time</dt>
            <dd className="text-ink-2">{region.bestTime}</dd>
            <dt className="font-bold">Fly or drive to</dt>
            <dd className="text-ink-2">{region.gateway}</dd>
          </dl>
        </div>
        <BotswanaMap regions={regions} active={region.slug} compact className="mx-auto h-auto w-full max-w-[380px]" />
      </div>
      <h2 className="mb-6 mt-14 text-[28px] font-extrabold">
        {total > 0 ? `${total} experience${total > 1 ? "s" : ""} to book` : "No experiences listed here yet"}
      </h2>
      {total === 0 ? (
        <p className="text-ink-2">
          Operators in {region.name.split(" & ")[0]} are joining now. <Link className="link" href="/partners">Run trips here? List them.</Link>
        </p>
      ) : (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.slug} l={l} approx={cur === "BWP" ? null : `≈ ${formatIn(l.priceThebe, cur, config.rates)}`} />
          ))}
        </div>
      )}
    </div>
  );
}
