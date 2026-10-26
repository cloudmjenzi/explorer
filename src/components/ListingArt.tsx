import type { Category } from "@/db/schema";

/**
 * Illustrated stand-in shown until an operator uploads real photos.
 * Each category gets a simple landscape so browse pages never show broken images.
 */
export function ListingArt({ category, className }: { category: Category; className?: string }) {
  const sky = "#cfe3f3";
  const sand = "#ead9b6";
  const ink = "#0e2a33";
  const water = "#75aadb";
  const scene: Record<string, React.ReactNode> = {
    MOKORO: (
      <>
        <rect y="70" width="160" height="50" fill={water} />
        <path d="M40 92 Q80 100 120 92 L116 96 Q80 104 44 96Z" fill={ink} />
        <line x1="96" y1="58" x2="104" y2="96" stroke={ink} strokeWidth="2" />
        <circle cx="96" cy="78" r="3" fill={ink} />
        <path d="M96 81 L96 93" stroke={ink} strokeWidth="3" />
        {[10, 18, 26, 134, 142, 150].map((x) => (
          <path key={x} d={`M${x} 72 L${x - 3} 52 M${x} 72 L${x + 4} 54`} stroke="#3f6b3a" strokeWidth="1.5" />
        ))}
      </>
    ),
    BOAT_CRUISE: (
      <>
        <rect y="72" width="160" height="48" fill={water} />
        <rect x="52" y="66" width="56" height="10" rx="2" fill={ink} />
        <rect x="60" y="56" width="40" height="10" fill="#fff" stroke={ink} strokeWidth="2" />
        <ellipse cx="128" cy="70" rx="14" ry="9" fill="#6b6b6b" />
        <path d="M118 70 q-6 8 -2 14" stroke="#6b6b6b" strokeWidth="4" fill="none" />
      </>
    ),
    SCENIC_FLIGHT: (
      <>
        <path d="M0 96 Q40 84 80 92 T160 88 V120 H0Z" fill={water} opacity="0.8" />
        <path d="M0 104 Q50 96 90 104 T160 100 V120 H0Z" fill="#3f6b3a" opacity="0.6" />
        <path d="M60 40 L110 40 L118 36 L120 42 L110 46 L60 46Z" fill={ink} />
        <path d="M80 30 L92 43 L80 56 L76 56 L82 43 L72 30Z" fill={ink} />
      </>
    ),
    CULTURAL: (
      <>
        <rect y="84" width="160" height="36" fill={sand} />
        <path d="M40 84 L40 64 L70 64 L70 84Z" fill="#c9a26b" />
        <path d="M34 66 L55 46 L76 66Z" fill="#8a6a3a" />
        <path d="M95 84 L95 70 L120 70 L120 84Z" fill="#c9a26b" />
        <path d="M90 72 L107.5 56 L125 72Z" fill="#8a6a3a" />
      </>
    ),
    FISHING: (
      <>
        <rect y="74" width="160" height="46" fill={water} />
        <path d="M30 74 L30 40" stroke={ink} strokeWidth="2" />
        <path d="M30 40 Q90 34 110 90" stroke={ink} strokeWidth="1" fill="none" />
        <path d="M100 98 q10 -8 20 0 q-10 8 -20 0Z M120 98 l6 -5 v10Z" fill="#c38a2e" />
      </>
    ),
    STAY: (
      <>
        <rect y="88" width="160" height="32" fill={sand} />
        <path d="M44 88 L80 56 L116 88Z" fill="#f6efe0" stroke={ink} strokeWidth="2" />
        <path d="M74 88 L80 70 L86 88Z" fill={ink} />
      </>
    ),
    TRANSFER: (
      <>
        <rect y="90" width="160" height="30" fill={sand} />
        <rect x="46" y="66" width="70" height="22" rx="4" fill="#3f6b3a" />
        <rect x="56" y="58" width="44" height="12" rx="2" fill="#3f6b3a" />
        <circle cx="62" cy="90" r="7" fill={ink} />
        <circle cx="102" cy="90" r="7" fill={ink} />
      </>
    ),
  };
  const savanna = (
    <>
      <rect y="86" width="160" height="34" fill={sand} />
      <path d="M112 86 L114 60" stroke={ink} strokeWidth="3" />
      <ellipse cx="114" cy="58" rx="24" ry="6" fill="#3f6b3a" />
      <path d="M30 86 q2 -16 10 -18 l0 -12 q2 -2 4 0 l0 14 q8 2 8 16Z" fill="#7a6a55" />
      {category === "HORSEBACK" && <path d="M66 86 l2 -12 h16 l4 -8 l4 3 l-2 6 v11 h-3 v-8 h-14 l-2 8Z" fill={ink} />}
      {category === "WALKING_SAFARI" && (
        <>
          <circle cx="72" cy="66" r="3" fill={ink} />
          <path d="M72 69 v10 l-3 7 M72 79 l3 7 M72 72 l6 -4" stroke={ink} strokeWidth="2.5" />
          <circle cx="84" cy="67" r="3" fill={ink} />
          <path d="M84 70 v10 l-3 6 M84 80 l3 6" stroke={ink} strokeWidth="2.5" />
        </>
      )}
      {(category === "GAME_DRIVE" || category === "MULTI_DAY") && (
        <>
          <rect x="58" y="70" width="40" height="12" rx="2" fill="#3f6b3a" />
          <rect x="62" y="63" width="30" height="8" fill="none" stroke="#3f6b3a" strokeWidth="2" />
          <circle cx="66" cy="84" r="4.5" fill={ink} />
          <circle cx="90" cy="84" r="4.5" fill={ink} />
        </>
      )}
    </>
  );
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="120" fill={sky} />
      <circle cx="132" cy="28" r="11" fill="#f2c46d" />
      {scene[category] ?? savanna}
    </svg>
  );
}
