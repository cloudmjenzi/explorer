import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "./config";
import { formatBwp } from "./money";
import { formatDate } from "./dates";
import { PAYMENT_METHODS } from "./catalog";
import type { Booking, Listing, PaymentMethod } from "@/db/schema";

let transporter: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!config.smtp.url) return null;
  transporter ??= nodemailer.createTransport(config.smtp.url);
  return transporter;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, paragraphs: string[], cta?: { label: string; url: string }): { html: string; text: string } {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p}</p>`).join("");
  const button = cta
    ? `<p style="margin:22px 0"><a href="${cta.url}" style="background:#1f5e8c;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escape(cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f3f6f5;font-family:Arial,Helvetica,sans-serif;color:#0e2a33">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="font-size:15px;font-weight:bold;margin:0 0 20px;color:#1f5e8c">${escape(config.appName)}</p>
<div style="background:#fff;border:1px solid #d9e2e1;border-radius:8px;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escape(title)}</h1>${body}${button}</div>
<p style="font-size:12px;color:#5b6f73;margin:18px 0 0">${escape(config.companyLegalName)} · ${escape(config.supportEmail)}</p>
</div></body></html>`;
  const text = [title, "", ...paragraphs.map((p) => p.replace(/<[^>]+>/g, "")), cta ? `\n${cta.label}: ${cta.url}` : ""].join("\n");
  return { html, text };
}

export async function sendMail(to: string, subject: string, content: { html: string; text: string }): Promise<void> {
  const t = getTransport();
  if (!t) {
    console.info(`[mail:dev] to=${to} subject="${subject}"\n${content.text}\n`);
    return;
  }
  try {
    await t.sendMail({ from: config.smtp.from, to, subject, html: content.html, text: content.text });
  } catch (err) {
    // Email failure must never break a booking or payment flow.
    console.error("mail send failed", { to, subject, err });
  }
}

const manageUrl = (b: Pick<Booking, "ref" | "manageToken">) => `${config.appUrl}/bookings/${b.ref}?t=${b.manageToken}`;

function bookingLines(b: Booking, l: Pick<Listing, "title" | "meetingPoint">): string[] {
  return [
    `<strong>${escape(l.title)}</strong>`,
    `${formatDate(b.date)} at ${b.startTime} · ${b.guests} guest${b.guests > 1 ? "s" : ""}`,
    `Meeting point: ${escape(l.meetingPoint)}`,
    `Booking reference: <strong>${b.ref}</strong>`,
  ];
}

export const mail = {
  bookingConfirmed(b: Booking, l: Pick<Listing, "title" | "meetingPoint">, operator: { name: string; phone: string }) {
    const balance = b.totalThebe - b.paidThebe;
    return sendMail(
      b.email,
      `Confirmed: ${l.title} on ${formatDate(b.date, { weekday: undefined })} (${b.ref})`,
      layout(`You're booked, ${b.leadName.split(" ")[0]}`, [
        ...bookingLines(b, l),
        `Paid: ${formatBwp(b.paidThebe)}${balance > 0 ? `. Balance of ${formatBwp(balance)} is payable to the operator on the day.` : "."}`,
        `Your operator is ${escape(operator.name)} (${escape(operator.phone)}). They will contact you if anything changes.`,
      ], { label: "View or manage booking", url: manageUrl(b) }),
    );
  },

  manualPaymentInstructions(b: Booking, l: Pick<Listing, "title" | "meetingPoint">, method: PaymentMethod, instructions: string) {
    return sendMail(
      b.email,
      `Complete your payment: ${l.title} (${b.ref})`,
      layout("Complete your payment to confirm", [
        ...bookingLines(b, l),
        `Amount due: <strong>${formatBwp(b.dueNowThebe)}</strong> by ${PAYMENT_METHODS[method].label}.`,
        escape(instructions).replace(/\n/g, "<br>"),
        `Use <strong>${b.ref}</strong> as the payment reference. We hold your place for ${config.holdHoursManual} hours and confirm by email once the payment is received.`,
      ], { label: "View booking", url: manageUrl(b) }),
    );
  },

  operatorNewBooking(to: string, b: Booking, l: Pick<Listing, "title" | "meetingPoint">) {
    return sendMail(
      to,
      `New booking ${b.ref}: ${l.title}, ${formatDate(b.date)}`,
      layout("New confirmed booking", [
        ...bookingLines(b, l),
        `Guest: ${escape(b.leadName)}, ${escape(b.country)}. Phone ${escape(b.phone)}, email ${escape(b.email)}.`,
        b.notes ? `Guest notes: ${escape(b.notes)}` : "No special requests.",
        b.totalThebe - b.paidThebe > 0
          ? `Collect the balance of ${formatBwp(b.totalThebe - b.paidThebe)} from the guest on the day.`
          : "The guest has paid in full through the platform.",
      ], { label: "Open your bookings", url: `${config.appUrl}/provider/bookings` }),
    );
  },

  bookingCancelled(b: Booking, l: Pick<Listing, "title" | "meetingPoint">, refundThebe: number) {
    return sendMail(
      b.email,
      `Cancelled: ${l.title} (${b.ref})`,
      layout("Your booking is cancelled", [
        ...bookingLines(b, l),
        refundThebe > 0
          ? `A refund of ${formatBwp(refundThebe)} will be returned to your original payment method within 10 working days.`
          : "No refund is due under this experience's cancellation policy.",
      ]),
    );
  },

  operatorCancelled(to: string, b: Booking, l: Pick<Listing, "title" | "meetingPoint">) {
    return sendMail(to, `Booking cancelled: ${b.ref}`, layout("A booking was cancelled", bookingLines(b, l), {
      label: "Open your bookings",
      url: `${config.appUrl}/provider/bookings`,
    }));
  },

  reviewRequest(b: Booking, l: Pick<Listing, "title">) {
    return sendMail(
      b.email,
      `How was ${l.title}?`,
      layout("Tell other travellers how it went", [
        `Thanks for booking ${escape(l.title)}. A short review helps local operators get found and helps the next traveller choose.`,
      ], { label: "Write a review", url: `${manageUrl(b)}#review` }),
    );
  },

  providerApplicationReceived(to: string, businessName: string) {
    return sendMail(to, "We've received your application", layout(`Thanks, ${businessName}`, [
      "We review every operator before they go live. Expect a reply within 2 working days.",
      "While you wait, you can create your listings. They will go live once your business is approved.",
    ], { label: "Open your dashboard", url: `${config.appUrl}/provider` }));
  },

  providerDecision(to: string, businessName: string, approved: boolean, note?: string | null) {
    return sendMail(
      to,
      approved ? "Your business is approved" : "Update on your application",
      layout(approved ? `${businessName} is approved` : "Your application needs attention", [
        approved
          ? "You can now publish listings and take bookings."
          : "We could not approve your application yet.",
        note ? `Note from our team: ${escape(note)}` : "",
      ].filter(Boolean), { label: "Open your dashboard", url: `${config.appUrl}/provider` }),
    );
  },

  listingDecision(to: string, title: string, approved: boolean, note?: string | null) {
    return sendMail(to, approved ? `Live: ${title}` : `Changes needed: ${title}`, layout(
      approved ? "Your listing is live" : "Your listing needs changes",
      [escape(title), note ? `Note from our team: ${escape(note)}` : ""].filter(Boolean),
      { label: "Open your listings", url: `${config.appUrl}/provider/listings` },
    ));
  },

  adminAlert(subject: string, lines: string[]) {
    if (!config.adminNotifyEmail) return Promise.resolve();
    return sendMail(config.adminNotifyEmail, `[Admin] ${subject}`, layout(subject, lines.map(escape), {
      label: "Open admin",
      url: `${config.appUrl}/admin`,
    }));
  },
};
