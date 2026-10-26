import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { Notice } from "@/components/ui";

const NAV = [
  ["/provider", "Overview"],
  ["/provider/listings", "Listings"],
  ["/provider/bookings", "Bookings"],
  ["/provider/earnings", "Earnings"],
  ["/provider/reviews", "Reviews"],
  ["/provider/profile", "Business profile"],
] as const;

export const metadata = { robots: { index: false } };

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProvider();
  const status = user.provider.status;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[22px] font-extrabold">{user.provider.businessName}</p>
        <nav className="flex flex-wrap gap-1 text-[15px]" aria-label="Operator">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-1.5 hover:bg-sky-soft">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {status === "PENDING" && (
        <div className="mb-6">
          <Notice tone="warning">
            Your business is being reviewed. Build your listings now: they go live once you're approved and each listing passes review.
          </Notice>
        </div>
      )}
      {status === "REJECTED" && (
        <div className="mb-6">
          <Notice tone="error">Your application wasn't approved. Check the note on your profile page, update your details, and email us to re-review.</Notice>
        </div>
      )}
      {status === "SUSPENDED" && (
        <div className="mb-6">
          <Notice tone="error">Your account is suspended and your listings are hidden. Contact us to resolve this.</Notice>
        </div>
      )}
      {children}
    </div>
  );
}
