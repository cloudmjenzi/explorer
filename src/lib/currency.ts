import "server-only";
import { cookies } from "next/headers";
import { DISPLAY_CURRENCIES, formatBwp, formatIn, type DisplayCurrency } from "./money";
import { config } from "./config";

export async function displayCurrency(): Promise<DisplayCurrency> {
  const c = (await cookies()).get("bw_cur")?.value as DisplayCurrency | undefined;
  return c && DISPLAY_CURRENCIES.includes(c) ? c : "BWP";
}

/** Price in pula, plus an approximate conversion when the visitor picked another currency. */
export async function priceText(thebe: number): Promise<{ main: string; approx: string | null }> {
  const cur = await displayCurrency();
  return { main: formatBwp(thebe), approx: cur === "BWP" ? null : `≈ ${formatIn(thebe, cur, config.rates)}` };
}
