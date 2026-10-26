import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-[36px] font-extrabold">That page isn't here</h1>
      <p className="mt-3 text-ink-2">The experience may have been paused by its operator, or the link is mistyped.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/explore" className="btn-primary">Browse experiences</Link>
        <Link href="/trips" className="btn-secondary">Find my booking</Link>
      </div>
    </div>
  );
}
