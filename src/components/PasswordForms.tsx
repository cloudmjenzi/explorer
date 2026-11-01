"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestResetAction, resetPasswordAction } from "@/app/actions/password";
import { FormError, SubmitButton } from "./forms";

export function RequestResetForm() {
  const [state, action] = useActionState(requestResetAction, undefined);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form action={action} className="panel space-y-4 p-6">
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormError state={state} />
      <SubmitButton className="btn-primary w-full" pending="Sending…">Email me a reset link</SubmitButton>
      <p className="text-center text-[15px] text-ink-2">
        Remembered it? <Link className="link" href="/login">Log in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="panel space-y-4 p-6">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="field-label" htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="field-hint">At least 10 characters. You'll be logged out on other devices.</span>
      </div>
      <FormError state={state} />
      <SubmitButton className="btn-primary w-full" pending="Saving…">Set new password</SubmitButton>
    </form>
  );
}
