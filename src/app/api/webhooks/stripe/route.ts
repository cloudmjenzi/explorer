import { NextResponse } from "next/server";
import { stripe } from "@/lib/payments";
import { markPaymentSucceeded } from "@/lib/bookings";
import { config } from "@/lib/config";

/** Backup confirmation path in case the tourist closes the tab before returning. */
export async function POST(req: Request) {
  if (!config.stripe.webhookSecret) return NextResponse.json({ error: "not configured" }, { status: 404 });
  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, config.stripe.webhookSecret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const paymentId = session.metadata?.paymentId;
    if (paymentId && session.payment_status === "paid") await markPaymentSucceeded(paymentId, "stripe-webhook");
  }
  return NextResponse.json({ received: true });
}
