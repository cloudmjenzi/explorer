import "server-only";

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function rates(): Record<string, number> {
  // Display rates: units of foreign currency per 1 BWP.
  const defaults = { BWP: 1, USD: 0.073, EUR: 0.067, GBP: 0.057, ZAR: 1.33 };
  try {
    const parsed = process.env.DISPLAY_RATES ? JSON.parse(process.env.DISPLAY_RATES) : {};
    return { ...defaults, ...parsed, BWP: 1 };
  } catch {
    return defaults;
  }
}

export const config = {
  appName: process.env.APP_NAME ?? "Explorer Botswana",
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supportEmail: process.env.SUPPORT_EMAIL ?? "hello@explorer.co.bw",
  supportPhone: process.env.SUPPORT_PHONE ?? "",
  supportWhatsapp: process.env.SUPPORT_WHATSAPP ?? "",
  companyLegalName: process.env.COMPANY_LEGAL_NAME ?? "Explorer Botswana (Pty) Ltd",
  defaultCommissionBps: num("DEFAULT_COMMISSION_BPS", 1500),
  rates: rates(),
  /** Card gateway: "dpo" (DPO Pay, Botswana-ready), "stripe" (needs a Stripe-supported entity) or "none". */
  cardGateway: (process.env.CARD_GATEWAY ?? "none") as "dpo" | "stripe" | "none",
  chargeCurrency: (process.env.CHARGE_CURRENCY ?? "BWP").toUpperCase(),
  dpo: {
    companyToken: process.env.DPO_COMPANY_TOKEN ?? "",
    serviceType: process.env.DPO_SERVICE_TYPE ?? "",
    apiUrl: process.env.DPO_API_URL ?? "https://secure.3gdirectpay.com/API/v6/",
    payUrl: process.env.DPO_PAY_URL ?? "https://secure.3gdirectpay.com/payv2.php?ID=",
    ptlHours: num("DPO_PTL_HOURS", 1),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },
  /** Manual mobile money / EFT collection details shown to tourists. Leave blank to hide a method. */
  manual: {
    ORANGE_MONEY: process.env.PAY_ORANGE_MONEY ?? "",
    MYZAKA: process.env.PAY_MYZAKA ?? "",
    SMEGA: process.env.PAY_SMEGA ?? "",
    BANK_TRANSFER: process.env.PAY_BANK_TRANSFER ?? "",
  } as Record<string, string>,
  holdMinutesCard: num("HOLD_MINUTES_CARD", 30),
  holdHoursManual: num("HOLD_HOURS_MANUAL", 24),
  cronSecret: process.env.CRON_SECRET ?? "",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  smtp: {
    url: process.env.SMTP_URL ?? "",
    from: process.env.MAIL_FROM ?? "Explorer Botswana <bookings@explorer.co.bw>",
  },
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL ?? "",
  timezone: "Africa/Gaborone",
};
