import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "./lib/session";

// Paths reachable without a session.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

/**
 * Central auth guard. Runs on every matched request (pages + API):
 * - unauthenticated page request  -> redirect to /login
 * - unauthenticated API request   -> 401 JSON (no redirect — callers are fetch)
 * - authenticated visit to /login -> redirect to dashboard
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  const isLoggedIn = Boolean(session.user);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    if (isLoggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return res;
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  // Everything except Next.js internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts).*)"],
};
