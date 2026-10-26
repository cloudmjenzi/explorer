import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { CANCELLATION, PAYMENT_METHODS } from "@/lib/catalog";
import { formatBwp } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { refundFor } from "@/lib/refunds";
import { config } from "@/lib/config";
import { Notice, StatusBadge } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { ReviewForm } from "@/components/ReviewForm";
import { cancelByGuestAction, retryPaymentAction } from "@/app/actions/booking";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

type P = Promise<{ ref: string }>;
type SP = Promise<Record<string, string | undefined>>;

export default async function BookingPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const { ref } = await params;
  const sp = await searchParams;
  const b = await db.query.bookings.findFirst({
    where: eq(bookings.ref, ref.toUpperCase()),
    with: { listing: { with: { provider: true, region: true } }, review: true },
  });
  if (!b) notFound();
  const user = await getUser();
  // Access: the secret link from the email, the account that made it, the operator or an admin.
  const allowed =
    (sp.t && sp.t === b.manageToken) ||
    (user && (user.id === b.userId || user.role === "ADMIN" || user.provider?.id === b.listing.providerId));
  if (!allowed) notFound();
  const t = b.manageToken;
  const l = b.listing;
  const balance = b.totalThebe - b.paidThebe;
  const policy = CANCELLATION[l.cancellationPolicy];
  const canCancel = ["CONFIRMED", "PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"].includes(b.status);
  const refundPreview = canCancel
    ? refundFor({ policy: l.cancellationPolicy, paidThebe: b.paidThebe, date: b.date, startTime: b.startTime, cancelledBy: "tourist" })
    : null;
  const holdLive = b.expiresAt && b.expiresAt > new Date();
  const wa = l.provider.whatsapp?.replace(/\D/g, "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={b.status} />
        <span className="text-[15px] text-ink-2">Reference <span className="font-bold text-ink">{b.ref}</span></span>
      </div>
      <h1 className="mt-3 text-[34px] font-extrabold">{l.title}</h1>
      <p className="text-ink-2">{l.provider.businessName}, {l.region.name}</p>

      <div className="mt-6 space-y-4">
        {sp.paid === "1" && b.status === "CONFIRMED" && (
          <Notice tone="success">Payment received. You're booked, and a confirmation is on its way to {b.email}.</Notice>
        )}
        {sp.paid === "pending" && b.status === "PENDING_PAYMENT" && (
          <Notice tone="warning">We haven't received confirmation from the card processor yet. Refresh in a minute. If you were charged, you will not be charged twice.</Notice>
        )}
        {b.status === "PENDING_PAYMENT" && holdLive && (
          <Notice tone="warning">
            <p>Your place is held until {formatDateTime(b.expiresAt!)} while you pay.</p>
            <form action={retryPaymentAction} className="mt-3">
              <input type="hidden" name="ref" value={b.ref} />
              <input type="hidden" name="t" value={t} />
              <SubmitButton pending="Opening payment…">Pay {formatBwp(b.dueNowThebe)} by card</SubmitButton>
            </form>
          </Notice>
        )}
        {b.status === "AWAITING_MANUAL_PAYMENT" && (
          <Notice tone="warning">
            <p className="font-bold">Send {formatBwp(b.dueNowThebe)} by {PAYMENT_METHODS[b.method].label} to confirm</p>
            <p className="mt-2 whitespace-pre-line">{config.manual[b.method]}</p>
            <p className="mt-2">
              Use <span className="font-bold">{b.ref}</span> as the reference. We hold your place until {b.expiresAt ? formatDateTime(b.expiresAt) : "the hold ends"} and email you once the payment arrives.
            </p>
          </Notice>
        )}
        {b.status === "EXPIRED" && (
          <Notice tone="error">
            This reservation expired before payment arrived. <Link className="link" href={`/experiences/${l.slug}`}>Book again</Link>. If you paid, contact {config.supportEmail} with your reference.
          </Notice>
        )}
        {b.status === "CANCELLED" && (
          <Notice tone="info">
            Cancelled {b.cancelledAt ? formatDateTime(b.cancelledAt) : ""}.{" "}
            {b.refundThebe > 0
              ? `${b.refundStatus === "PROCESSED" ? "Refunded" : "Refund due"}: ${formatBwp(b.refundThebe)}.`
              : "No refund was due."}
          </Notice>
        )}
      </div>

      <dl className="panel mt-6 grid gap-x-6 gap-y-3 p-5 text-[15px] sm:grid-cols-[10rem_1fr]">
        <dt className="text-ink-2">Date</dt>
        <dd className="font-bold">{formatDate(b.date)} at {b.startTime}</dd>
        <dt className="text-ink-2">Guests</dt>
        <dd>{b.guests}, lead guest {b.leadName}</dd>
        <dt className="text-ink-2">Meeting point</dt>
        <dd>{l.meetingPoint}</dd>
        <dt className="text-ink-2">Total</dt>
        <dd>{formatBwp(b.totalThebe)}</dd>
        <dt className="text-ink-2">Paid</dt>
        <dd>{formatBwp(b.paidThebe)}</dd>
        {b.paidThebe === 0 && b.dueNowThebe < b.totalThebe && ["PENDING_PAYMENT", "AWAITING_MANUAL_PAYMENT"].includes(b.status) && (
          <>
            <dt className="text-ink-2">Deposit due now</dt>
            <dd className="font-bold">{formatBwp(b.dueNowThebe)}, then {formatBwp(b.totalThebe - b.dueNowThebe)} to {l.provider.businessName} on the day</dd>
          </>
        )}
        {balance > 0 && b.paidThebe > 0 && (
          <>
            <dt className="text-ink-2">Pay on the day</dt>
            <dd className="font-bold">{formatBwp(balance)} to {l.provider.businessName}</dd>
          </>
        )}
        <dt className="text-ink-2">Operator</dt>
        <dd>
          {l.provider.businessName}, <a className="link" href={`tel:${l.provider.phone}`}>{l.provider.phone}</a>
          {wa && (b.status === "CONFIRMED" || b.status === "COMPLETED") && (
            <> · <a className="link" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello, this is ${b.leadName}, booking ${b.ref} on ${b.date}.`)}`}>WhatsApp</a></>
          )}
        </dd>
        {b.notes && (
          <>
            <dt className="text-ink-2">Your notes</dt>
            <dd>{b.notes}</dd>
          </>
        )}
      </dl>

      {canCancel && refundPreview && (
        <section className="mt-8">
          <h2 className="text-[20px] font-extrabold">Cancel this booking</h2>
          <p className="mt-1 text-[15px] text-ink-2">{policy.label} policy: {policy.summary}</p>
          <p className="mt-1 text-[15px]">
            {b.paidThebe > 0
              ? refundPreview.refundThebe > 0
                ? `If you cancel now you get ${formatBwp(refundPreview.refundThebe)} back.`
                : "If you cancel now no refund is due."
              : "Nothing has been paid, so there's no charge."}
          </p>
          <form action={cancelByGuestAction} className="mt-3">
            <input type="hidden" name="ref" value={b.ref} />
            <input type="hidden" name="t" value={t} />
            <ConfirmButton message="Cancel this booking? This can't be undone.">Cancel booking</ConfirmButton>
          </form>
        </section>
      )}

      {b.status === "COMPLETED" && (
        <section className="mt-10" id="review">
          <h2 className="text-[24px] font-extrabold">Your review</h2>
          {b.review ? (
            <p className="mt-2 text-ink-2">You gave {b.review.rating} out of 5. Thank you.</p>
          ) : (
            <ReviewForm bookingRef={b.ref} token={t} />
          )}
        </section>
      )}

      <p className="mt-10 text-[14px] text-ink-2">
        Need help? Email <a className="link" href={`mailto:${config.supportEmail}?subject=${b.ref}`}>{config.supportEmail}</a> with reference {b.ref}.
        {!user && (
          <> <Link className="link" href={`/signup?next=/trips`}>Create an account</Link> to keep all your trips in one place.</>
        )}
      </p>
    </div>
  );
}
