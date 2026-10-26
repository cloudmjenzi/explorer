import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/bookings", "Bookings"],
  ["/admin/providers", "Operators"],
  ["/admin/listings", "Listings"],
  ["/admin/payouts", "Payouts"],
  ["/admin/reviews", "Reviews"],
  ["/admin/users", "Users"],
] as const;

export const metadata = { robots: { index: false }, title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[22px] font-extrabold">Admin</p>
        <nav className="flex flex-wrap gap-1 text-[15px]" aria-label="Admin">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-1.5 hover:bg-sky-soft">{label}</Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
