import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { publicListingBySlug } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { departuresFor } from "@/lib/bookings";
import { BookForm } from "@/components/BookForm";
import { Notice, Photo } from "@/components/ui";
import { CANCELLATION, COUNTRIES, PAYMENT_METHODS } from "@/lib/catalog";
import { dueNowFor, formatBwp, totalFor } from "@/lib/money";
import { formatDate, isIsoDate } from "@/lib/dates";
import { availableMethods } from "@/lib/payments";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Book", robots: { index: false } };

type P = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | undefined>>;

export default async function BookPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const { slug } = await params;
  const sp = await searchParams;
  const l = await publicListingBySlug(slug);
  if (!l) notFound();
  const date = sp.date ?? "";
  const time = sp.time ?? "";
  const guests = Math.max(1, Math.floor(Number(sp.guests) || 1));
  if (!isIsoDate(date) || !/^\d{2}:\d{2}$/.test(time)) redirect(`/experiences/${slug}`);

  const [departures, user] = await Promise.all([departuresFor(l, date), getUser()]);
  const dep = departures.find((d) => d.time === time);
  const payDeposit = sp.deposit === "1" && l.depositPercent > 0;
  const total = totalFor({ ...l, guests });
  const dueNow = dueNowFor(total, payDeposit, l.depositPercent, l.provider.commissionBps);
  const methods = availableMethods();
  const methodOptions = [
    ...(methods.card
      ? [{ value: "CARD", label: PAYMENT_METHODS.CARD.label, hint: "Secure card payment. You're confirmed immediately." }]
      : []),
    ...methods.manual.map((m) => ({
      value: m,
      label: PAYMENT_METHODS[m as keyof typeof PAYMENT_METHODS].label,
      hint: `Send ${formatBwp(dueNow)} within ${config.holdHoursManual} hours. We confirm once it arrives.`,
    })),
  ];
  const unavailable = !dep || dep.remaining <= 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={`/experiences/${l.slug}`} className="link text-[15px]">Back to {l.title}</Link>
      <h1 className="mb-8 mt-3 text-[34px] font-extrabold">Confirm and pay</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          {unavailable ? (
            <Notice tone="warning">
              {time} on {formatDate(date)} is no longer available.{" "}
              <Link href={`/experiences/${l.slug}`} className="link">Choose another time</Link>.
            </Notice>
          ) : (
            <BookForm
              hidden={{ listingId: l.id, date, startTime: time, guests: String(guests), payDeposit: payDeposit ? "1" : "0" }}
              defaults={{ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", country: user?.country ?? "" }}
              countries={COUNTRIES}
              methods={methodOptions}
              dueNow={formatBwp(dueNow)}
            />
          )}
        </div>
        <aside className="panel h-fit overflow-hidden">
          <div className="aspect-[16/9] bg-sky-soft">
            <Photo image={l.images[0]} category={l.category} className="h-full w-full" sizes="360px" />
          </div>
          <div className="p-5">
            <p className="font-display text-[19px] font-bold">{l.title}</p>
            <p className="text-[14px] text-ink-2">{l.provider.businessName}</p>
            <dl className="mt-4 space-y-2 text-[15px]">
              <div className="flex justify-between gap-4"><dt className="text-ink-2">Date</dt><dd className="text-right">{formatDate(date)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">Start</dt><dd>{time}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">Guests</dt><dd>{guests}</dd></div>
              <div className="flex justify-between gap-4 border-t border-line pt-2"><dt className="font-bold">Total</dt><dd className="font-bold">{formatBwp(total)}</dd></div>
              {dueNow < total && (
                <>
                  <div className="flex justify-between gap-4"><dt>Pay now (deposit)</dt><dd className="font-bold">{formatBwp(dueNow)}</dd></div>
                  <div className="flex justify-between gap-4 text-ink-2"><dt>Pay your guide on the day</dt><dd>{formatBwp(total - dueNow)}</dd></div>
                </>
              )}
            </dl>
            <p className="mt-4 text-[13px] text-ink-2">
              {CANCELLATION[l.cancellationPolicy].label} cancellation. {CANCELLATION[l.cancellationPolicy].summary}
            </p>
            {config.cardGateway !== "none" && config.chargeCurrency !== "BWP" && (
              <p className="mt-2 text-[13px] text-ink-2">Card payments are charged in {config.chargeCurrency} at the rate shown at payment.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
