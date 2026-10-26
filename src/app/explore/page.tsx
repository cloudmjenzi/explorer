import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard, PageHeader } from "@/components/ui";
import { regionsWithCounts, searchListings, type SearchFilters } from "@/lib/queries";
import { CATEGORIES } from "@/lib/catalog";
import { formatIn } from "@/lib/money";
import { displayCurrency } from "@/lib/currency";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Explore experiences",
  description: "Search safaris, mokoro trips, scenic flights and cultural experiences across Botswana.",
};

const PAGE = 24;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Explore({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const page = Math.max(1, Number(s("page") ?? 1) || 1);
  const filters: SearchFilters = {
    q: s("q"),
    region: s("region"),
    category: s("category"),
    maxPrice: Number(s("max")) || undefined,
    sort: (s("sort") as SearchFilters["sort"]) ?? "recommended",
    limit: PAGE,
    offset: (page - 1) * PAGE,
  };
  const [regions, { items, total }, cur] = await Promise.all([regionsWithCounts(), searchListings(filters), displayCurrency()]);
  const region = regions.find((r) => r.slug === filters.region);
  const cat = CATEGORIES.find((c) => c.value === filters.category);
  const title = cat && region ? `${cat.plural} in ${region.name}` : cat ? cat.plural : region ? region.name : "All experiences";
  const pages = Math.ceil(total / PAGE);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") u.set(k, v);
    if (p > 1) u.set("page", String(p));
    return `/explore${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title={title} intro={`${total} experience${total === 1 ? "" : "s"} you can book now.`} />
      <form className="mb-10 grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.9fr_auto]">
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" defaultValue={filters.q} className="input" placeholder="Mokoro, Moremi, sunset…" />
        </div>
        <div>
          <label htmlFor="region" className="field-label">Region</label>
          <select id="region" name="region" defaultValue={filters.region ?? ""} className="input">
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="category" className="field-label">Type</label>
          <select id="category" name="category" defaultValue={filters.category ?? ""} className="input">
            <option value="">All types</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.plural}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="max" className="field-label">Max price (P)</label>
          <input id="max" name="max" type="number" min="0" step="50" inputMode="numeric" defaultValue={filters.maxPrice} className="input" />
        </div>
        <div>
          <label htmlFor="sort" className="field-label">Sort</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="input">
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="rating">Best rated</option>
          </select>
        </div>
        <button className="btn-primary self-end py-3">Update</button>
      </form>

      {items.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-display text-[22px] font-bold">Nothing matches those filters yet</p>
          <p className="mt-2 text-ink-2">Try another region or type. New operators join every week.</p>
          <Link href="/explore" className="btn-secondary mt-5">Clear filters</Link>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.slug} l={l} approx={cur === "BWP" ? null : `≈ ${formatIn(l.priceThebe, cur, config.rates)}`} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Pagination">
          {page > 1 && <Link className="btn-secondary" href={qs(page - 1)}>Previous</Link>}
          <span className="text-[15px] text-ink-2">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-secondary" href={qs(page + 1)}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
