import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    // In the Pages Router the provider can't infer the locale from a Server
    // Component, so it is passed explicitly from `router.locale` (populated by
    // the i18n block in next.config.mjs).
    //
    // `messages` comes from each page's getStaticProps/getServerSideProps. The
    // `?? {}` fallback keeps pages that don't yet load messages rendering
    // instead of throwing — useTranslations on such a page reports a missing
    // message rather than taking the app down.
    <NextIntlClientProvider
      locale={router.locale ?? DEFAULT_LOCALE}
      messages={pageProps.messages ?? {}}
      timeZone="Europe/Berlin"
    >
      {/* `class` strategy matches darkMode in tailwind.config. Light and dark
          are the only states — enableSystem={false} keeps the OS preference
          from resolving to a third one the toggle can't represent. */}
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <Component {...pageProps} />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
