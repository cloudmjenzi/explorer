"use client";

import { useActionState } from "react";
import { findBooking } from "@/app/actions/find";
import { FormError, SubmitButton } from "./forms";

export function FindBookingForm() {
  const [state, action] = useActionState(findBooking, undefined);
  return (
    <form action={action} className="panel space-y-4 p-5">
      <div>
        <label className="field-label" htmlFor="ref">Booking reference</label>
        <input className="input uppercase" id="ref" name="ref" placeholder="BW-7KXQ4P" required autoComplete="off" />
      </div>
      <div>
        <label className="field-label" htmlFor="femail">Email</label>
        <input className="input" id="femail" name="email" type="email" required autoComplete="email" />
      </div>
      <FormError state={state} />
      <SubmitButton pending="Finding…">Find booking</SubmitButton>
    </form>
  );
}
