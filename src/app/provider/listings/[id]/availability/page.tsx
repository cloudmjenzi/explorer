import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { blockedDates, bookings, listings } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { formatDate, todayInBotswana } from "@/lib/dates";
import { BlockDatesForm } from "@/components/BlockDatesForm";
import { unblockDateAction } from "@/app/actions/provider";

export default async function Availability({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { provider } = await currentProvider();
  const [l] = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.providerId, provider.id)));
  if (!l) notFound();
  const today = todayInBotswana();
  const [blocked, upcoming] = await Promise.all([
    db.select().from(blockedDates).where(and(eq(blockedDates.listingId, l.id), gte(blockedDates.date, today))).orderBy(asc(blockedDates.date)),
    db
      .select()
      .from(bookings)
      .where(and(eq(bookings.listingId, l.id), gte(bookings.date, today), inArray(bookings.status, ["CONFIRMED", "PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"])))
      .orderBy(asc(bookings.date)),
  ]);
  const byDate = new Map<string, number>();
  for (const b of upcoming) byDate.set(`${b.date} ${b.startTime}`, (byDate.get(`${b.date} ${b.startTime}`) ?? 0) + b.guests);

  return (
    <div className="max-w-3xl">
      <Link href={`/provider/listings/${l.id}`} className="link text-[15px]">{l.title}</Link>
      <h1 className="mb-2 mt-2 text-[30px] font-extrabold">Calendar</h1>
      <p className="mb-6 text-ink-2">
        Runs {l.startTimes.join(", ")}. Block days when you're full elsewhere, on leave, or the area is closed. Guests can't book blocked days.
      </p>
      <BlockDatesForm listingId={l.id} today={today} />

      <h2 className="mb-3 mt-10 text-[22px] font-extrabold">Blocked days</h2>
      {blocked.length === 0 ? (
        <p className="text-ink-2">Nothing blocked.</p>
      ) : (
        <ul className="panel divide-y divide-line-2">
          {blocked.map((b) => (
            <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-[15px]">
              <span>
                <span className="font-bold">{formatDate(b.date)}</span>
                {b.reason && <span className="ml-2 text-ink-2">{b.reason}</span>}
              </span>
              <form action={unblockDateAction}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="blockId" value={b.id} />
                <button className="link">Unblock</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-10 text-[22px] font-extrabold">Booked departures</h2>
      {byDate.size === 0 ? (
        <p className="text-ink-2">No upcoming bookings.</p>
      ) : (
        <ul className="panel divide-y divide-line-2">
          {[...byDate.entries()].map(([k, guests]) => (
            <li key={k} className="flex justify-between px-4 py-2.5 text-[15px]">
              <span className="font-bold">{formatDate(k.slice(0, 10))} {k.slice(11)}</span>
              <span>{guests} guest{guests > 1 ? "s" : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
