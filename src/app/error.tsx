"use client";

export default function Error({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-[32px] font-extrabold">Something went wrong on our side</h1>
      <p className="mt-3 text-ink-2">
        If you were paying, check Find my booking before trying again so you don't pay twice. If it keeps happening, email us with code {error.digest ?? "unknown"}.
      </p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
