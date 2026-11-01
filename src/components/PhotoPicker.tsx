"use client";

import { useRef, useState } from "react";

const MAX_EDGE = 2000;
const QUALITY = 0.85;
const MAX_TOTAL = 36 * 1024 * 1024; // stays under the 40 MB server limit with the rest of the form
const MAX_FILES = 12;

function mb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0) + " MB";
}

/** Downscale in the browser so operators on mobile data upload ~0.5 MB per photo instead of 5–10 MB. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Browser can't decode it (e.g. HEIC outside Safari): send the original, the server converts it.
    return file;
  }
}

export function PhotoPicker({ existing }: { existing: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return setStatus(null);
    if (existing + picked.length > MAX_FILES) {
      e.target.value = "";
      return setStatus({ tone: "error", text: `You can have up to ${MAX_FILES} photos. You have ${existing}, so pick ${MAX_FILES - existing} or fewer.` });
    }
    setBusy(true);
    setStatus({ tone: "info", text: `Preparing ${picked.length} photo${picked.length > 1 ? "s" : ""}…` });
    const before = picked.reduce((s, f) => s + f.size, 0);
    const out = await Promise.all(picked.map(shrink));
    const after = out.reduce((s, f) => s + f.size, 0);
    const dt = new DataTransfer();
    out.forEach((f) => dt.items.add(f));
    if (input.current) input.current.files = dt.files;
    setBusy(false);
    if (after > MAX_TOTAL) {
      if (input.current) input.current.value = "";
      return setStatus({ tone: "error", text: `These photos are ${mb(after)} together. Pick fewer at a time (up to ${mb(MAX_TOTAL)}) and save between batches.` });
    }
    setStatus({
      tone: "info",
      text: `${out.length} photo${out.length > 1 ? "s" : ""} ready, ${mb(after)}${after < before * 0.9 ? ` (reduced from ${mb(before)})` : ""}. They upload when you save.`,
    });
  }

  return (
    <div>
      <input
        ref={input}
        className="block text-[15px]"
        type="file"
        name="photos"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={onChange}
        aria-describedby="photo-help photo-status"
      />
      <span id="photo-help" className="field-hint">
        Up to {MAX_FILES} photos in total. Landscape works best. Real photos of your trip, not stock images. Large phone photos are reduced automatically.
      </span>
      <p id="photo-status" role="status" className={`mt-2 text-[14px] ${status?.tone === "error" ? "text-danger" : "text-ink-2"}`}>
        {busy ? "Preparing photos…" : status?.text}
      </p>
    </div>
  );
}
