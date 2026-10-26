"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import type { FormState } from "./session";

export async function findBooking(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("find", 10, 900))) return { error: "Too many lookups. Wait 15 minutes and try again." };
  let ref = String(formData.get("ref") ?? "").trim().toUpperCase().replace(/\s/g, "");
  if (ref && !ref.startsWith("BW-")) ref = `BW-${ref.replace(/^BW/, "")}`;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const [b] = await db
    .select({ ref: bookings.ref, token: bookings.manageToken })
    .from(bookings)
    .where(and(eq(bookings.ref, ref), eq(bookings.email, email)))
    .limit(1);
  if (!b) return { error: "No booking matches that reference and email. Check your confirmation email." };
  redirect(`/bookings/${b.ref}?t=${b.token}`);
}
