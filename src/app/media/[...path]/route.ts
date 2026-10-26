import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { uploadRoot } from "@/lib/uploads";

const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = uploadRoot();
  const abs = path.resolve(root, ...parts);
  if (!abs.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(abs).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const s = await stat(abs);
    const data = await readFile(abs);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(s.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
