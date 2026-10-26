"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, dummyHash, hashPassword, safeNext, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { linkGuestBookings } from "@/lib/bookings";
import { DISPLAY_CURRENCIES } from "@/lib/money";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: string } | undefined;

export async function setCurrency(formData: FormData) {
  const c = String(formData.get("currency"));
  if ((DISPLAY_CURRENCIES as readonly string[]).includes(c)) {
    (await cookies()).set("bw_cur", c, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  revalidatePath("/", "layout");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("login", 10, 600))) return { error: "Too many attempts. Wait 10 minutes and try again." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  // Compare against a dummy hash when the user doesn't exist so timing doesn't reveal accounts.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) return { error: "That email and password don't match an account." };
  await createSession(user.id);
  await linkGuestBookings(user.id, user.email);
  const fallback = user.role === "ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/provider" : "/trips";
  redirect(safeNext(formData.get("next"), fallback));
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  country: z.string().trim().max(60).optional(),
});

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("signup", 5, 3600))) return { error: "Too many sign-ups from this network. Try again later." };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing.length) return { error: "An account with this email already exists. Log in instead." };
  const [user] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      country: parsed.data.country || null,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .returning();
  await createSession(user.id);
  await linkGuestBookings(user.id, user.email);
  redirect(safeNext(formData.get("next"), "/trips"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
