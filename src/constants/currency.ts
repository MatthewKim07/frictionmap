/** Supported display currencies for cost estimates (no FX conversion — display only). */

export const APP_CURRENCIES = ["CAD", "USD", "EUR", "GBP"] as const;
export type AppCurrencyCode = (typeof APP_CURRENCIES)[number];

export const DEFAULT_APP_CURRENCY: AppCurrencyCode = "USD";

export function sanitizeCurrencyCode(raw: unknown): AppCurrencyCode {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return (APP_CURRENCIES as readonly string[]).includes(s) ? (s as AppCurrencyCode) : DEFAULT_APP_CURRENCY;
}
