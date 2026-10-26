import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts, providers } from "@/db/schema";
import { getUser } from "@/lib/auth";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Neutralise spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  const user = await getUser();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const rows = await db
    .select({ p: payouts, name: providers.businessName, method: providers.payoutMethod, details: providers.payoutDetails })
    .from(payouts)
    .innerJoin(providers, eq(providers.id, payouts.providerId))
    .orderBy(desc(payouts.createdAt));
  const lines = [
    ["payout_id", "operator", "amount_bwp", "status", "method", "account", "created", "paid", "reference"].map(cell).join(","),
    ...rows.map(({ p, name, method, details }) =>
      [p.id, name, (p.amountThebe / 100).toFixed(2), p.status, method, details, p.createdAt.toISOString(), p.paidAt?.toISOString() ?? "", p.reference ?? ""]
        .map(cell)
        .join(","),
    ),
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="payouts.csv"' },
  });
}
