"use client";

import { useActionState, useState } from "react";
import { saveListingAction } from "@/app/actions/provider";
import { FormError, SubmitButton } from "./forms";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ListingDefaults {
  id?: string;
  title?: string;
  category?: string;
  regionId?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  included?: string[];
  excluded?: string[];
  meetingPoint?: string;
  durationLabel?: string;
  price?: number;
  pricingUnit?: string;
  capacity?: number;
  minGuests?: number;
  maxGroupSize?: number;
  startTimes?: string[];
  operatingDays?: number[];
  leadTimeHours?: number;
  cancellationPolicy?: string;
  depositPercent?: number;
}

export function ListingForm({
  defaults = {},
  regions,
  categories,
  commissionPct,
}: {
  defaults?: ListingDefaults;
  regions: { id: string; name: string }[];
  categories: { value: string; label: string }[];
  commissionPct: number;
}) {
  const [state, action] = useActionState(saveListingAction, undefined);
  const [unit, setUnit] = useState(defaults.pricingUnit ?? "PER_PERSON");
  const [deposit, setDeposit] = useState(defaults.depositPercent ?? 0);
  const [price, setPrice] = useState<number>(defaults.price ?? 0);
  const days = defaults.operatingDays ?? [0, 1, 2, 3, 4, 5, 6];
  const net = price * (1 - commissionPct / 100);

  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">The basics</legend>
        <div>
          <label className="field-label" htmlFor="title">Title</label>
          <input className="input" id="title" name="title" required maxLength={90} defaultValue={defaults.title} placeholder="Sunrise mokoro trip from Boro village" />
          <span className="field-hint">Say what it is and where. Travellers scan titles.</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="category">Type</label>
            <select className="input" id="category" name="category" defaultValue={defaults.category ?? "GAME_DRIVE"}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="regionId">Region</label>
            <select className="input" id="regionId" name="regionId" required defaultValue={defaults.regionId ?? ""}>
              <option value="">Choose…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="durationLabel">Duration</label>
            <input className="input" id="durationLabel" name="durationLabel" required defaultValue={defaults.durationLabel} placeholder="3 hours" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="summary">Summary</label>
          <textarea className="input min-h-20" id="summary" name="summary" required maxLength={300} defaultValue={defaults.summary} />
          <span className="field-hint">Two sentences shown at the top of the page. Up to 300 characters.</span>
        </div>
        <div>
          <label className="field-label" htmlFor="description">Full description</label>
          <textarea className="input min-h-48" id="description" name="description" required defaultValue={defaults.description} />
          <span className="field-hint">What happens, in order. What guests will see. What to bring. Leave a blank line between paragraphs.</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="highlights">Highlights</label>
            <textarea className="input min-h-32" id="highlights" name="highlights" defaultValue={defaults.highlights?.join("\n")} />
            <span className="field-hint">One per line.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="included">Included</label>
            <textarea className="input min-h-32" id="included" name="included" defaultValue={defaults.included?.join("\n")} placeholder={"Licensed guide\nPark fees\nWater"} />
            <span className="field-hint">One per line.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="excluded">Not included</label>
            <textarea className="input min-h-32" id="excluded" name="excluded" defaultValue={defaults.excluded?.join("\n")} placeholder={"Gratuities\nLunch"} />
            <span className="field-hint">One per line.</span>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="meetingPoint">Meeting point</label>
          <input className="input" id="meetingPoint" name="meetingPoint" required defaultValue={defaults.meetingPoint} placeholder="Pick-up from your lodge in Maun, or our office on Mathiba I Road" />
        </div>
      </fieldset>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Price and group size</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="price">Price in pula</label>
            <input className="input" id="price" name="price" type="number" min="1" step="0.01" required defaultValue={defaults.price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            {price > 0 && (
              <span className="field-hint">
                You receive about P{net.toLocaleString("en-BW", { maximumFractionDigits: 2 })} after {commissionPct}% commission.
              </span>
            )}
          </div>
          <div>
            <label className="field-label" htmlFor="pricingUnit">Price is</label>
            <select className="input" id="pricingUnit" name="pricingUnit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="PER_PERSON">Per person (shared trip)</option>
              <option value="PER_GROUP">Per group or vehicle (private trip)</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="capacity">{unit === "PER_PERSON" ? "Seats per departure" : "Vehicles or groups per departure"}</label>
            <input className="input" id="capacity" name="capacity" type="number" min="1" required defaultValue={defaults.capacity ?? (unit === "PER_PERSON" ? 8 : 1)} />
          </div>
          <div>
            <label className="field-label" htmlFor="maxGroupSize">Max guests per {unit === "PER_PERSON" ? "booking" : "group"}</label>
            <input className="input" id="maxGroupSize" name="maxGroupSize" type="number" min="1" required defaultValue={defaults.maxGroupSize ?? 6} />
          </div>
          <div>
            <label className="field-label" htmlFor="minGuests">Minimum guests</label>
            <input className="input" id="minGuests" name="minGuests" type="number" min="1" required defaultValue={defaults.minGuests ?? 1} />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">When it runs</legend>
        <div>
          <span className="field-label">Days</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-[15px]">
                <input type="checkbox" name="operatingDays" value={i} defaultChecked={days.includes(i)} />
                {d}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="startTimes">Start times</label>
            <input className="input" id="startTimes" name="startTimes" required defaultValue={defaults.startTimes?.join(", ") ?? "06:30"} placeholder="06:30, 15:00" />
            <span className="field-hint">24-hour times, separated by commas.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="leadTimeHours">Book at least … hours ahead</label>
            <input className="input" id="leadTimeHours" name="leadTimeHours" type="number" min="0" required defaultValue={defaults.leadTimeHours ?? 24} />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Payment and cancellation</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="cancellationPolicy">Cancellation policy</label>
            <select className="input" id="cancellationPolicy" name="cancellationPolicy" defaultValue={defaults.cancellationPolicy ?? "MODERATE"}>
              <option value="FLEXIBLE">Flexible: full refund up to 24h before</option>
              <option value="MODERATE">Moderate: full refund up to 7 days, 50% to 48h</option>
              <option value="STRICT">Strict: full refund up to 30 days, 50% to 14 days</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="depositPercent">Deposit option</label>
            <select className="input" id="depositPercent" name="depositPercent" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))}>
              <option value={0}>Guests pay in full online</option>
              {[20, 25, 30, 40, 50].filter((p) => p >= commissionPct).map((p) => (
                <option key={p} value={p}>Allow a {p}% deposit, balance paid to me on the day</option>
              ))}
            </select>
            {deposit > 0 && <span className="field-hint">You collect the balance from the guest in person. Our commission comes out of the deposit.</span>}
          </div>
        </div>
      </fieldset>

      <fieldset className="panel space-y-3 p-5">
        <legend className="px-1 font-display text-[20px] font-extrabold">Add photos</legend>
        <input className="block text-[15px]" type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/heic" multiple />
        <span className="field-hint">Up to 12 photos, 12 MB each. Landscape works best. Real photos of your trip, not stock images.</span>
      </fieldset>

      <FormError state={state} />
      <SubmitButton pending="Saving and uploading…">{defaults.id ? "Save changes" : "Create listing"}</SubmitButton>
    </form>
  );
}
