import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { bookingsForUser } from "@/lib/bookings";
import { formatDate, todayInBotswana } from "@/lib/dates";
import { formatBwp } from "@/lib/money";
import { PageHeader, Photo, StatusBadge } from "@/components/ui";
import { FindBookingForm } from "@/components/FindBookingForm";

export const metadata: Metadata = { title: "My trips", robots: { index: false } };

export default async function Trips() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <PageHeader title="Find my booking" intro="Enter the reference from your confirmation email and the email you booked with." />
        <FindBookingForm />
        <p className="mt-8 text-[15px] text-ink-2">
          Have an account? <Link href="/login?next=/trips" className="link">Log in</Link> to see all your trips.
        </p>
      </div>
    );
  }
  const all = await bookingsForUser(user.id, user.email);
  const today = todayInBotswana();
  const upcoming = all.filter((b) => b.date >= today && !["CANCELLED", "EXPIRED"].includes(b.status)).reverse();
  const past = all.filter((b) => !upcoming.includes(b));

  const Row = ({ b }: { b: (typeof all)[number] }) => (
    <li>
      <Link href={`/bookings/${b.ref}?t=${b.manageToken}`} className="flex gap-4 rounded-md p-2 hover:bg-paper">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-sm bg-sky-soft">
          <Photo image={b.listing.images[0]} category={b.listing.category} className="h-full w-full" sizes="112px" />
        </div>
        <div className="min-w-0">
          <p className="font-bold">{b.listing.title}</p>
          <p className="text-[14px] text-ink-2">
            {formatDate(b.date)} at {b.startTime} · {b.guests} guest{b.guests > 1 ? "s" : ""} · {formatBwp(b.totalThebe)}
          </p>
          <div className="mt-1"><StatusBadge status={b.status} /></div>
        </div>
      </Link>
    </li>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="My trips" />
      <h2 className="mb-3 text-[22px] font-extrabold">Upcoming</h2>
      {upcoming.length ? (
        <ul className="space-y-2">{upcoming.map((b) => <Row key={b.id} b={b} />)}</ul>
      ) : (
        <p className="text-ink-2">Nothing booked yet. <Link className="link" href="/explore">Find an experience</Link>.</p>
      )}
      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[22px] font-extrabold">Past and cancelled</h2>
          <ul className="space-y-2">{past.map((b) => <Row key={b.id} b={b} />)}</ul>
        </>
      )}
    </div>
  );
}
