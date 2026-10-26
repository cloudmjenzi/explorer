import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const REF_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679"; // no look-alikes (0/O, 1/I, 5/S, 8/B, 2/Z)

function pick(alphabet: string, length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Collision-resistant primary key (time-ordered prefix + randomness). */
export function createId(): string {
  return Date.now().toString(36) + pick(ALPHABET, 14);
}

/** Human-friendly booking reference, e.g. BW-7KXQ4P. Easy to read out over the phone. */
export function bookingRef(): string {
  return "BW-" + pick(REF_ALPHABET, 6);
}

/** Unguessable token for links in emails (manage booking, review). */
export function secureToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
