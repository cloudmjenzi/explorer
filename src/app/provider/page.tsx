import Link from "next/link";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { formatBwp } from "@/lib/money";
import { formatDate, todayInBotswana, addDays } from "@/lib/dates";
import { unpaidBookings, upcomingPayable } from "@/lib/earnings";
import { Notice, StatusBadge } from "@/components/ui";

export default async function ProviderHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { provider } = await currentProvider();
  const today = todayInBotswana();
  const [next, listingCounts, owed, upcoming] = await Promise.all([
    db
      .select({ b: bookings, title: listings.title })
      .from(bookings)
      .innerJoin(listings, eq(listings.id, bookings.listingId))
      .where(
        and(
          eq(listings.providerId, provider.id),
          inArray(bookings.status, ["CONFIRMED"]),
          gte(bookings.date, today),
          sql`${bookings.date} <= ${addDays(today, 14)}`,
        ),
      )
      .orderBy(bookings.date, bookings.startTime),
    db
      .select({ status: listings.status, n: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.providerId, provider.id))
      .groupBy(listings.status),
    unpaidBookings(provider.id),
    upcomingPayable(provider.id),
  ]);
  const count = (s: string) => listingCounts.find((c) => c.status === s)?.n ?? 0;
  const totalListings = listingCounts.reduce((s, c) => s + c.n, 0);

  return (
    <div className="space-y-10">
      {welcome && (
        <Notice tone="success">Application sent. Next, add your first listing so it's ready the moment you're approved.</Notice>
      )}
      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {[
          ["Live listings", String(count("PUBLISHED")), "/provider/listings"],
          ["Guests in next 14 days", String(next.reduce((s, r) => s + r.b.guests, 0)), "/provider/bookings"],
          ["Owed to you now", formatBwp(owed.reduce((s, r) => s + r.owed, 0)), "/provider/earnings"],
          ["After upcoming trips", formatBwp(upcoming), "/provider/earnings"],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="bg-paper p-5 hover:bg-sky-soft">
            <p className="text-[14px] text-ink-2">{label}</p>
            <p className="font-display text-[28px] font-extrabold">{value}</p>
          </Link>
        ))}
      </div>

      {totalListings === 0 && (
        <div className="panel p-6">
          <h2 className="text-[22px] font-extrabold">Add your first listing</h2>
          <p className="mt-1 text-ink-2">Describe one trip, set its price and times, and add photos. It takes about 10 minutes.</p>
          <Link href="/provider/listings/new" className="btn-primary mt-4">Create a listing</Link>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-[22px] font-extrabold">Next 14 days</h2>
        {next.length === 0 ? (
          <p className="text-ink-2">No confirmed guests in the next two weeks.</p>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <thead className="border-b border-line text-[14px] text-ink-2">
                <tr>
                  <th className="px-4 py-2 font-normal">When</th>
                  <th className="px-4 py-2 font-normal">Experience</th>
                  <th className="px-4 py-2 font-normal">Guest</th>
                  <th className="px-4 py-2 font-normal">Guests</th>
                  <th className="px-4 py-2 font-normal">Collect on the day</th>
                </tr>
              </thead>
              <tbody>
                {next.map(({ b, title }) => (
                  <tr key={b.id} className="border-b border-line-2 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-bold">{formatDate(b.date)} {b.startTime}</td>
                    <td className="px-4 py-3">{title}</td>
                    <td className="px-4 py-3">
                      {b.leadName}
                      <span className="block text-[13px] text-ink-2">{b.phone}</span>
                    </td>
                    <td className="px-4 py-3">{b.guests}</td>
                    <td className="px-4 py-3">{b.totalThebe - b.paidThebe > 0 ? formatBwp(b.totalThebe - b.paidThebe) : <StatusBadge status="PAID" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
