import type { NextApiRequest } from "next";
import en from "../messages/en.json";
import fr from "../messages/fr.json";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";

export type Messages = typeof en;

// Statically imported rather than dynamically resolved: with two locales the
// cost is trivial, and it keeps the catalogues type-checked (fr.json must
// structurally match en.json or this file fails to compile).
const CATALOGUES: Record<Locale, Messages> = { en, fr };

/** Messages for a locale, falling back to the default for anything unknown. */
export function getMessages(locale?: string): Messages {
  return CATALOGUES[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/**
 * Resolve the locale for an API request.
 *
 * Next does not locale-prefix /api/* routes, so `req` carries no locale of its
 * own. Precedence:
 *   1. NEXT_LOCALE cookie — set by Next when the user picks a locale, so it
 *      represents an explicit choice and outranks the browser's preference.
 *   2. Accept-Language header — the browser's preference, best-effort.
 *   3. DEFAULT_LOCALE.
 */
export function resolveRequestLocale(req: NextApiRequest): Locale {
  const cookieLocale = req.cookies.NEXT_LOCALE;
  if (isLocale(cookieLocale)) return cookieLocale;

  const header = req.headers["accept-language"];
  if (typeof header === "string") {
    // "fr-CH,fr;q=0.9,en;q=0.8" -> ordered base tags, highest q first.
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const q = params
          .map((p) => p.trim())
          .find((p) => p.startsWith("q="))
          ?.slice(2);
        return { tag: tag.split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
      })
      .filter((entry) => Number.isFinite(entry.q))
      .sort((a, b) => b.q - a.q);

    const match = ranked.find((entry) => isLocale(entry.tag));
    if (match) return match.tag as Locale;
  }

  return DEFAULT_LOCALE;
}
