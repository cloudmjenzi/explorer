import { asc } from "drizzle-orm";
import { db } from "@/db";
import { regions } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { ProviderProfileForm } from "@/components/ProviderProfileForm";
import { Notice, StatusBadge } from "@/components/ui";

export default async function Profile() {
  const { provider } = await currentProvider();
  const rs = await db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(asc(regions.sort));
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-[30px] font-extrabold">Business profile</h1>
        <StatusBadge status={provider.status} />
      </div>
      {provider.adminNote && <div className="mb-6"><Notice tone="warning">Note from our team: {provider.adminNote}</Notice></div>}
      <ProviderProfileForm mode="edit" regions={rs} defaults={provider} />
    </div>
  );
}
