import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { regions } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { ProviderProfileForm } from "@/components/ProviderProfileForm";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Apply to list", robots: { index: false } };

export default async function Apply() {
  const user = await getUser();
  if (user?.provider) redirect("/provider");
  const rs = await db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(asc(regions.sort));
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-[36px] font-extrabold">Apply to list your business</h1>
      <p className="mb-8 mt-2 text-ink-2">Takes about 5 minutes. You can add your trips straight after.</p>
      {user ? (
        <ProviderProfileForm mode="apply" regions={rs} defaults={{ email: user.email, phone: user.phone ?? "" }} />
      ) : (
        <Notice>
          First, <Link href="/signup?next=/partners/apply" className="link">create an account</Link> or{" "}
          <Link href="/login?next=/partners/apply" className="link">log in</Link>. You'll use it to manage your listings and bookings.
        </Notice>
      )}
    </div>
  );
}
