import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { sessions, users, providers, type User, type Provider } from "@/db/schema";
import { secureToken } from "./ids";

const COOKIE = "bw_session";
const SESSION_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

let dummy: Promise<string> | null = null;
/** A real bcrypt hash to compare against when an account doesn't exist (constant-time-ish login). */
export function dummyHash(): Promise<string> {
  dummy ??= bcrypt.hash("not-a-real-password", 12);
  return dummy;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId: string): Promise<void> {
  const token = secureToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: hash(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https"),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hash(token)));
  jar.delete(COOKIE);
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "phone" | "country"> & {
  provider: Pick<Provider, "id" | "status" | "businessName" | "slug"> | null;
};

/** Current user, memoised per request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      phone: users.phone,
      country: users.country,
      providerId: providers.id,
      providerStatus: providers.status,
      businessName: providers.businessName,
      providerSlug: providers.slug,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(providers, eq(providers.userId, users.id))
    .where(and(eq(sessions.id, hash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    phone: r.phone,
    country: r.country,
    provider: r.providerId
      ? { id: r.providerId, status: r.providerStatus!, businessName: r.businessName!, slug: r.providerSlug! }
      : null,
  };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** Provider area: any user with a provider profile (pending ones see a limited dashboard). */
export async function requireProvider(): Promise<SessionUser & { provider: NonNullable<SessionUser["provider"]> }> {
  const user = await requireUser("/provider");
  if (!user.provider) redirect("/partners/apply");
  return user as SessionUser & { provider: NonNullable<SessionUser["provider"]> };
}

export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
