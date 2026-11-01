"use server";

import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { secureToken } from "@/lib/ids";
import { mail } from "@/lib/email";
import { audit } from "@/lib/audit";
import type { FormState } from "./session";

const RESET_MINUTES = 60;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function requestResetAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("reset-request", 5, 3600))) return { error: "Too many requests. Try again in an hour." };
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter the email address you registered with." };
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.email, email.data));
  if (user) {
    const token = secureToken(32);
    await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));
    await db.insert(passwordResets).values({ id: hash(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) });
    await mail.passwordReset(user.email, user.name, token, RESET_MINUTES);
  }
  // Same answer whether or not the account exists, so this can't be used to discover who is registered.
  return { ok: `If ${email.data} has an account, a reset link is on its way. It works for ${RESET_MINUTES} minutes.` };
}

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await rateLimit("reset", 10, 3600))) return { error: "Too many attempts. Try again in an hour." };
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.id, hash(parsed.data.token)), gt(passwordResets.expiresAt, new Date())));
  if (!reset) return { error: "This reset link has expired or was already used. Ask for a new one." };
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, reset.userId));
    // One-time token, and log out every other device.
    await tx.delete(passwordResets).where(eq(passwordResets.userId, reset.userId));
    await tx.delete(sessions).where(eq(sessions.userId, reset.userId));
  });
  await audit(reset.userId, "user.password_reset", "user", reset.userId);
  await createSession(reset.userId);
  redirect("/trips?reset=1");
}
