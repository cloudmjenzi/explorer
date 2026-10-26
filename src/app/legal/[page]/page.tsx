import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { config } from "@/lib/config";
import { CANCELLATION } from "@/lib/catalog";

/*
 * Starting-point legal text written for a Botswana-registered marketplace.
 * Have it reviewed by a Botswana attorney before launch and edit here.
 */

const company = config.companyLegalName;
const pct = config.defaultCommissionBps / 100;

const PAGES: Record<string, { title: string; updated: string; sections: [string, string[]][] }> = {
  terms: {
    title: "Booking terms",
    updated: "26 October 2026",
    sections: [
      ["Who you're booking with", [
        `${config.appName} is operated by ${company}, a company registered in Botswana. We run a marketplace. The experience itself is supplied by the independent operator named on the listing, who holds a Botswana Tourism Organisation licence and is responsible for delivering it safely and as described.`,
        "When you book, you enter a contract with the operator for the experience, and with us for the booking service and payment handling.",
      ]],
      ["Prices and payment", [
        "Prices are set by operators and shown in Botswana pula (BWP), including VAT where the operator is VAT-registered. Amounts in other currencies are estimates for your convenience.",
        "Card payments may be charged in pula or US dollars, as shown at payment. Your bank may apply its own conversion and fees.",
        "If you pay a deposit, the balance shown on your booking is paid directly to the operator on the day, in cash or by the means they accept.",
        `If you pay by mobile money or bank transfer, your place is held for ${config.holdHoursManual} hours. The booking is confirmed only when we receive the full amount due with your booking reference.`,
      ]],
      ["Cancellations by you", [
        "Each listing shows its cancellation policy. Refunds are calculated on the amount you paid us, based on the time remaining before the start time in Botswana time.",
        ...Object.values(CANCELLATION).map((c) => `${c.label}: ${c.summary}`),
        "Cancel from your booking page. Refunds go back to the original payment method within 10 working days.",
      ]],
      ["Cancellations and changes by the operator", [
        "If the operator cancels, or cannot run the experience because of weather, park closure, flooding or safety, you get a full refund of everything paid to us, or you can accept an alternative date if offered.",
        "Operators may adjust routes and timings on the day for safety, wildlife movements or water levels. This is part of travelling in the bush and is not grounds for a refund unless the experience is substantially different from what was booked.",
      ]],
      ["Your responsibilities", [
        "Give accurate names, contact details and any health, mobility or dietary information the operator needs.",
        "Arrive at the meeting point on time. A no-show is treated as a cancellation at the start time.",
        "Follow your guide's instructions. Wildlife is wild. Operators may refuse to take guests who put themselves or others at risk, without refund.",
        "Hold suitable travel insurance, including medical evacuation cover for remote areas.",
      ]],
      ["Liability", [
        "We are responsible for running the booking service with reasonable care and skill. Operators are responsible for the experience they provide. Nothing in these terms limits liability that cannot be limited under the laws of Botswana, including the Consumer Protection Act.",
      ]],
      ["Reviews", [
        "Only guests with a completed booking can leave a review. We may hide reviews that are abusive, unrelated to the experience, or contain personal information.",
      ]],
      ["Law and complaints", [
        `These terms are governed by the laws of Botswana. Contact us first at ${config.supportEmail} and we'll try to resolve any problem with you and the operator.`,
      ]],
    ],
  },
  privacy: {
    title: "Privacy notice",
    updated: "26 October 2026",
    sections: [
      ["Who we are", [
        `${company} is the data controller for personal data collected through ${config.appName}. We process personal data in line with Botswana's Data Protection Act and, for visitors from the EU or UK, with the GDPR principles that apply to us. Contact: ${config.supportEmail}.`,
      ]],
      ["What we collect", [
        "Booking details: lead guest name, email, phone, country of residence, number of guests, travel date and any notes you add.",
        "Account details if you register: name, email, a securely hashed password.",
        "Payment records: amount, method, and the reference from the payment processor. We never see or store full card numbers. Card payments are processed by our payment provider.",
        "Operators: business, licence, contact and payout account details.",
        "Technical data: a session cookie to keep you logged in, a preference cookie for display currency, and server logs including IP address kept for security for up to 90 days.",
      ]],
      ["Why we use it", [
        "To make and manage your booking and send it to the operator who will deliver it (contract).",
        "To process payments, refunds and operator payouts, and keep financial records required by law (legal obligation).",
        "To prevent fraud and keep the service secure (legitimate interests).",
        "To ask for a review after your trip. You can ignore or opt out of these messages at any time.",
        "We don't sell personal data and don't use it for third-party advertising.",
      ]],
      ["Who we share it with", [
        "The operator of the experience you booked: your name, contact details, group size and notes.",
        "Our payment processor, email provider and hosting provider, under contracts that require them to protect it.",
        "Authorities, where the law requires.",
      ]],
      ["Where it's stored and for how long", [
        "Data is hosted on servers we control. Booking and payment records are kept for 7 years for accounting and tax purposes. Account data is kept while your account is active and deleted on request unless we must keep it by law.",
      ]],
      ["Your rights", [
        `You can ask to see, correct or delete your personal data, or object to how we use it, by emailing ${config.supportEmail}. You can also complain to the Information and Data Protection Commission of Botswana.`,
      ]],
    ],
  },
  cancellation: {
    title: "Cancellations and refunds",
    updated: "26 October 2026",
    sections: [
      ["How refunds work", [
        "Every experience uses one of three policies, shown on its page and in your confirmation. Timings are counted back from the start time in Botswana time (UTC+2).",
        ...Object.values(CANCELLATION).map((c) => `${c.label}: ${c.summary}`),
        "If you paid a deposit, the refund applies to the deposit. Nothing is owed on the balance you would have paid on the day.",
        "If the operator cancels for any reason, including weather, flooding or park closures, you get everything back.",
        "Refunds return to your original payment method: cards within 5 to 10 working days, mobile money and bank transfers within 5 working days of us processing them.",
      ]],
      ["How to cancel", [
        "Open the link in your confirmation email, or use Find my booking with your reference and email, and choose Cancel booking. The page shows the exact refund before you confirm.",
      ]],
    ],
  },
  "operator-terms": {
    title: "Operator terms",
    updated: "26 October 2026",
    sections: [
      ["Eligibility", [
        "You must hold a valid Botswana Tourism Organisation licence for the activities you list, any permits needed for the areas you operate in, and appropriate public liability insurance. Tell us immediately if any of these lapse.",
      ]],
      ["Listings", [
        "Describe experiences accurately, with real photos, and keep prices, start times and blocked dates up to date. We review listings before they go live and may pause any listing that is inaccurate or receives serious complaints.",
        "Prices are in pula and must be the full price to the guest, including any taxes and park fees unless clearly listed as excluded.",
      ]],
      ["Commission and payment", [
        `Commission is ${pct}% of the booking value unless agreed otherwise in writing, charged only on confirmed bookings. On refunded amounts no commission is charged.`,
        "Where you allow deposits, the deposit collected by us covers our commission, and you collect the balance from the guest on the day.",
        "We pay what we hold for you, less commission, after the experience has taken place, normally weekly, to the bank account or mobile wallet on your profile. Payouts are in pula.",
      ]],
      ["Your obligations to guests", [
        "Honour every confirmed booking. If you must cancel, do so as early as possible through your dashboard: the guest receives a full refund. Repeated cancellations may lead to suspension.",
        "Respond to guest messages within 24 hours and contact guests if timings or meeting points change.",
        "Treat guest personal data only for delivering the booking, keep it secure, and don't use it for unrelated marketing.",
      ]],
      ["Ending the agreement", [
        "You can stop listing at any time; confirmed bookings must still be honoured or cancelled with a full refund. We may suspend or remove operators who breach these terms, put guests at risk, or lose their licence.",
      ]],
    ],
  },
};

type P = Promise<{ page: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = PAGES[(await params).page];
  return p ? { title: p.title } : {};
}

export default async function LegalPage({ params }: { params: P }) {
  const p = PAGES[(await params).page];
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-[38px] font-extrabold">{p.title}</h1>
      <p className="mt-2 text-[14px] text-ink-2">Last updated {p.updated}</p>
      {p.sections.map(([h, paras]) => (
        <section key={h} className="mt-8">
          <h2 className="text-[22px] font-extrabold">{h}</h2>
          {paras.map((t, i) => (
            <p key={i} className="mt-3 max-w-[70ch]">{t}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
