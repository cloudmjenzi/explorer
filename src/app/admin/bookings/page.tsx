import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings, providers } from "@/db/schema";
import { formatBwp } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { PAYMENT_METHODS } from "@/lib/catalog";
import { Notice, StatusBadge } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { ManualConfirmForm } from "@/components/ManualConfirmForm";
import { adminCancelAction, refundProcessedAction } from "@/app/actions/admin";

const STATUSES = ["PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"] as const;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const where: SQL[] = [];
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) where.push(eq(bookings.status, sp.status as (typeof STATUSES)[number]));
  if (sp.refund === "DUE") where.push(eq(bookings.refundStatus, "DUE"));
  if (sp.q?.trim()) {
    const t = `%${sp.q.trim()}%`;
    where.push(or(ilike(bookings.ref, t), ilike(bookings.email, t), ilike(bookings.leadName, t))!);
  }
  const rows = await db
    .select({ b: bookings, title: listings.title, operator: providers.businessName })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(providers, eq(providers.id, listings.providerId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(bookings.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="mb-4 text-[30px] font-extrabold">Bookings</h1>
      {sp.confirmed && (
        <div className="mb-4">
          <Notice tone="success">Payment recorded and {sp.confirmed} confirmed. The guest and operator have been emailed.</Notice>
        </div>
      )}
      <form className="mb-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs" placeholder="Ref, email or name" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}
        </select>
        <select name="refund" defaultValue={sp.refund ?? ""} className="input w-auto">
          <option value="">Any refund state</option>
          <option value="DUE">Refund due</option>
        </select>
        <button className="btn-secondary">Filter</button>
        <Link href="/admin/bookings" className="btn-ghost">Clear</Link>
      </form>
      {rows.length === 0 ? (
        <p className="text-ink-2">No bookings match.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ b, title, operator }) => (
            <li key={b.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-[15px]">
                  <p className="font-bold">
                    <Link className="hover:text-delta" href={`/bookings/${b.ref}`}>{b.ref}</Link> · {title} <span className="font-normal text-ink-2">by {operator}</span>
                  </p>
                  <p>{formatDate(b.date)} {b.startTime} · {b.guests} guests · {b.leadName}, {b.email}, {b.phone}</p>
                  <p className="text-ink-2">
                    {PAYMENT_METHODS[b.method].short} · total {formatBwp(b.totalThebe)} · due now {formatBwp(b.dueNowThebe)} · paid {formatBwp(b.paidThebe)} · commission {formatBwp(b.commissionThebe)} · created {formatDateTime(b.createdAt)}
                  </p>
                  {b.cancelReason && <p className="text-ink-2">Cancel reason: {b.cancelReason}</p>}
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={b.status} />
                  {b.refundStatus !== "NONE" && <StatusBadge status={b.refundStatus} />}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                {(b.status === "AWAITING_MANUAL_PAYMENT" || (b.status === "EXPIRED" && b.method !== "CARD")) && (
                  <ManualConfirmForm bookingId={b.id} amount={formatBwp(b.dueNowThebe)} method={PAYMENT_METHODS[b.method].short} />
                )}
                {b.refundStatus === "DUE" && (
                  <form action={refundProcessedAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <span className="text-[15px]">Refund {formatBwp(b.refundThebe)}</span>
                    {b.method === "CARD" && <SubmitButton name="auto" value="1" className="btn-primary py-2" pending="Refunding…">Refund via Stripe</SubmitButton>}
                    <SubmitButton className="btn-secondary py-2">Mark refunded</SubmitButton>
                  </form>
                )}
                {["CONFIRMED", "PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"].includes(b.status) && (
                  <form action={adminCancelAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="bookingId" value={b.id} />
                    <input name="reason" className="input w-56 py-2" placeholder="Reason" />
                    <ConfirmButton message="Cancel with a full refund to the guest?">Cancel, full refund</ConfirmButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
