"use client";

import { useActionState } from "react";
import Link from "next/link";
import { applyAction, updateProfileAction } from "@/app/actions/provider";
import { FormError, SubmitButton } from "./forms";

interface Defaults {
  businessName?: string;
  about?: string;
  phone?: string;
  whatsapp?: string | null;
  email?: string;
  regionId?: string;
  licenceNumber?: string;
  cipaNumber?: string | null;
  payoutMethod?: string;
  payoutDetails?: string;
}

export function ProviderProfileForm({
  mode,
  regions,
  defaults = {},
}: {
  mode: "apply" | "edit";
  regions: { id: string; name: string }[];
  defaults?: Defaults;
}) {
  const [state, action] = useActionState(mode === "apply" ? applyAction : updateProfileAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Your business</legend>
        <div>
          <label className="field-label" htmlFor="businessName">Business name</label>
          <input className="input" id="businessName" name="businessName" required defaultValue={defaults.businessName} />
          <span className="field-hint">As travellers will see it.</span>
        </div>
        <div>
          <label className="field-label" htmlFor="about">About you</label>
          <textarea className="input min-h-32" id="about" name="about" required defaultValue={defaults.about} placeholder="Who you are, how long you've guided, what makes your trips different." />
        </div>
        <div>
          <label className="field-label" htmlFor="regionId">Main region</label>
          <select className="input" id="regionId" name="regionId" required defaultValue={defaults.regionId ?? ""}>
            <option value="">Choose…</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="licenceNumber">BTO licence number</label>
            <input className="input" id="licenceNumber" name="licenceNumber" required defaultValue={defaults.licenceNumber} />
            <span className="field-hint">Botswana Tourism Organisation operating licence.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="cipaNumber">CIPA registration <span className="font-normal text-ink-2">(optional)</span></label>
            <input className="input" id="cipaNumber" name="cipaNumber" defaultValue={defaults.cipaNumber ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Contact for bookings</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="email">Bookings email</label>
            <input className="input" id="email" name="email" type="email" required defaultValue={defaults.email} />
            <span className="field-hint">New bookings are sent here.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="phone">Phone</label>
            <input className="input" id="phone" name="phone" type="tel" required defaultValue={defaults.phone} placeholder="+267 71 234 567" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="whatsapp">WhatsApp <span className="font-normal text-ink-2">(optional)</span></label>
          <input className="input" id="whatsapp" name="whatsapp" type="tel" defaultValue={defaults.whatsapp ?? ""} />
          <span className="field-hint">Confirmed guests get a button to message you here.</span>
        </div>
      </fieldset>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Getting paid</legend>
        <div>
          <label className="field-label" htmlFor="payoutMethod">Pay me by</label>
          <select className="input" id="payoutMethod" name="payoutMethod" defaultValue={defaults.payoutMethod ?? "BANK"}>
            <option value="BANK">Bank transfer</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="MYZAKA">Mascom MyZaka</option>
            <option value="SMEGA">BTC Smega</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="payoutDetails">Account details</label>
          <textarea className="input min-h-20" id="payoutDetails" name="payoutDetails" required defaultValue={defaults.payoutDetails} placeholder="Bank, branch code, account name and number. Or the wallet number and registered name." />
          <span className="field-hint">Only our finance team sees this.</span>
        </div>
      </fieldset>

      {mode === "apply" && (
        <label className="flex gap-3 text-[15px]">
          <input type="checkbox" name="agree" required className="mt-1" />
          <span>
            I agree to the <Link href="/legal/operator-terms" className="link" target="_blank">operator terms</Link>, including the commission on confirmed bookings, and confirm my business holds a valid tourism licence.
          </span>
        </label>
      )}
      <FormError state={state} />
      <SubmitButton pending={mode === "apply" ? "Sending application…" : "Saving…"}>
        {mode === "apply" ? "Send application" : "Save profile"}
      </SubmitButton>
    </form>
  );
}
