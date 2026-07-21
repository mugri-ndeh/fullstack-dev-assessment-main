import { useRouter } from "next/router";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "../lib/i18n";

const LABELS: Record<Locale, { short: string; full: string }> = {
  en: { short: "EN", full: "English" },
  fr: { short: "FR", full: "Français" },
};

// A year, in seconds. Matches how long Next itself treats NEXT_LOCALE as valid.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Language switch, styled to match ThemeToggle since they sit side by side.
 *
 * Switching does two things:
 *  1. Writes the NEXT_LOCALE cookie. Next reads it to remember the choice, and
 *     API routes read it too (see lib/messages.ts) — /api/* paths are never
 *     locale-prefixed, so the cookie is how the server learns the language.
 *  2. Re-navigates to the same route under the new locale. Pushing
 *     { pathname, query } rather than asPath keeps dynamic segments intact, so
 *     /courses/[id] survives the switch instead of being re-requested as a
 *     literal path.
 */
const LocaleToggle = () => {
  const router = useRouter();
  const active = (router.locale ?? DEFAULT_LOCALE) as Locale;

  const switchTo = (locale: Locale) => {
    if (locale === active) return;
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    router.push({ pathname: router.pathname, query: router.query }, undefined, {
      locale,
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5"
    >
      {LOCALES.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={LABELS[locale].full}
            title={LABELS[locale].full}
            lang={locale}
            onClick={() => switchTo(locale)}
            className={`h-8 w-9 rounded-md text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
              isActive
                ? "bg-white/90 text-slate-900 shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {LABELS[locale].short}
          </button>
        );
      })}
    </div>
  );
};

export default LocaleToggle;
