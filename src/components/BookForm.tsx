"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { bookAction } from "@/app/actions/booking";
import { FormError, SubmitButton } from "./forms";

interface MethodOption {
  value: string;
  label: string;
  hint: string;
}

export function BookForm(props: {
  hidden: Record<string, string>;
  defaults: { name: string; email: string; phone: string; country: string };
  countries: string[];
  methods: MethodOption[];
  dueNow: string;
}) {
  const [state, action] = useActionState(bookAction, undefined);
  const [method, setMethod] = useState(props.methods[0]?.value ?? "");
  return (
    <form action={action} className="space-y-6">
      {Object.entries(props.hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Lead guest</legend>
        <div>
          <label className="field-label" htmlFor="leadName">Full name</label>
          <input className="input" id="leadName" name="leadName" autoComplete="name" required defaultValue={props.defaults.name} />
          <span className="field-hint">As it appears on their passport or ID.</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={props.defaults.email} />
            <span className="field-hint">Your confirmation goes here.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="phone">Mobile number</label>
            <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="+267 71 234 567" defaultValue={props.defaults.phone} />
            <span className="field-hint">Your guide may WhatsApp you on the day.</span>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="country">Country you live in</label>
          <select className="input" id="country" name="country" required defaultValue={props.defaults.country}>
            <option value="">Choose…</option>
            {props.countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="notes">Anything the operator should know? <span className="font-normal text-ink-2">(optional)</span></label>
          <textarea className="input min-h-24" id="notes" name="notes" maxLength={1000} placeholder="Dietary needs, mobility, your lodge for pick-up, children's ages…" />
        </div>
      </fieldset>

      <fieldset className="panel space-y-3 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Payment</legend>
        {props.methods.length === 0 ? (
          <p className="text-ink-2">Online payment isn't switched on yet. Contact us to book.</p>
        ) : (
          props.methods.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer gap-3 rounded-md border p-3 ${method === m.value ? "border-delta bg-sky-soft" : "border-line"}`}
            >
              <input type="radio" name="method" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="mt-1" />
              <span>
                <span className="block font-bold">{m.label}</span>
                <span className="block text-[14px] text-ink-2">{m.hint}</span>
              </span>
            </label>
          ))
        )}
      </fieldset>

      <label className="flex gap-3 text-[15px]">
        <input type="checkbox" name="terms" required className="mt-1" />
        <span>
          I accept the <Link href="/legal/terms" className="link" target="_blank">booking terms</Link> and this experience's cancellation policy.
        </span>
      </label>
      <FormError state={state} />
      <SubmitButton className="btn-primary w-full py-3.5 text-[17px]" pending="Reserving your place…">
        {method === "CARD" ? `Pay ${props.dueNow} by card` : `Reserve and get payment details`}
      </SubmitButton>
    </form>
  );
}
