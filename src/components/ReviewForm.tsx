"use client";

import { useActionState, useState } from "react";
import { reviewAction } from "@/app/actions/booking";
import { FormError, SubmitButton } from "./forms";

export function ReviewForm({ bookingRef, token }: { bookingRef: string; token: string }) {
  const [state, action] = useActionState(reviewAction, undefined);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <FormError state={state} />;
  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="ref" value={bookingRef} />
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="field-label">Overall</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className={`text-[32px] leading-none ${n <= rating ? "text-ochre" : "text-line"}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="body" className="field-label">What should the next traveller know?</label>
        <textarea id="body" name="body" className="input min-h-32" maxLength={2000} required />
      </div>
      <FormError state={state} />
      <SubmitButton pending="Posting…">Post review</SubmitButton>
    </form>
  );
}
