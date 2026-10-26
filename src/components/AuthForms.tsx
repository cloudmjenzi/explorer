"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup } from "@/app/actions/session";
import { FormError, SubmitButton } from "./forms";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="panel space-y-4 p-6">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormError state={state} />
      <SubmitButton className="btn-primary w-full" pending="Logging in…">Log in</SubmitButton>
      <p className="text-center text-[15px] text-ink-2">
        New here? <Link className="link" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
      </p>
    </form>
  );
}

export function SignupForm({ next, countries }: { next?: string; countries: string[] }) {
  const [state, action] = useActionState(signup, undefined);
  return (
    <form action={action} className="panel space-y-4 p-6">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="field-label" htmlFor="name">Full name</label>
        <input className="input" id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="field-hint">At least 10 characters.</span>
      </div>
      <div>
        <label className="field-label" htmlFor="country">Country <span className="font-normal text-ink-2">(optional)</span></label>
        <select className="input" id="country" name="country" defaultValue="">
          <option value="">Choose…</option>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <FormError state={state} />
      <SubmitButton className="btn-primary w-full" pending="Creating account…">Create account</SubmitButton>
      <p className="text-center text-[15px] text-ink-2">
        Already registered? <Link className="link" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>
      </p>
    </form>
  );
}
