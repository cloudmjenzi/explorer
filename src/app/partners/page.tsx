import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "List your tours and activities",
  description: "Licensed Botswana tour operators, guides, camps and transfer companies: take bookings online by card and mobile money.",
};

export default function Partners() {
  const pct = config.defaultCommissionBps / 100;
  return (
    <div>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h1 className="max-w-[18ch] text-[40px] font-extrabold leading-[1.05] sm:text-[54px]">
            Take bookings from travellers before they land in Maun.
          </h1>
          <p className="mt-5 max-w-[56ch] text-[18px] text-ink-2">
            Mokoro polers, guides, camps, boat operators and transfer companies list here for free. You set the price
            and the calendar. We bring the guests and handle payment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/partners/apply" className="btn-primary px-6 py-3">Apply to list</Link>
            <a href={`mailto:${config.supportEmail}?subject=Listing my business`} className="btn-secondary px-6 py-3">Ask a question</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-[30px] font-extrabold">How it works</h2>
        <ol className="grid gap-8 md:grid-cols-4">
          {[
            ["Apply", "Send your business details and Botswana Tourism Organisation licence. We check them within 2 working days."],
            ["List", "Add your trips with photos, start times, prices in pula and the days you run. Block dates whenever you're full."],
            ["Get booked", "Guests pay by card, Orange Money, MyZaka or Smega. You get an email the moment a booking is confirmed."],
            ["Get paid", "After the trip, we pay what you've earned to your bank or mobile wallet, less commission."],
          ].map(([t, d], i) => (
            <li key={t}>
              <span className="font-display text-[44px] font-extrabold leading-none text-sky">{i + 1}</span>
              <h3 className="mt-2 text-[20px] font-extrabold">{t}</h3>
              <p className="mt-1 text-[15px] text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 rounded-lg border border-line bg-paper p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <h2 className="text-[28px] font-extrabold">What it costs</h2>
            <p className="mt-3 text-[17px]">
              <span className="font-display text-[40px] font-extrabold">{pct}%</span> commission on confirmed bookings. Nothing to join, no monthly fee.
            </p>
            <p className="mt-3 text-ink-2">
              If a guest cancels and gets a refund, you don't pay commission on the refunded part. If you take deposits,
              the deposit covers our commission and the guest pays you the balance on the day.
            </p>
          </div>
          <div>
            <h2 className="text-[28px] font-extrabold">What you need</h2>
            <ul className="mt-3 space-y-2 text-[16px]">
              <li>A valid Botswana Tourism Organisation licence</li>
              <li>A phone and email you check daily</li>
              <li>A bank account or Orange Money, MyZaka or Smega wallet for payouts</li>
              <li>A few good photos of your trips (phone photos are fine)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
