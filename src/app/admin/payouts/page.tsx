import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts, providers } from "@/db/schema";
import { unpaidBookings } from "@/lib/earnings";
import { formatBwp } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { createPayoutAction, markPayoutPaidAction } from "@/app/actions/admin";

export default async function AdminPayouts() {
  const [owed, list] = await Promise.all([
    unpaidBookings(),
    db
      .select({ p: payouts, name: providers.businessName, method: providers.payoutMethod, details: providers.payoutDetails })
      .from(payouts)
      .innerJoin(providers, eq(providers.id, payouts.providerId))
      .orderBy(desc(payouts.createdAt))
      .limit(100),
  ]);
  const byProvider = new Map<string, { total: number; n: number }>();
  for (const r of owed) {
    const v = byProvider.get(r.providerId) ?? { total: 0, n: 0 };
    byProvider.set(r.providerId, { total: v.total + r.owed, n: v.n + 1 });
  }
  const names = new Map(
    (await db.select({ id: providers.id, name: providers.businessName }).from(providers)).map((p) => [p.id, p.name]),
  );
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[30px] font-extrabold">Payouts</h1>
          <a href="/admin/payouts/export" className="btn-secondary">Download CSV</a>
        </div>
        <h2 className="mb-3 text-[22px] font-extrabold">Ready to pay</h2>
        {byProvider.size === 0 ? (
          <p className="text-ink-2">Nothing owed right now.</p>
        ) : (
          <ul className="panel divide-y divide-line-2">
            {[...byProvider.entries()].map(([id, v]) => (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span><span className="font-bold">{names.get(id)}</span> <span className="text-ink-2">{v.n} booking{v.n > 1 ? "s" : ""}</span></span>
                <form action={createPayoutAction} className="flex items-center gap-3">
                  <input type="hidden" name="providerId" value={id} />
                  <span className="font-display text-[20px] font-extrabold">{formatBwp(v.total)}</span>
                  <SubmitButton className="btn-primary py-2">Create payout</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-[22px] font-extrabold">Payout batches</h2>
        {list.length === 0 ? (
          <p className="text-ink-2">No payouts yet.</p>
        ) : (
          <ul className="space-y-3">
            {list.map(({ p, name, method, details }) => (
              <li key={p.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="text-[15px]">
                    <p className="font-bold">{name} · {formatBwp(p.amountThebe)}</p>
                    <p className="text-ink-2">{method}: <span className="whitespace-pre-line">{details}</span></p>
                    <p className="text-ink-2">Created {formatDateTime(p.createdAt)}{p.paidAt && `, paid ${formatDateTime(p.paidAt)} ref ${p.reference}`}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                {p.status === "PENDING" && (
                  <form action={markPayoutPaidAction} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="reference" required className="input w-64 py-2" placeholder="Bank or wallet transaction ref" />
                    <SubmitButton className="btn-primary py-2">Mark paid</SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
