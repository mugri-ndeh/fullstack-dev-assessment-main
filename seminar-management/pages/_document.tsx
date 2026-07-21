import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  // suppressHydrationWarning: next-themes sets class/style on <html> before
  // React hydrates, so server and client markup differ here by design.
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head />
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
