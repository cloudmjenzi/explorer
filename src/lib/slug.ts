import { randomBytes } from "node:crypto";

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function uniqueSlug(s: string): string {
  return `${slugify(s)}-${randomBytes(3).toString("hex")}`;
}
