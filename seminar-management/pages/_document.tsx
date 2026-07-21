import { Html, Head, Main, NextScript, type DocumentProps } from "next/document";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export default function Document(props: DocumentProps) {
  // Reflect the active locale in <html lang>. Without this every page claims
  // lang="en", which misleads screen readers and search engines on /fr.
  const locale = props.__NEXT_DATA__.locale ?? DEFAULT_LOCALE;

  // suppressHydrationWarning: next-themes sets class/style on <html> before
  // React hydrates, so server and client markup differ here by design.
  return (
    <Html lang={locale} suppressHydrationWarning>
      <Head />
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
