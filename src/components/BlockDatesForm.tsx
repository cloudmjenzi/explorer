"use client";

import { useActionState } from "react";
import { blockDatesAction } from "@/app/actions/provider";
import { FormError, SubmitButton } from "./forms";

export function BlockDatesForm({ listingId, today }: { listingId: string; today: string }) {
  const [state, action] = useActionState(blockDatesAction, undefined);
  return (
    <form action={action} className="panel grid gap-3 p-5 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
      <input type="hidden" name="id" value={listingId} />
      <div>
        <label className="field-label" htmlFor="from">From</label>
        <input className="input" type="date" id="from" name="from" min={today} required />
      </div>
      <div>
        <label className="field-label" htmlFor="to">To</label>
        <input className="input" type="date" id="to" name="to" min={today} />
      </div>
      <div>
        <label className="field-label" htmlFor="reason">Reason <span className="font-normal text-ink-2">(only you see it)</span></label>
        <input className="input" id="reason" name="reason" maxLength={120} placeholder="Private charter" />
      </div>
      <div className="self-end"><SubmitButton pending="Blocking…">Block</SubmitButton></div>
      <div className="sm:col-span-4"><FormError state={state} /></div>
    </form>
  );
}
