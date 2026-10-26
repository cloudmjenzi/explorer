import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, reviews } from "@/db/schema";
import { currentProvider } from "@/lib/provider";
import { formatDateTime } from "@/lib/dates";
import { SubmitButton } from "@/components/forms";
import { replyReviewAction } from "@/app/actions/provider";

export default async function ProviderReviews() {
  const { provider } = await currentProvider();
  const rows = await db
    .select({ r: reviews, title: listings.title })
    .from(reviews)
    .innerJoin(listings, eq(listings.id, reviews.listingId))
    .where(eq(listings.providerId, provider.id))
    .orderBy(desc(reviews.createdAt));
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-[30px] font-extrabold">Reviews</h1>
      {rows.length === 0 ? (
        <p className="text-ink-2">No reviews yet. Guests are asked for one the day after their trip.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ r, title }) => (
            <li key={r.id} className="panel p-4">
              <p className="text-[14px] text-ink-2">{title} · {formatDateTime(r.createdAt)}</p>
              <p className="mt-1"><span className="font-bold">{r.author}, {r.country}</span> <span className="text-ochre">{"★".repeat(r.rating)}</span></p>
              <p className="mt-1">{r.body}</p>
              <form action={replyReviewAction} className="mt-3 space-y-2">
                <input type="hidden" name="reviewId" value={r.id} />
                <label className="field-label" htmlFor={`reply-${r.id}`}>Your public reply</label>
                <textarea id={`reply-${r.id}`} name="reply" className="input min-h-20" defaultValue={r.reply ?? ""} maxLength={1000} />
                <SubmitButton className="btn-secondary py-2">Save reply</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
