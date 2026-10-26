import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { formatBwp, providerPayoutFor } from "@/lib/money";
import { formatDate, todayInBotswana } from "@/lib/dates";
import { PAYMENT_METHODS } from "@/lib/catalog";
import { StatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { operatorCancelAction } from "@/app/actions/provider";

export default async function ProviderBookings({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "upcoming" } = await searchParams;
  const { provider } = await currentProvider();
  const today = todayInBotswana();
  const where =
    view === "past"
      ? and(eq(listings.providerId, provider.id), lt(bookings.date, today), inArray(bookings.status, ["CONFIRMED", "COMPLETED"]))
      : view === "cancelled"
        ? and(eq(listings.providerId, provider.id), eq(bookings.status, "CANCELLED"))
        : view === "pending"
          ? and(eq(listings.providerId, provider.id), inArray(bookings.status, ["PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"]))
          : and(eq(listings.providerId, provider.id), gte(bookings.date, today), eq(bookings.status, "CONFIRMED"));
  const rows = await db
    .select({ b: bookings, title: listings.title })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .where(where)
    .orderBy(view === "upcoming" || view === "pending" ? asc(bookings.date) : desc(bookings.date))
    .limit(200);

  const tabs = [
    ["upcoming", "Upcoming"],
    ["pending", "Awaiting payment"],
    ["past", "Past"],
    ["cancelled", "Cancelled"],
  ];
  return (
    <div>
      <h1 className="mb-4 text-[30px] font-extrabold">Bookings</h1>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Booking views">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/provider/bookings?view=${k}`} aria-current={view === k ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-[15px] ${view === k ? "bg-ink text-white" : "border border-line bg-paper hover:border-ink-3"}`}>
            {label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="text-ink-2">No bookings here.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ b, title }) => (
            <li key={b.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{formatDate(b.date)} at {b.startTime} · {title}</p>
                  <p className="text-[15px]">
                    {b.leadName} ({b.country}), {b.guests} guest{b.guests > 1 ? "s" : ""} ·{" "}
                    <a className="link" href={`tel:${b.phone}`}>{b.phone}</a> · <a className="link" href={`mailto:${b.email}`}>{b.email}</a>
                  </p>
                  {b.notes && <p className="mt-1 text-[15px] text-ink-2">Notes: {b.notes}</p>}
                  <p className="mt-1 text-[14px] text-ink-2">
                    Ref {b.ref} · {PAYMENT_METHODS[b.method].short} · total {formatBwp(b.totalThebe)} · paid online {formatBwp(b.paidThebe)}
                    {b.totalThebe - b.paidThebe > 0 && b.paidThebe > 0 && <> · <span className="font-bold text-ink">collect {formatBwp(b.totalThebe - b.paidThebe)} on the day</span></>}
                    {b.paidThebe > 0 && <> · you'll receive {formatBwp(providerPayoutFor(b.paidThebe, b.commissionThebe, b.refundThebe))}</>}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              {b.status === "CONFIRMED" && b.date >= today && (
                <details className="mt-3 text-[15px]">
                  <summary className="cursor-pointer text-danger">Cancel this booking</summary>
                  <form action={operatorCancelAction} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <input className="input max-w-md" name="reason" required placeholder="Reason the guest will see, e.g. vehicle breakdown" />
                    <ConfirmButton message="Cancel and fully refund this guest? Cancelling confirmed bookings affects your ranking.">Cancel and refund</ConfirmButton>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
