import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { formatDateTime } from "@/lib/dates";
import { SubmitButton } from "@/components/forms";
import { setRoleAction } from "@/app/actions/admin";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(q ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(100);
  return (
    <div>
      <h1 className="mb-4 text-[30px] font-extrabold">Users</h1>
      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={q} className="input max-w-xs" placeholder="Email or name" />
        <button className="btn-secondary">Search</button>
      </form>
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-[15px]">
          <thead className="border-b border-line text-[14px] text-ink-2">
            <tr><th className="px-4 py-2 font-normal">Name</th><th className="px-4 py-2 font-normal">Email</th><th className="px-4 py-2 font-normal">Joined</th><th className="px-4 py-2 font-normal">Role</th></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-line-2 last:border-0">
                <td className="px-4 py-2.5">{u.name}</td>
                <td className="px-4 py-2.5">{u.email}</td>
                <td className="px-4 py-2.5">{formatDateTime(u.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <form action={setRoleAction} className="flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input w-auto py-1.5">
                      <option value="TOURIST">Traveller</option>
                      <option value="PROVIDER">Operator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <SubmitButton className="btn-secondary py-1.5">Set</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
