import "server-only";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, type Booking } from "@/db/schema";
import { config } from "./config";
import { toChargeMinor } from "./money";
import { markPaymentSucceeded } from "./bookings";

/* ---------- DPO Pay (Network International) ----------
 * The common gateway for Botswana tourism businesses. Flow:
 * createToken -> redirect to hosted page -> tourist returns with TransactionToken -> verifyToken.
 * Result "000" on verifyToken means paid.
 */

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

function xmlTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}

async function dpoRequest(body: string): Promise<string> {
  const res = await fetch(config.dpo.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: `<?xml version="1.0" encoding="utf-8"?>${body}`,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`DPO HTTP ${res.status}`);
  return res.text();
}

function bwDateTime(date: string, time: string) {
  return `${date.replaceAll("-", "/")} ${time}`;
}

async function startDpo(booking: Booking, title: string): Promise<string> {
  const currency = config.chargeCurrency;
  const minor = toChargeMinor(booking.dueNowThebe, currency, config.rates);
  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: booking.id,
      gateway: "DPO",
      method: "CARD",
      amountThebe: booking.dueNowThebe,
      currency,
      amountMinor: minor,
    })
    .returning();
  const returnUrl = `${config.appUrl}/pay/dpo/return?p=${payment.id}`;
  const xml = `<API3G>
<CompanyToken>${xmlEscape(config.dpo.companyToken)}</CompanyToken>
<Request>createToken</Request>
<Transaction>
<PaymentAmount>${(minor / 100).toFixed(2)}</PaymentAmount>
<PaymentCurrency>${currency}</PaymentCurrency>
<CompanyRef>${booking.ref}</CompanyRef>
<RedirectURL>${xmlEscape(returnUrl)}</RedirectURL>
<BackURL>${xmlEscape(`${config.appUrl}/bookings/${booking.ref}?t=${booking.manageToken}`)}</BackURL>
<CompanyRefUnique>0</CompanyRefUnique>
<PTL>${config.dpo.ptlHours}</PTL>
<customerEmail>${xmlEscape(booking.email)}</customerEmail>
<customerFirstName>${xmlEscape(booking.leadName.split(" ")[0])}</customerFirstName>
<customerLastName>${xmlEscape(booking.leadName.split(" ").slice(1).join(" ") || booking.leadName)}</customerLastName>
</Transaction>
<Services>
<Service>
<ServiceType>${xmlEscape(config.dpo.serviceType)}</ServiceType>
<ServiceDescription>${xmlEscape(`${booking.ref} ${title}`.slice(0, 100))}</ServiceDescription>
<ServiceDate>${bwDateTime(booking.date, booking.startTime)}</ServiceDate>
</Service>
</Services>
</API3G>`;
  const resp = await dpoRequest(xml);
  const result = xmlTag(resp, "Result");
  const token = xmlTag(resp, "TransToken");
  if (result !== "000" || !token) {
    await db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, payment.id));
    throw new Error(`DPO createToken failed: ${result} ${xmlTag(resp, "ResultExplanation")}`);
  }
  await db.update(payments).set({ externalRef: token }).where(eq(payments.id, payment.id));
  return config.dpo.payUrl + encodeURIComponent(token);
}

/** Returns "paid", "pending" or "failed". Never trust the redirect alone: always verify server-side. */
export async function verifyDpo(paymentId: string): Promise<"paid" | "pending" | "failed"> {
  const [p] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.gateway, "DPO")));
  if (!p?.externalRef) return "failed";
  if (p.status === "SUCCEEDED") return "paid";
  const resp = await dpoRequest(`<API3G>
<CompanyToken>${xmlEscape(config.dpo.companyToken)}</CompanyToken>
<Request>verifyToken</Request>
<TransactionToken>${xmlEscape(p.externalRef)}</TransactionToken>
</API3G>`);
  const result = xmlTag(resp, "Result");
  if (result === "000") {
    const paidAmount = Number(xmlTag(resp, "TransactionAmount") ?? NaN);
    if (Number.isFinite(paidAmount) && Math.round(paidAmount * 100) < p.amountMinor) {
      console.error("DPO amount mismatch", { paymentId, paidAmount, expected: p.amountMinor });
      return "failed";
    }
    await markPaymentSucceeded(p.id, "dpo");
    return "paid";
  }
  if (result === "900") return "pending"; // not paid yet
  await db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, p.id));
  return "failed";
}

/* ---------- Stripe ----------
 * Stripe does not onboard Botswana-registered businesses. Use only with an entity in a
 * Stripe-supported country (e.g. an Australian company), charging in USD.
 */

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!config.stripe.secretKey) throw new Error("STRIPE_SECRET_KEY not set");
  stripeClient ??= new Stripe(config.stripe.secretKey);
  return stripeClient;
}

async function startStripe(booking: Booking, title: string): Promise<string> {
  const currency = config.chargeCurrency === "BWP" ? "USD" : config.chargeCurrency;
  const minor = toChargeMinor(booking.dueNowThebe, currency, config.rates);
  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: booking.id,
      gateway: "STRIPE",
      method: "CARD",
      amountThebe: booking.dueNowThebe,
      currency,
      amountMinor: minor,
    })
    .returning();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: booking.email,
    client_reference_id: booking.ref,
    metadata: { paymentId: payment.id, bookingRef: booking.ref },
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: minor,
          product_data: {
            name: title,
            description: `${booking.ref} · ${booking.date} ${booking.startTime} · ${booking.guests} guest(s)${booking.payDeposit ? " · deposit" : ""}`,
          },
        },
      },
    ],
    success_url: `${config.appUrl}/pay/stripe/return?p=${payment.id}`,
    cancel_url: `${config.appUrl}/bookings/${booking.ref}?t=${booking.manageToken}`,
  });
  await db.update(payments).set({ externalRef: session.id }).where(eq(payments.id, payment.id));
  return session.url!;
}

export async function verifyStripe(paymentId: string): Promise<"paid" | "pending" | "failed"> {
  const [p] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.gateway, "STRIPE")));
  if (!p?.externalRef) return "failed";
  if (p.status === "SUCCEEDED") return "paid";
  const session = await stripe().checkout.sessions.retrieve(p.externalRef);
  if (session.payment_status === "paid") {
    await markPaymentSucceeded(p.id, "stripe");
    return "paid";
  }
  return session.status === "expired" ? "failed" : "pending";
}

export async function startCardPayment(booking: Booking, title: string): Promise<string> {
  if (config.cardGateway === "dpo") return startDpo(booking, title);
  if (config.cardGateway === "stripe") return startStripe(booking, title);
  throw new Error("No card gateway configured");
}

/** Admin confirms a manual mobile money / EFT payment after checking the statement. */
export async function confirmManualPayment(booking: Booking, payerRef: string, adminId: string) {
  const [p] = await db
    .insert(payments)
    .values({
      bookingId: booking.id,
      gateway: "MANUAL",
      method: booking.method,
      amountThebe: booking.dueNowThebe,
      currency: "BWP",
      amountMinor: booking.dueNowThebe,
      payerRef,
    })
    .returning();
  return markPaymentSucceeded(p.id, adminId);
}

export function availableMethods(): { card: boolean; manual: string[] } {
  return {
    card: config.cardGateway !== "none",
    manual: Object.entries(config.manual)
      .filter(([, v]) => v)
      .map(([k]) => k),
  };
}
