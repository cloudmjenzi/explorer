import { describe, expect, it } from "vitest";
import { commissionFor, dueNowFor, effectiveDepositPercent, formatBwp, providerPayoutFor, toChargeMinor, totalFor, unitsFor } from "../src/lib/money";
import { refundFor } from "../src/lib/refunds";
import { addDays, hoursUntil, isIsoDate, startInstant, todayInBotswana } from "../src/lib/dates";

describe("pricing", () => {
  it("per person multiplies by guests", () => {
    expect(totalFor({ priceThebe: 95000, pricingUnit: "PER_PERSON", guests: 3, maxGroupSize: 6 })).toBe(285000);
  });
  it("per group charges per vehicle needed", () => {
    expect(unitsFor({ pricingUnit: "PER_GROUP", guests: 5, maxGroupSize: 5 })).toBe(1);
    expect(unitsFor({ pricingUnit: "PER_GROUP", guests: 6, maxGroupSize: 5 })).toBe(2);
    expect(totalFor({ priceThebe: 780000, pricingUnit: "PER_GROUP", guests: 6, maxGroupSize: 5 })).toBe(1560000);
  });
  it("commission is basis points, rounded to thebe", () => {
    expect(commissionFor(190000, 1500)).toBe(28500);
    expect(commissionFor(333, 1500)).toBe(50);
  });
  it("formats pula", () => {
    expect(formatBwp(136000)).toBe("P1,360");
    expect(formatBwp(9950)).toBe("P99.50");
  });
});

describe("deposits", () => {
  it("deposit can never be below the commission", () => {
    expect(effectiveDepositPercent(10, 1500)).toBe(15);
    expect(effectiveDepositPercent(30, 1500)).toBe(30);
    expect(effectiveDepositPercent(0, 1500)).toBe(0);
  });
  it("due now is the deposit when chosen, otherwise the total", () => {
    expect(dueNowFor(190000, true, 30, 1500)).toBe(57000);
    expect(dueNowFor(190000, false, 30, 1500)).toBe(190000);
    expect(dueNowFor(190000, true, 0, 1500)).toBe(190000);
  });
  it("operator payout is what was paid, less refunds and commission", () => {
    expect(providerPayoutFor(190000, 28500)).toBe(161500);
    expect(providerPayoutFor(57000, 28500)).toBe(28500);
    expect(providerPayoutFor(190000, 0, 190000)).toBe(0);
  });
  it("converts to charge currency minor units", () => {
    expect(toChargeMinor(100000, "BWP", { BWP: 1 })).toBe(100000);
    expect(toChargeMinor(100000, "USD", { USD: 0.073 })).toBe(7300);
    expect(() => toChargeMinor(100, "JPY", {})).toThrow();
  });
});

describe("refunds", () => {
  const now = new Date("2026-10-26T08:00:00Z"); // 10:00 in Gaborone
  const base = { paidThebe: 100000, startTime: "10:00", now };
  it("flexible: full refund at 24h+, none after", () => {
    expect(refundFor({ ...base, policy: "FLEXIBLE", date: "2026-10-27", cancelledBy: "tourist" }).percent).toBe(100);
    expect(refundFor({ ...base, policy: "FLEXIBLE", date: "2026-10-26", startTime: "20:00", cancelledBy: "tourist" }).percent).toBe(0);
  });
  it("moderate: 50% between 7 days and 48h", () => {
    expect(refundFor({ ...base, policy: "MODERATE", date: "2026-11-03", cancelledBy: "tourist" }).percent).toBe(100);
    expect(refundFor({ ...base, policy: "MODERATE", date: "2026-10-30", cancelledBy: "tourist" }).refundThebe).toBe(50000);
    expect(refundFor({ ...base, policy: "MODERATE", date: "2026-10-27", cancelledBy: "tourist" }).percent).toBe(0);
  });
  it("strict: 50% between 30 and 14 days", () => {
    expect(refundFor({ ...base, policy: "STRICT", date: "2026-11-15", cancelledBy: "tourist" }).percent).toBe(50);
    expect(refundFor({ ...base, policy: "STRICT", date: "2026-11-05", cancelledBy: "tourist" }).percent).toBe(0);
  });
  it("operator or admin cancellation always refunds in full", () => {
    expect(refundFor({ ...base, policy: "STRICT", date: "2026-10-26", cancelledBy: "operator" }).percent).toBe(100);
  });
});

describe("Botswana time", () => {
  it("today rolls over at midnight Gaborone time, not UTC", () => {
    expect(todayInBotswana(new Date("2026-10-26T21:59:00Z"))).toBe("2026-10-26");
    expect(todayInBotswana(new Date("2026-10-26T22:01:00Z"))).toBe("2026-10-27");
  });
  it("start instant is UTC+2", () => {
    expect(startInstant("2026-10-27", "06:00").toISOString()).toBe("2026-10-27T04:00:00.000Z");
    expect(hoursUntil("2026-10-27", "06:00", new Date("2026-10-26T04:00:00Z"))).toBe(24);
  });
  it("validates and adds dates", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
