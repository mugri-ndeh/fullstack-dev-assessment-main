import type { SessionOptions } from "iron-session";

// Shape of the data stored (encrypted) inside the session cookie.
// `id` references the User row, so a session points at a record rather than
// at a name that could be reassigned.
export interface SessionData {
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
}

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "SESSION_SECRET is missing or shorter than 32 characters. " +
      "Set it in .env (generate one with: openssl rand -base64 32)."
  );
}

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "seminar_session",
  ttl: 60 * 60 * 8, // 8h — re-login daily; iron-session refreshes on activity
  cookieOptions: {
    httpOnly: true, // not readable from JS -> XSS can't steal the session
    sameSite: "lax", // cookie not sent on cross-site POSTs -> CSRF mitigation
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};
