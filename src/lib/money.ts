/**
 * All prices are stored as integer thebe (1 BWP = 100 thebe).
 * These helpers are pure so they can be unit tested and used on server and client.
 */

export const DISPLAY_CURRENCIES = ["BWP", "USD", "EUR", "GBP", "ZAR"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export function formatBwp(thebe: number, opts: { cents?: boolean } = {}): string {
  const pula = thebe / 100;
  const digits = opts.cents || pula % 1 !== 0 ? 2 : 0;
  return "P" + pula.toLocaleString("en-BW", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatIn(thebe: number, currency: string, rates: Record<string, number>): string {
  if (currency === "BWP") return formatBwp(thebe);
  const rate = rates[currency];
  if (!rate) return formatBwp(thebe);
  const amount = (thebe / 100) * rate;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

export function pulaToThebe(pula: number): number {
  return Math.round(pula * 100);
}

export interface PriceInput {
  priceThebe: number;
  pricingUnit: "PER_PERSON" | "PER_GROUP";
  guests: number;
  maxGroupSize: number;
}

/** Number of capacity units a booking consumes: seats for per-person, vehicles/groups for per-group. */
export function unitsFor(input: Pick<PriceInput, "pricingUnit" | "guests" | "maxGroupSize">): number {
  if (input.pricingUnit === "PER_PERSON") return input.guests;
  return Math.max(1, Math.ceil(input.guests / Math.max(1, input.maxGroupSize)));
}

export function totalFor(input: PriceInput): number {
  return input.priceThebe * unitsFor(input);
}

export function commissionFor(totalThebe: number, bps: number): number {
  return Math.round((totalThebe * bps) / 10_000);
}

/**
 * Deposit rule: the deposit must at least cover the platform commission, so the platform
 * is never owed money by the operator. The balance is paid to the operator on the day.
 */
export function effectiveDepositPercent(depositPercent: number, commissionBps: number): number {
  if (depositPercent <= 0) return 0;
  const floor = Math.ceil(commissionBps / 100);
  return Math.min(100, Math.max(depositPercent, floor));
}

export function dueNowFor(totalThebe: number, payDeposit: boolean, depositPercent: number, commissionBps: number): number {
  const pct = effectiveDepositPercent(depositPercent, commissionBps);
  if (!payDeposit || pct === 0 || pct >= 100) return totalThebe;
  return Math.max(commissionFor(totalThebe, commissionBps), Math.round((totalThebe * pct) / 100));
}

/** What the platform owes the operator once the experience is delivered. */
export function providerPayoutFor(paidThebe: number, commissionThebe: number, refundThebe = 0): number {
  return Math.max(0, paidThebe - refundThebe - commissionThebe);
}

/** Convert a BWP amount into the minor units of a charge currency. */
export function toChargeMinor(thebe: number, currency: string, rates: Record<string, number>): number {
  if (currency === "BWP") return thebe;
  const rate = rates[currency];
  if (!rate) throw new Error(`No exchange rate configured for ${currency}`);
  return Math.round(thebe * rate);
}
