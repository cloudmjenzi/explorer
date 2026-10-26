import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, reviews } from "@/db/schema";
import { formatDateTime } from "@/lib/dates";
import { SubmitButton } from "@/components/forms";
import { reviewVisibilityAction } from "@/app/actions/admin";

export default async function AdminReviews() {
  const rows = await db
    .select({ r: reviews, title: listings.title })
    .from(reviews)
    .innerJoin(listings, eq(listings.id, reviews.listingId))
    .orderBy(desc(reviews.createdAt))
    .limit(200);
  return (
    <div>
      <h1 className="mb-6 text-[30px] font-extrabold">Reviews</h1>
      {rows.length === 0 && <p className="text-ink-2">No reviews yet.</p>}
      <ul className="space-y-3">
        {rows.map(({ r, title }) => (
          <li key={r.id} className={`panel p-4 ${r.hidden ? "opacity-60" : ""}`}>
            <p className="text-[14px] text-ink-2">{title} · {formatDateTime(r.createdAt)}</p>
            <p><span className="font-bold">{r.author}, {r.country}</span> <span className="text-ochre">{"★".repeat(r.rating)}</span></p>
            <p className="mt-1">{r.body}</p>
            <form action={reviewVisibilityAction} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="hidden" value={r.hidden ? "0" : "1"} />
              <SubmitButton className="btn-secondary py-1.5">{r.hidden ? "Show" : "Hide"}</SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
