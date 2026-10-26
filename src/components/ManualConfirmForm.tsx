"use client";

import { useActionState } from "react";
import { confirmManualPaymentAction } from "@/app/actions/admin";
import { FormError, SubmitButton } from "./forms";

export function ManualConfirmForm({ bookingId, amount, method }: { bookingId: string; amount: string; method: string }) {
  const [state, action] = useActionState(confirmManualPaymentAction, undefined);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <label className="field-label text-[13px]" htmlFor={`pr-${bookingId}`}>{method} transaction ID for {amount}</label>
        <input id={`pr-${bookingId}`} name="payerRef" className="input py-2" required />
      </div>
      <SubmitButton className="btn-primary py-2" pending="Confirming…">Payment received, confirm</SubmitButton>
      <div className="w-full"><FormError state={state} /></div>
    </form>
  );
}
