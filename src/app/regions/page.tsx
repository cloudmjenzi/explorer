import type { Metadata } from "next";
import Link from "next/link";
import { BotswanaMap } from "@/components/BotswanaMap";
import { PageHeader } from "@/components/ui";
import { regionsWithCounts } from "@/lib/queries";

export const metadata: Metadata = { title: "Regions of Botswana" };

export default async function Regions() {
  const regions = await regionsWithCounts();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Regions" intro="Ten areas, each with its own season. Choose by what you want to see and when you can travel." />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <BotswanaMap regions={regions} className="h-auto w-full" />
        </div>
        <ol className="space-y-8">
          {regions.map((r) => (
            <li key={r.slug} className="border-b border-line pb-8 last:border-0">
              <h2 className="text-[24px] font-extrabold">
                <Link href={`/regions/${r.slug}`} className="hover:text-delta">{r.name}</Link>
              </h2>
              <p className="mt-2 text-ink-2">{r.summary}</p>
              <dl className="mt-3 grid gap-1 text-[15px] sm:grid-cols-[7rem_1fr]">
                <dt className="font-bold">Best time</dt>
                <dd className="text-ink-2">{r.bestTime}</dd>
                <dt className="font-bold">Fly or drive to</dt>
                <dd className="text-ink-2">{r.gateway}</dd>
              </dl>
              <Link href={`/regions/${r.slug}`} className="link mt-3 inline-block text-[15px]">
                {r.count > 0 ? `See ${r.count} experience${r.count > 1 ? "s" : ""}` : "See region"}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
