import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/AuthForms";
import { getUser, safeNext } from "@/lib/auth";
import { COUNTRIES } from "@/lib/catalog";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(safeNext(next, "/trips"));
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-[34px] font-extrabold">Create an account</h1>
      <p className="mb-6 text-ink-2">Keep your trips in one place. Operators: create an account first, then apply to list.</p>
      <SignupForm next={next} countries={COUNTRIES} />
    </div>
  );
}
