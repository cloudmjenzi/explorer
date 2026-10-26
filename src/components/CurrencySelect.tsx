"use client";

export function CurrencySelect({ current, options }: { current: string; options: string[] }) {
  return (
    <select
      id="currency"
      name="currency"
      defaultValue={current}
      className="input w-auto py-1.5 text-[14px]"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((c) => (
        <option key={c} value={c}>
          {c === "BWP" ? "Pula only" : c}
        </option>
      ))}
    </select>
  );
}
