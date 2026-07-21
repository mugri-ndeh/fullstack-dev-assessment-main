/**
 * Locale constants. Deliberately free of message imports so the Edge
 * middleware can import this without pulling the JSON catalogues into its
 * bundle. Message loading lives in lib/messages.ts (Node runtime only).
 *
 * Keep in sync with the `i18n` block in next.config.mjs — Next reads that
 * config directly and cannot import from here.
 */
export const LOCALES = ["en", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}
