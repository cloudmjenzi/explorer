import Link from "next/link";

/**
 * Stylised map of Botswana with the tourism regions as links.
 * Projection is a simple equirectangular fit, accurate enough for orientation.
 */
const K = 58;
const LON0 = 19.6;
const LAT0 = -17.3;
const px = (lon: number) => (lon - LON0) * K;
const py = (lat: number) => (LAT0 - lat) * K;
const pts = (coords: [number, number][]) => coords.map(([lon, lat]) => `${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join(" ");

const BORDER: [number, number][] = [
  [25.26, -17.79], [25.15, -17.8], [24.72, -17.92], [24.0, -18.0], [23.3, -18.0], [21.8, -18.25], [21.0, -18.32],
  [21.0, -22.0], [20.0, -22.0], [20.0, -24.75], [20.45, -25.5], [20.8, -26.4], [20.85, -26.85], [22.0, -26.6],
  [22.6, -26.0], [23.2, -25.6], [24.0, -25.5], [24.8, -25.8], [25.5, -25.7], [25.75, -25.4], [25.85, -24.8],
  [26.0, -24.65], [26.5, -24.45], [26.9, -24.3], [27.2, -23.7], [27.55, -23.3], [27.95, -22.98], [28.6, -22.55],
  [29.1, -22.2], [29.37, -22.2], [28.5, -21.6], [27.8, -20.6], [27.3, -20.4], [26.2, -19.6], [25.67, -18.53],
  [25.4, -18.0],
];

const DELTA: [number, number][] = [
  [21.95, -18.3], [22.2, -18.5], [22.35, -18.85], [22.1, -19.35], [22.25, -19.8], [22.75, -20.05], [23.35, -19.95],
  [23.7, -19.6], [23.6, -19.2], [23.1, -18.95], [22.55, -18.75], [22.2, -18.35],
];

/** Label placement where the default (right of the dot) would collide. */
const LABELS: Record<string, "left" | "right" | "below" | "above"> = {
  chobe: "left",
  "central-east": "below",
  "tuli-block": "above",
};

export interface MapRegion {
  slug: string;
  name: string;
  lon: number;
  lat: number;
  count?: number;
}

export function BotswanaMap({
  regions,
  active,
  className,
  compact = false,
}: {
  regions: MapRegion[];
  active?: string;
  className?: string;
  compact?: boolean;
}) {
  const w = px(29.7);
  const h = py(-27.1);
  return (
    <svg
      viewBox={`0 0 ${w.toFixed(0)} ${h.toFixed(0)}`}
      className={className}
      role="img"
      aria-label="Map of Botswana showing tourism regions"
    >
      <defs>
        <pattern id="dunes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
          <path d="M0 7 Q3.5 4 7 7 T14 7" fill="none" stroke="#d9c393" strokeWidth="0.9" />
        </pattern>
      </defs>
      <polygon points={pts(BORDER)} fill="var(--color-sand)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      <polygon points={pts(BORDER)} fill="url(#dunes)" opacity="0.55" />
      {/* Okavango Delta */}
      <polygon points={pts(DELTA)} fill="var(--color-sky)" opacity="0.75" />
      <path
        d={`M${px(21.85)},${py(-18.15)} L${px(21.98)},${py(-18.32)}`}
        stroke="var(--color-sky)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Chobe River */}
      <polyline
        points={pts([[23.3, -18.0], [24.0, -18.0], [24.72, -17.92], [25.15, -17.8], [25.26, -17.79]])}
        fill="none"
        stroke="var(--color-sky)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Makgadikgadi: Ntwetwe and Sua pans */}
      <ellipse cx={px(25.2)} cy={py(-20.75)} rx={0.55 * K} ry={0.35 * K} fill="#fbfcfb" stroke="#cbbf9f" strokeWidth="1" transform={`rotate(-12 ${px(25.2)} ${py(-20.75)})`} />
      <ellipse cx={px(26.05)} cy={py(-20.6)} rx={0.32 * K} ry={0.42 * K} fill="#fbfcfb" stroke="#cbbf9f" strokeWidth="1" />

      {regions.map((r) => {
        const x = px(r.lon);
        const y = py(r.lat);
        const isActive = active === r.slug;
        const place = LABELS[r.slug] ?? (r.lon > 27.5 ? "left" : "right");
        const tx = place === "left" ? x - 13 : place === "right" ? x + 13 : x;
        const ty = place === "below" ? y + 26 : place === "above" ? y - 14 : y + 5;
        const anchor = place === "left" ? "end" : place === "right" ? "start" : "middle";
        return (
          <Link key={r.slug} href={`/regions/${r.slug}`} className="group" aria-label={`${r.name}${r.count ? `, ${r.count} experiences` : ""}`}>
            <circle cx={x} cy={y} r={compact ? 14 : 22} fill="transparent" />
            <circle
              cx={x}
              cy={y}
              r={isActive ? 9 : 6.5}
              fill={isActive ? "var(--color-delta)" : "var(--color-paper)"}
              stroke="var(--color-ink)"
              strokeWidth="2.25"
              className="transition-[r] group-hover:fill-[var(--color-delta)] group-focus-visible:fill-[var(--color-delta)]"
            />
            {!compact && (
              <text
                x={tx}
                y={ty}
                textAnchor={anchor}
                fontSize="15"
                fontWeight={isActive ? 700 : 600}
                fill="var(--color-ink)"
                stroke="var(--color-sand)"
                strokeWidth="4"
                paintOrder="stroke"
                className="font-display group-hover:underline"
              >
                {r.name.split(" & ")[0].replace(" Transfrontier", "")}
              </text>
            )}
          </Link>
        );
      })}
    </svg>
  );
}
