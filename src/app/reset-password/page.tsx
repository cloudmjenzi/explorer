import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-[34px] font-extrabold">Choose a new password</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-ink-2">
          This link is incomplete. <Link className="link" href="/forgot-password">Ask for a new reset link</Link>.
        </p>
      )}
    </div>
  );
}
