import type { Metadata } from "next";
import { RequestResetForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPassword() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-[34px] font-extrabold">Reset your password</h1>
      <p className="mb-6 text-ink-2">Enter the email you registered with and we'll send you a link to choose a new password.</p>
      <RequestResetForm />
    </div>
  );
}
