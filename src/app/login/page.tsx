import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getUser, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(safeNext(next, "/trips"));
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-[34px] font-extrabold">Log in</h1>
      <LoginForm next={next} />
    </div>
  );
}
