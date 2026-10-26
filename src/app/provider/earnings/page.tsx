import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { unpaidBookings, upcomingPayable } from "@/lib/earnings";
import { formatBwp } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/ui";

export default async function Earnings() {
  const { provider } = await currentProvider();
  const [owed, upcoming, history] = await Promise.all([
    unpaidBookings(provider.id),
    upcomingPayable(provider.id),
    db.select().from(payouts).where(eq(payouts.providerId, provider.id)).orderBy(desc(payouts.createdAt)),
  ]);
  const owedTotal = owed.reduce((s, r) => s + r.owed, 0);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[30px] font-extrabold">Earnings</h1>
        <p className="mt-1 text-ink-2">
          We pay completed trips weekly to your {provider.payoutMethod.replace("_", " ").toLowerCase()} account. Commission is {provider.commissionBps / 100}%.
        </p>
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        <div className="bg-paper p-5">
          <p className="text-[14px] text-ink-2">Ready for your next payout</p>
          <p className="font-display text-[32px] font-extrabold">{formatBwp(owedTotal)}</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-[14px] text-ink-2">Due after upcoming trips run</p>
          <p className="font-display text-[32px] font-extrabold">{formatBwp(upcoming)}</p>
        </div>
      </div>
      {owed.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-extrabold">In your next payout</h2>
          <div className="panel overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <thead className="border-b border-line text-[14px] text-ink-2">
                <tr><th className="px-4 py-2 font-normal">Trip</th><th className="px-4 py-2 font-normal">Ref</th><th className="px-4 py-2 font-normal">Paid online</th><th className="px-4 py-2 font-normal">Commission</th><th className="px-4 py-2 font-normal">You receive</th></tr>
              </thead>
              <tbody>
                {owed.map((r) => (
                  <tr key={r.booking.id} className="border-b border-line-2 last:border-0">
                    <td className="px-4 py-2.5">{formatDate(r.booking.date)} · {r.title}</td>
                    <td className="px-4 py-2.5">{r.booking.ref}</td>
                    <td className="px-4 py-2.5">{formatBwp(r.booking.paidThebe - r.booking.refundThebe)}</td>
                    <td className="px-4 py-2.5">{formatBwp(r.booking.commissionThebe)}</td>
                    <td className="px-4 py-2.5 font-bold">{formatBwp(r.owed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-[22px] font-extrabold">Payout history</h2>
        {history.length === 0 ? (
          <p className="text-ink-2">No payouts yet.</p>
        ) : (
          <ul className="panel divide-y divide-line-2">
            {history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[15px]">
                <span>{formatDateTime(p.paidAt ?? p.createdAt)}{p.reference && <span className="ml-2 text-ink-2">ref {p.reference}</span>}</span>
                <span className="flex items-center gap-3"><span className="font-bold">{formatBwp(p.amountThebe)}</span><StatusBadge status={p.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
