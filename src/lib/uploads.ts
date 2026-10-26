import "server-only";
import sharp from "sharp";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { createId } from "./ids";

const MAX_BYTES = 12 * 1024 * 1024;

export function uploadRoot(): string {
  return path.resolve(config.uploadDir);
}

/**
 * Re-encodes an uploaded photo to WebP (max 1800px wide), stripping EXIF/GPS metadata.
 * Re-encoding also guarantees we never serve the original bytes, so a disguised file can't get through.
 */
export async function saveListingPhoto(file: File): Promise<{ path: string; width: number; height: number }> {
  if (file.size === 0) throw new Error("Empty file");
  if (file.size > MAX_BYTES) throw new Error("Photos must be under 12 MB");
  const input = Buffer.from(await file.arrayBuffer());
  const img = sharp(input, { failOn: "error" }).rotate();
  const meta = await img.metadata();
  if (!meta.format || !["jpeg", "png", "webp", "heif", "avif"].includes(meta.format)) {
    throw new Error("Upload JPG, PNG, WebP or HEIC photos");
  }
  const { data, info } = await img
    .resize({ width: 1800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const now = new Date();
  const rel = `listings/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${createId()}.webp`;
  const abs = path.join(uploadRoot(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
  return { path: rel, width: info.width, height: info.height };
}

export async function deleteUpload(rel: string): Promise<void> {
  const abs = path.join(uploadRoot(), rel);
  if (!abs.startsWith(uploadRoot())) return;
  await unlink(abs).catch(() => undefined);
}

export { mediaUrl } from "./media";
