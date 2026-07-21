import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "./lib/session";

// Paths reachable without a session. With i18n routing enabled, Next strips the
// locale prefix before middleware runs — `/fr/login` arrives here as `/login`
// with the locale on `nextUrl.locale` — so these stay prefix-free.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

/**
 * Redirect helper that preserves the active locale. Cloning `nextUrl` keeps
 * its `locale`, so Next re-applies the prefix on the way out; building a fresh
 * URL instead would silently send a French visitor to the English page.
 */
function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

/**
 * Central auth guard. Runs on every matched request (pages + API):
 * - unauthenticated page request  -> redirect to /login (locale preserved)
 * - unauthenticated API request   -> 401 JSON (no redirect — callers are fetch)
 * - authenticated visit to /login -> redirect to dashboard (locale preserved)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  const isLoggedIn = Boolean(session.user);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    if (isLoggedIn && pathname === "/login") {
      return redirectTo(req, "/");
    }
    return res;
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return redirectTo(req, "/login");
  }

  return res;
}

export const config = {
  // Everything except Next.js internals and static assets.
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|fonts).*)"],
};
