/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js built-in i18n routing — Pages Router only (the App Router has no
  // equivalent), which matches this project. It provides `router.locale`,
  // locale-prefixed URLs (/fr/courses), the NEXT_LOCALE cookie, and a `locale`
  // field on the getStaticProps / getServerSideProps context.
  //
  // Note: /api/* routes are NOT locale-prefixed by Next, so API handlers resolve
  // the locale from the request themselves — see lib/messages.ts.
  i18n: {
    locales: ["en", "fr"],
    defaultLocale: "en",
  },
};

export default nextConfig;
