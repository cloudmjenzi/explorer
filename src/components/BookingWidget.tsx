"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  listingId: string;
  slug: string;
  priceThebe: number;
  pricingUnit: "PER_PERSON" | "PER_GROUP";
  maxGroupSize: number;
  minGuests: number;
  capacity: number;
  depositPercent: number; // already adjusted to cover commission; 0 = full payment only
  availability: Record<string, number>;
  approxRate: { code: string; rate: number } | null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function money(thebe: number) {
  const p = thebe / 100;
  return "P" + p.toLocaleString("en-BW", { maximumFractionDigits: p % 1 ? 2 : 0, minimumFractionDigits: p % 1 ? 2 : 0 });
}

export function BookingWidget(p: Props) {
  const router = useRouter();
  const dates = Object.keys(p.availability).sort();
  const firstOpen = dates.find((d) => p.availability[d] > 0);
  const [month, setMonth] = useState(() => (firstOpen ?? dates[0]).slice(0, 7));
  const [date, setDate] = useState<string | null>(null);
  const [departures, setDepartures] = useState<{ time: string; remaining: number }[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(Math.max(1, p.minGuests));
  const [deposit, setDeposit] = useState(p.depositPercent > 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    let live = true;
    setLoading(true);
    setTime(null);
    fetch(`/api/listings/${p.listingId}/departures?date=${date}`)
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        const open = (j.departures ?? []).filter((d: { remaining: number }) => d.remaining > 0);
        setDepartures(j.departures ?? []);
        if (open.length === 1) setTime(open[0].time);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [date, p.listingId]);

  const units = p.pricingUnit === "PER_PERSON" ? guests : Math.ceil(guests / Math.max(1, p.maxGroupSize));
  const total = p.priceThebe * units;
  const dueNow = deposit && p.depositPercent > 0 ? Math.round((total * p.depositPercent) / 100) : total;
  const remaining = departures?.find((d) => d.time === time)?.remaining;
  const unitsLeft = remaining ?? p.capacity;
  const maxGuests = p.pricingUnit === "PER_PERSON" ? Math.min(unitsLeft, 30) : Math.min(unitsLeft * p.maxGroupSize, 60);

  const grid = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const cells: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysIn; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [month]);

  const months = Array.from(new Set(dates.map((d) => d.slice(0, 7))));
  const mi = months.indexOf(month);

  function go() {
    if (!date || !time) return;
    const q = new URLSearchParams({ date, time, guests: String(guests), deposit: deposit ? "1" : "0" });
    router.push(`/book/${p.slug}?${q}`);
  }

  return (
    <div className="panel p-5">
      <p className="text-[15px]">
        <span className="font-display text-[28px] font-extrabold">{money(p.priceThebe)}</span>
        <span className="text-ink-2"> {p.pricingUnit === "PER_PERSON" ? "per person" : `per group of up to ${p.maxGroupSize}`}</span>
      </p>
      {p.approxRate && (
        <p className="text-[13px] text-ink-3">
          ≈ {new Intl.NumberFormat("en", { style: "currency", currency: p.approxRate.code, maximumFractionDigits: 0 }).format((p.priceThebe / 100) * p.approxRate.rate)}
        </p>
      )}

      <fieldset className="mt-5">
        <legend className="field-label">1. Choose a date</legend>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className="btn-ghost px-2 py-1" onClick={() => setMonth(months[mi - 1])} disabled={mi <= 0} aria-label="Previous month">‹</button>
          <span className="font-bold">{MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}</span>
          <button type="button" className="btn-ghost px-2 py-1" onClick={() => setMonth(months[mi + 1])} disabled={mi >= months.length - 1} aria-label="Next month">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[13px]">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} className="py-1 text-ink-3" aria-hidden="true">{d}</span>
          ))}
          {grid.map((d, i) => {
            if (!d) return <span key={i} />;
            const open = (p.availability[d] ?? 0) > 0;
            const sel = d === date;
            return (
              <button
                key={d}
                type="button"
                disabled={!open}
                onClick={() => setDate(d)}
                aria-pressed={sel}
                aria-label={`${d}${open ? "" : ", unavailable"}`}
                className={`aspect-square rounded-sm text-[14px] ${
                  sel
                    ? "bg-delta font-bold text-white"
                    : open
                      ? "bg-sky-soft font-bold text-ink hover:bg-sky"
                      : "text-ink-3 line-through decoration-ink-3/40"
                }`}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </fieldset>

      {date && (
        <fieldset className="mt-5">
          <legend className="field-label">2. Choose a start time</legend>
          {loading ? (
            <p className="text-[14px] text-ink-2">Checking times…</p>
          ) : departures && departures.length ? (
            <div className="flex flex-wrap gap-2">
              {departures.map((d) => (
                <button
                  key={d.time}
                  type="button"
                  disabled={d.remaining <= 0}
                  onClick={() => setTime(d.time)}
                  aria-pressed={time === d.time}
                  className={`rounded-md border px-3 py-2 text-[15px] ${
                    time === d.time ? "border-delta bg-delta text-white" : "border-line bg-paper hover:border-delta"
                  } disabled:border-line-2 disabled:text-ink-3`}
                >
                  <span className="font-bold">{d.time}</span>
                  <span className="ml-1.5 text-[13px] opacity-80">
                    {d.remaining <= 0 ? "full" : d.remaining <= 3 ? `${d.remaining} left` : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-ink-2">No departures left on this date. Pick another day.</p>
          )}
        </fieldset>
      )}

      <div className="mt-5">
        <label htmlFor="guests" className="field-label">3. Guests</label>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setGuests((g) => Math.max(p.minGuests, g - 1))} aria-label="Fewer guests">−</button>
          <input
            id="guests"
            type="number"
            min={p.minGuests}
            max={maxGuests}
            value={guests}
            onChange={(e) => setGuests(Math.max(p.minGuests, Math.min(maxGuests, Number(e.target.value) || p.minGuests)))}
            className="input w-20 text-center"
          />
          <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} aria-label="More guests">+</button>
        </div>
        {p.minGuests > 1 && <span className="field-hint">Minimum {p.minGuests} guests.</span>}
      </div>

      {p.depositPercent > 0 && (
        <fieldset className="mt-5 space-y-2 text-[15px]">
          <legend className="field-label">How to pay</legend>
          <label className="flex gap-2">
            <input type="radio" name="dep" checked={deposit} onChange={() => setDeposit(true)} />
            <span>Pay a {p.depositPercent}% deposit now, the rest to your guide on the day</span>
          </label>
          <label className="flex gap-2">
            <input type="radio" name="dep" checked={!deposit} onChange={() => setDeposit(false)} />
            <span>Pay everything now</span>
          </label>
        </fieldset>
      )}

      <dl className="mt-5 space-y-1 border-t border-line pt-4 text-[15px]">
        <div className="flex justify-between">
          <dt>{p.pricingUnit === "PER_PERSON" ? `${money(p.priceThebe)} × ${guests}` : `${units} group${units > 1 ? "s" : ""}`}</dt>
          <dd className="font-bold">{money(total)}</dd>
        </div>
        {dueNow < total && (
          <div className="flex justify-between text-ink-2">
            <dt>Due now</dt>
            <dd>{money(dueNow)}</dd>
          </div>
        )}
      </dl>
      <button type="button" className="btn-primary mt-4 w-full py-3" disabled={!date || !time || guests > maxGuests} onClick={go}>
        {!date ? "Choose a date" : !time ? "Choose a time" : "Continue to booking"}
      </button>
      <p className="mt-2 text-center text-[13px] text-ink-2">You won't be charged until the next step.</p>
    </div>
  );
}
