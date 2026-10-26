"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pending,
  className = "btn-primary",
  name,
  value,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={status.pending} name={name} value={value}>
      {status.pending ? (pending ?? "Saving…") : children}
    </button>
  );
}

export function FormError({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-md border-l-4 border-danger/50 bg-danger-soft px-4 py-3 text-[15px]">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="rounded-md border-l-4 border-mopane/50 bg-mopane-soft px-4 py-3 text-[15px]">
        {state.ok}
      </p>
    );
  return null;
}

export function ConfirmButton({
  children,
  message,
  className = "btn-danger",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={status.pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
