import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { providers, regions, users } from "@/db/schema";
import { formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { providerCommissionAction, providerDecisionAction } from "@/app/actions/admin";

export default async function AdminProviders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const rows = await db
    .select({ p: providers, region: regions.name, account: users.email })
    .from(providers)
    .innerJoin(regions, eq(regions.id, providers.regionId))
    .innerJoin(users, eq(users.id, providers.userId))
    .where(status ? eq(providers.status, status as "PENDING") : undefined)
    .orderBy(desc(providers.createdAt));
  return (
    <div>
      <h1 className="mb-6 text-[30px] font-extrabold">Operators</h1>
      <ul className="space-y-4">
        {rows.map(({ p, region, account }) => (
          <li key={p.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-[20px] font-bold">{p.businessName}</p>
                <p className="text-[15px] text-ink-2">{region} · applied {formatDateTime(p.createdAt)} · account {account}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-[10rem_1fr]">
              <dt className="text-ink-2">BTO licence</dt><dd className="font-bold">{p.licenceNumber}</dd>
              <dt className="text-ink-2">CIPA</dt><dd>{p.cipaNumber ?? "Not given"}</dd>
              <dt className="text-ink-2">Contact</dt><dd>{p.email} · {p.phone}{p.whatsapp ? ` · WhatsApp ${p.whatsapp}` : ""}</dd>
              <dt className="text-ink-2">Payout</dt><dd>{p.payoutMethod}: <span className="whitespace-pre-line">{p.payoutDetails}</span></dd>
              <dt className="text-ink-2">About</dt><dd className="text-ink-2">{p.about}</dd>
            </dl>
            <div className="mt-4 flex flex-wrap items-end gap-6">
              <form action={providerDecisionAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={p.id} />
                <div>
                  <label className="field-label text-[13px]" htmlFor={`note-${p.id}`}>Note to operator</label>
                  <input id={`note-${p.id}`} name="note" className="input w-72 py-2" defaultValue={p.adminNote ?? ""} />
                </div>
                {p.status !== "APPROVED" && <SubmitButton name="intent" value="approve" className="btn-primary py-2">Approve</SubmitButton>}
                {p.status === "PENDING" && <SubmitButton name="intent" value="reject" className="btn-danger py-2">Reject</SubmitButton>}
                {p.status === "APPROVED" && <SubmitButton name="intent" value="suspend" className="btn-danger py-2">Suspend</SubmitButton>}
              </form>
              <form action={providerCommissionAction} className="flex items-end gap-2">
                <input type="hidden" name="id" value={p.id} />
                <div>
                  <label className="field-label text-[13px]" htmlFor={`c-${p.id}`}>Commission %</label>
                  <input id={`c-${p.id}`} name="commission" type="number" step="0.5" min="0" max="50" className="input w-24 py-2" defaultValue={p.commissionBps / 100} />
                </div>
                <SubmitButton className="btn-secondary py-2">Save</SubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-ink-2">No operators{status ? " with that status" : ""}.</p>}
    </div>
  );
}
