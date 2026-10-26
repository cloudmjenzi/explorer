import Link from "next/link";
import Image from "next/image";
import type { Category, ListingImage } from "@/db/schema";
import { ListingArt } from "./ListingArt";
import { categoryLabel } from "@/lib/catalog";
import { formatBwp } from "@/lib/money";
import { mediaUrl } from "@/lib/media";

export function Stars({ value, count, size = "sm" }: { value: number; count: number; size?: "sm" | "md" }) {
  if (count === 0) return <span className="text-[14px] text-ink-3">New</span>;
  return (
    <span className={`inline-flex items-center gap-1 ${size === "md" ? "text-[16px]" : "text-[14px]"}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-ochre" aria-hidden="true">
        <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z" />
      </svg>
      <span className="font-bold">{value.toFixed(1)}</span>
      <span className="text-ink-2">({count})</span>
    </span>
  );
}

export function Photo({
  image,
  category,
  className,
  priority,
  sizes = "(max-width: 640px) 100vw, 33vw",
}: {
  image?: Pick<ListingImage, "path" | "alt" | "width" | "height"> | null;
  category: Category;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (!image) return <ListingArt category={category} className={className} />;
  return (
    <Image
      src={mediaUrl(image.path)}
      alt={image.alt}
      width={image.width}
      height={image.height}
      className={`object-cover ${className ?? ""}`}
      priority={priority}
      sizes={sizes}
      unoptimized
    />
  );
}

export interface CardListing {
  slug: string;
  title: string;
  category: Category;
  durationLabel: string;
  priceThebe: number;
  pricingUnit: "PER_PERSON" | "PER_GROUP";
  ratingAvg: number;
  ratingCount: number;
  regionName: string;
  image?: Pick<ListingImage, "path" | "alt" | "width" | "height"> | null;
}

export function ListingCard({ l, approx }: { l: CardListing; approx?: string | null }) {
  return (
    <Link href={`/experiences/${l.slug}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden rounded-md bg-sky-soft">
        <Photo image={l.image} category={l.category} className="h-full w-full" />
      </div>
      <div className="mt-3">
        <p className="text-[14px] text-ink-2">
          {categoryLabel(l.category)}, {l.regionName.split(" & ")[0]}
        </p>
        <h3 className="mt-0.5 text-[19px] font-bold group-hover:text-delta">{l.title}</h3>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="text-[15px]">
            <span className="font-bold">{formatBwp(l.priceThebe)}</span>
            <span className="text-ink-2"> {l.pricingUnit === "PER_PERSON" ? "per person" : "per group"}</span>
            {approx && <span className="ml-1 text-[13px] text-ink-3">{approx}</span>}
          </p>
          <Stars value={l.ratingAvg} count={l.ratingCount} />
        </div>
        <p className="text-[14px] text-ink-2">{l.durationLabel}</p>
      </div>
    </Link>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "error"; children: React.ReactNode }) {
  const styles = {
    info: "border-sky bg-sky-soft",
    success: "border-mopane/40 bg-mopane-soft",
    warning: "border-ochre/40 bg-sand-soft",
    error: "border-danger/40 bg-danger-soft",
  }[tone];
  return <div className={`rounded-md border-l-4 px-4 py-3 text-[15px] ${styles}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-mopane-soft text-mopane",
  COMPLETED: "bg-line-2 text-ink-2",
  PENDING_PAYMENT: "bg-sand-soft text-ochre",
  AWAITING_MANUAL_PAYMENT: "bg-sand-soft text-ochre",
  CANCELLED: "bg-danger-soft text-danger",
  EXPIRED: "bg-line-2 text-ink-3",
  PUBLISHED: "bg-mopane-soft text-mopane",
  APPROVED: "bg-mopane-soft text-mopane",
  PENDING: "bg-sand-soft text-ochre",
  PENDING_REVIEW: "bg-sand-soft text-ochre",
  DRAFT: "bg-line-2 text-ink-2",
  PAUSED: "bg-line-2 text-ink-2",
  REJECTED: "bg-danger-soft text-danger",
  SUSPENDED: "bg-danger-soft text-danger",
  DUE: "bg-sand-soft text-ochre",
  PROCESSED: "bg-mopane-soft text-mopane",
  PAID: "bg-mopane-soft text-mopane",
  SUCCEEDED: "bg-mopane-soft text-mopane",
  FAILED: "bg-danger-soft text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting card payment",
  AWAITING_MANUAL_PAYMENT: "Awaiting payment",
  PENDING_REVIEW: "In review",
  PENDING: "Pending",
  DUE: "Refund due",
  PROCESSED: "Refunded",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return <span className={`badge ${STATUS_STYLES[status] ?? "bg-line-2 text-ink-2"}`}>{label}</span>;
}

export function PageHeader({ title, intro, children }: { title: string; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-extrabold sm:text-[40px]">{title}</h1>
        {intro && <p className="mt-2 max-w-[60ch] text-[17px] text-ink-2">{intro}</p>}
      </div>
      {children}
    </div>
  );
}
