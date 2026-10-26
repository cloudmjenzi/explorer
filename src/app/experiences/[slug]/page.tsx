import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listingReviews, publicListingBySlug } from "@/lib/queries";
import { availabilityCalendar } from "@/lib/bookings";
import { BookingWidget } from "@/components/BookingWidget";
import { Photo, Stars } from "@/components/ui";
import { CANCELLATION, DAYS, categoryLabel } from "@/lib/catalog";
import { effectiveDepositPercent, formatBwp } from "@/lib/money";
import { displayCurrency } from "@/lib/currency";
import { config } from "@/lib/config";
import { mediaUrl } from "@/lib/media";

type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug } = await params;
  const l = await publicListingBySlug(slug);
  if (!l) return {};
  return {
    title: `${l.title}, ${l.region.name.split(" & ")[0]}`,
    description: l.summary,
    openGraph: { images: l.images[0] ? [mediaUrl(l.images[0].path)] : undefined },
  };
}

export default async function ExperiencePage({ params }: { params: P }) {
  const { slug } = await params;
  const l = await publicListingBySlug(slug);
  if (!l) notFound();
  const [availability, reviews, cur] = await Promise.all([availabilityCalendar(l, 120), listingReviews(l.id), displayCurrency()]);
  const policy = CANCELLATION[l.cancellationPolicy];
  const days = l.operatingDays.length === 7 ? "Every day" : l.operatingDays.map((d) => DAYS[d]).join(", ");
  const [hero, ...rest] = l.images;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: l.title,
    description: l.summary,
    touristType: categoryLabel(l.category),
    provider: { "@type": "Organization", name: l.provider.businessName },
    offers: { "@type": "Offer", price: (l.priceThebe / 100).toFixed(2), priceCurrency: "BWP", url: `${config.appUrl}/experiences/${l.slug}` },
    ...(l.ratingCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: l.ratingAvg.toFixed(1), reviewCount: l.ratingCount },
    }),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="text-[14px] text-ink-2" aria-label="Breadcrumb">
        <Link href="/explore" className="hover:text-delta">Explore</Link>
        <span className="mx-2">/</span>
        <Link href={`/regions/${l.region.slug}`} className="hover:text-delta">{l.region.name}</Link>
      </nav>
      <h1 className="mt-3 max-w-[22ch] text-[36px] font-extrabold sm:text-[46px]">{l.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-ink-2">
        <Stars value={l.ratingAvg} count={l.ratingCount} size="md" />
        <span>{categoryLabel(l.category)}</span>
        <span>{l.durationLabel}</span>
        <span>
          Run by <span className="font-bold text-ink">{l.provider.businessName}</span>
        </span>
      </div>

      <div className={`mt-6 grid gap-2 ${rest.length > 0 ? "sm:grid-cols-[2fr_1fr]" : ""}`}>
        <div className={`overflow-hidden rounded-md bg-sky-soft ${rest.length > 0 ? "aspect-[16/10]" : "aspect-[16/10] sm:aspect-[21/8]"}`}>
          <Photo image={hero} category={l.category} className="h-full w-full" priority sizes="(max-width: 640px) 100vw, 66vw" />
        </div>
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:grid-rows-2">
            {rest.slice(0, 2).map((img) => (
              <div key={img.id} className="aspect-[16/10] overflow-hidden rounded-md sm:aspect-auto">
                <Photo image={img} category={l.category} className="h-full w-full" sizes="33vw" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <p className="text-[19px] leading-relaxed">{l.summary}</p>

          {l.highlights.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[24px] font-extrabold">What you'll do</h2>
              <ul className="space-y-2">
                {l.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-delta" aria-hidden="true" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="prose-body mt-8 whitespace-pre-line text-[16px] text-ink">
            {l.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>

          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-[20px] font-extrabold">Included</h2>
              <ul className="space-y-1.5 text-[15px]">
                {l.included.map((x, i) => (
                  <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-mopane">✓</span>{x}</li>
                ))}
              </ul>
            </div>
            {l.excluded.length > 0 && (
              <div>
                <h2 className="mb-2 text-[20px] font-extrabold">Not included</h2>
                <ul className="space-y-1.5 text-[15px] text-ink-2">
                  {l.excluded.map((x, i) => (
                    <li key={i} className="flex gap-2"><span aria-hidden="true">–</span>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-[24px] font-extrabold">Good to know</h2>
            <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[11rem_1fr]">
              <dt className="font-bold">Meeting point</dt>
              <dd>{l.meetingPoint}</dd>
              <dt className="font-bold">Runs</dt>
              <dd>{days}, starting {l.startTimes.join(", ")}</dd>
              <dt className="font-bold">Group size</dt>
              <dd>
                {l.pricingUnit === "PER_PERSON" ? `Up to ${l.capacity} guests per departure` : `Private, up to ${l.maxGroupSize} guests per group`}
                {l.minGuests > 1 ? `, minimum ${l.minGuests}` : ""}
              </dd>
              <dt className="font-bold">Book by</dt>
              <dd>At least {l.leadTimeHours} hours before the start</dd>
              <dt className="font-bold">Cancellation</dt>
              <dd>
                {policy.label}. {policy.summary}
              </dd>
            </dl>
          </section>

          <section className="mt-10 rounded-lg border border-line bg-paper p-5">
            <h2 className="text-[20px] font-extrabold">About {l.provider.businessName}</h2>
            <p className="mt-2 text-[15px] text-ink-2">{l.provider.about}</p>
            <p className="mt-3 text-[14px] text-ink-2">
              Licensed by Botswana Tourism Organisation, licence {l.provider.licenceNumber}. Verified by our team.
            </p>
          </section>

          <section className="mt-10" id="reviews">
            <h2 className="mb-4 text-[24px] font-extrabold">
              {l.ratingCount > 0 ? `${l.ratingCount} review${l.ratingCount > 1 ? "s" : ""}` : "Reviews"}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-ink-2">No reviews yet. Only guests who booked and took part can review.</p>
            ) : (
              <ul className="space-y-6">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-line pb-6 last:border-0">
                    <div className="flex items-center gap-3 text-[15px]">
                      <span className="font-bold">{r.author}</span>
                      <span className="text-ink-2">{r.country}</span>
                      <span className="text-ochre" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>
                    </div>
                    <p className="mt-2 max-w-[68ch]">{r.body}</p>
                    {r.reply && (
                      <p className="mt-3 max-w-[64ch] border-l-2 border-line pl-4 text-[15px] text-ink-2">
                        <span className="font-bold text-ink">Reply from {l.provider.businessName}: </span>
                        {r.reply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside id="book" className="scroll-mt-4 lg:sticky lg:top-6 lg:self-start" aria-label="Book this experience">
          <BookingWidget
            listingId={l.id}
            slug={l.slug}
            priceThebe={l.priceThebe}
            pricingUnit={l.pricingUnit}
            maxGroupSize={l.maxGroupSize}
            minGuests={l.minGuests}
            capacity={l.capacity}
            depositPercent={effectiveDepositPercent(l.depositPercent, l.provider.commissionBps)}
            availability={availability}
            approxRate={cur === "BWP" ? null : { code: cur, rate: config.rates[cur] }}
          />
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3 lg:hidden">
        <p className="text-[15px]">
          <span className="font-display text-[20px] font-extrabold">{formatBwp(l.priceThebe)}</span>
          <span className="text-ink-2"> {l.pricingUnit === "PER_PERSON" ? "per person" : "per group"}</span>
        </p>
        <a href="#book" className="btn-primary">Check dates</a>
      </div>
      <div className="h-16 lg:hidden" aria-hidden="true" />
    </div>
  );
}
