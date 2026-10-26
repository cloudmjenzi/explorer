import Link from "next/link";
import { BotswanaMap } from "@/components/BotswanaMap";
import { ListingCard } from "@/components/ui";
import { regionsWithCounts, searchListings, minPriceByCategory } from "@/lib/queries";
import { CATEGORIES } from "@/lib/catalog";
import { formatBwp, formatIn } from "@/lib/money";
import { displayCurrency } from "@/lib/currency";
import { config } from "@/lib/config";

export default async function Home() {
  const [regions, featured, catStats, cur] = await Promise.all([
    regionsWithCounts(),
    searchListings({ limit: 6 }),
    minPriceByCategory(),
    displayCurrency(),
  ]);
  const catMap = new Map(catStats.map((c) => [c.category, c]));
  const liveCats = CATEGORIES.filter((c) => catMap.has(c.value));

  return (
    <>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:py-14">
          <div>
            <h1 className="text-[42px] font-extrabold leading-[1.02] sm:text-[58px]">
              Book Botswana with the people who guide it.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[18px] text-ink-2">
              Mokoro trips, game drives, scenic flights and cultural visits from licensed local operators, from the
              Okavango Delta to the Kgalagadi.
            </p>
            <form action="/explore" className="mt-8 grid gap-3 rounded-lg border border-line bg-pan p-4 sm:grid-cols-[1.3fr_1fr_auto]">
              <div>
                <label htmlFor="h-region" className="field-label">Where</label>
                <select id="h-region" name="region" className="input">
                  <option value="">Anywhere in Botswana</option>
                  {regions.map((r) => (
                    <option key={r.slug} value={r.slug}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="h-cat" className="field-label">What</label>
                <select id="h-cat" name="category" className="input">
                  <option value="">Any experience</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.plural}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary self-end py-3">Search</button>
            </form>
          </div>
          <div className="relative">
            <BotswanaMap regions={regions} className="mx-auto h-auto w-full max-w-[560px]" />
            <p className="absolute bottom-1 left-1 text-[13px] text-ink-3">Pick a region on the map</p>
          </div>
        </div>
      </section>

      {featured.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-[30px] font-extrabold">Start with these</h2>
            <Link href="/explore" className="link text-[15px]">See all {featured.total}</Link>
          </div>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.map((l) => (
              <ListingCard key={l.slug} l={l} approx={cur === "BWP" ? null : `≈ ${formatIn(l.priceThebe, cur, config.rates)}`} />
            ))}
          </div>
        </section>
      )}

      {liveCats.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
          <h2 className="mb-5 text-[30px] font-extrabold">Ways to see it</h2>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {liveCats.map((c) => {
              const s = catMap.get(c.value)!;
              return (
                <li key={c.value} className="bg-paper">
                  <Link href={`/explore?category=${c.value}`} className="flex items-baseline justify-between gap-3 px-5 py-4 hover:bg-sky-soft">
                    <span className="text-[17px] font-bold">{c.plural}</span>
                    <span className="text-[14px] text-ink-2">From {formatBwp(s.min)}, {s.n} to book</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="mb-2 text-[30px] font-extrabold">When to go where</h2>
        <p className="mb-6 max-w-[60ch] text-ink-2">
          Botswana runs on water. The Delta floods in the dry winter, the pans fill in summer. Plan the region around
          the month.
        </p>
        <div className="divide-y divide-line border-y border-line">
          {regions.map((r) => (
            <Link key={r.slug} href={`/regions/${r.slug}`} className="grid gap-1 py-4 hover:bg-paper sm:grid-cols-[16rem_1fr_6rem] sm:gap-6 sm:px-2">
              <span className="font-display text-[19px] font-bold">{r.name}</span>
              <span className="text-[15px] text-ink-2">{r.bestTime}</span>
              <span className="text-[14px] text-ink-2 sm:text-right">
                {r.count > 0 ? `${r.count} to book` : "Coming soon"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid gap-8 rounded-lg bg-ink px-6 py-10 text-white sm:px-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-[30px] font-extrabold">Run tours, a camp or transfers?</h2>
            <p className="mt-3 max-w-[50ch] text-white/80">
              List for free and pay commission only on confirmed bookings. Guests pay by card or mobile money, and you
              get paid out in pula to your bank or wallet.
            </p>
          </div>
          <div className="flex flex-col items-start justify-center gap-3 lg:items-end">
            <Link href="/partners" className="btn bg-white text-ink hover:bg-sky-soft">How it works for operators</Link>
            <p className="text-[14px] text-white/70">Approval takes about 2 working days.</p>
          </div>
        </div>
      </section>
    </>
  );
}
