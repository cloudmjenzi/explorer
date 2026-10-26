import Link from "next/link";
import { and, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings, providers } from "@/db/schema";
import { runHousekeeping } from "@/lib/bookings";
import { unpaidBookings } from "@/lib/earnings";
import { formatBwp } from "@/lib/money";
import { todayInBotswana } from "@/lib/dates";
import { config } from "@/lib/config";
import { Notice } from "@/components/ui";

export default async function AdminHome() {
  await runHousekeeping();
  const monthStart = todayInBotswana().slice(0, 8) + "01";
  const [[month], [counts], owed] = await Promise.all([
    db
      .select({
        n: sql<number>`count(*)::int`,
        gmv: sql<number>`coalesce(sum(${bookings.totalThebe}),0)::int`,
        paid: sql<number>`coalesce(sum(${bookings.paidThebe} - ${bookings.refundThebe}),0)::int`,
        commission: sql<number>`coalesce(sum(${bookings.commissionThebe}),0)::int`,
      })
      .from(bookings)
      .where(and(inArray(bookings.status, ["CONFIRMED", "COMPLETED"]), gte(bookings.createdAt, new Date(monthStart + "T00:00:00+02:00")))),
    db
      .select({
        pendingProviders: sql<number>`(select count(*) from ${providers} where ${providers.status} = 'PENDING')::int`,
        pendingListings: sql<number>`(select count(*) from ${listings} where ${listings.status} = 'PENDING_REVIEW')::int`,
        manual: sql<number>`(select count(*) from ${bookings} where ${bookings.status} = 'AWAITING_MANUAL_PAYMENT')::int`,
        refunds: sql<number>`(select count(*) from ${bookings} where ${bookings.refundStatus} = 'DUE')::int`,
        live: sql<number>`(select count(*) from ${listings} l join ${providers} p on p.id = l.provider_id where l.status = 'PUBLISHED' and p.status = 'APPROVED')::int`,
      })
      .from(sql`(select 1) x`),
    unpaidBookings(),
  ]);
  const queue = [
    [counts.manual, "manual payments to check", "/admin/bookings?status=AWAITING_MANUAL_PAYMENT"],
    [counts.refunds, "refunds to process", "/admin/bookings?refund=DUE"],
    [counts.pendingProviders, "operators to review", "/admin/providers?status=PENDING"],
    [counts.pendingListings, "listings to review", "/admin/listings?status=PENDING_REVIEW"],
  ] as const;

  return (
    <div className="space-y-10">
      {config.cardGateway === "none" && (
        <Notice tone="warning">Card payments are off. Set CARD_GATEWAY and your DPO or Stripe keys to take card bookings.</Notice>
      )}
      <section>
        <h1 className="mb-4 text-[30px] font-extrabold">This month</h1>
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {[
            ["Confirmed bookings", String(month.n)],
            ["Booking value", formatBwp(month.gmv)],
            ["Collected online", formatBwp(month.paid)],
            ["Commission earned", formatBwp(month.commission)],
          ].map(([l, v]) => (
            <div key={l} className="bg-paper p-5">
              <p className="text-[14px] text-ink-2">{l}</p>
              <p className="font-display text-[28px] font-extrabold">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[14px] text-ink-2">{counts.live} live listings. Owed to operators now: {formatBwp(owed.reduce((s, r) => s + r.owed, 0))}.</p>
      </section>
      <section>
        <h2 className="mb-3 text-[22px] font-extrabold">To do</h2>
        <ul className="panel divide-y divide-line-2">
          {queue.map(([n, label, href]) => (
            <li key={label}>
              <Link href={href} className="flex items-center justify-between px-4 py-3 hover:bg-sky-soft">
                <span>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
                <span className={`font-display text-[20px] font-extrabold ${n > 0 ? "text-ochre" : "text-ink-3"}`}>{n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
