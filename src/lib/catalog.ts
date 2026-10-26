import type { CancellationPolicy, Category, PaymentMethod } from "@/db/schema";

export const CATEGORIES: { value: Category; label: string; plural: string }[] = [
  { value: "GAME_DRIVE", label: "Game drive", plural: "Game drives" },
  { value: "MOKORO", label: "Mokoro trip", plural: "Mokoro trips" },
  { value: "BOAT_CRUISE", label: "Boat cruise", plural: "Boat cruises" },
  { value: "SCENIC_FLIGHT", label: "Scenic flight", plural: "Scenic flights" },
  { value: "WALKING_SAFARI", label: "Walking safari", plural: "Walking safaris" },
  { value: "HORSEBACK", label: "Horseback safari", plural: "Horseback safaris" },
  { value: "FISHING", label: "Fishing trip", plural: "Fishing trips" },
  { value: "CULTURAL", label: "Cultural experience", plural: "Cultural experiences" },
  { value: "MULTI_DAY", label: "Multi-day safari", plural: "Multi-day safaris" },
  { value: "TRANSFER", label: "Transfer", plural: "Transfers" },
  { value: "STAY", label: "Stay", plural: "Stays" },
];

export function categoryLabel(c: Category): string {
  return CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

export const CANCELLATION: Record<CancellationPolicy, { label: string; summary: string; fullRefundHours: number; halfRefundHours: number }> = {
  FLEXIBLE: {
    label: "Flexible",
    summary: "Full refund if you cancel at least 24 hours before the start time.",
    fullRefundHours: 24,
    halfRefundHours: 0,
  },
  MODERATE: {
    label: "Moderate",
    summary: "Full refund up to 7 days before. 50% refund between 7 days and 48 hours before. No refund after that.",
    fullRefundHours: 7 * 24,
    halfRefundHours: 48,
  },
  STRICT: {
    label: "Strict",
    summary: "Full refund up to 30 days before. 50% refund between 30 and 14 days before. No refund after that.",
    fullRefundHours: 30 * 24,
    halfRefundHours: 14 * 24,
  },
};

export const PAYMENT_METHODS: Record<PaymentMethod, { label: string; short: string }> = {
  CARD: { label: "Card (Visa, Mastercard)", short: "Card" },
  ORANGE_MONEY: { label: "Orange Money", short: "Orange Money" },
  MYZAKA: { label: "Mascom MyZaka", short: "MyZaka" },
  SMEGA: { label: "BTC Smega", short: "Smega" },
  BANK_TRANSFER: { label: "Bank transfer (EFT)", short: "EFT" },
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const COUNTRIES = [
  "Botswana", "South Africa", "Namibia", "Zimbabwe", "Zambia", "United States", "United Kingdom", "Germany",
  "France", "Netherlands", "Italy", "Spain", "Switzerland", "Australia", "Canada", "China", "India", "Japan",
  "Kenya", "Nigeria", "Other",
];
