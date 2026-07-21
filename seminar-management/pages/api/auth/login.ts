import type { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { z } from "zod";
import { createTranslator } from "next-intl";
import { sessionOptions, type SessionData } from "../../../lib/session";
import { verifyCredentials } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rateLimit";
import { getMessages, resolveRequestLocale } from "../../../lib/messages";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(200),
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 * 200 -> { user } and sets the encrypted session cookie
 * 400 invalid body | 401 bad credentials | 429 rate limited
 *
 * Responses are localized. Every error carries BOTH:
 *   - `code`:  stable machine-readable identifier — never translated, safe to
 *              branch on in clients and tests
 *   - `error`: human-readable text in the caller's locale
 * Localizing `error` alone would have made the response contract
 * locale-dependent and quietly broken anything matching on the message.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // /api/* routes are not locale-prefixed by Next, so the locale is resolved
  // from the NEXT_LOCALE cookie, then Accept-Language, then the default.
  const locale = resolveRequestLocale(req);
  const t = createTranslator({
    locale,
    messages: getMessages(locale),
    namespace: "Api.auth",
  });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ code: "METHOD_NOT_ALLOWED", error: t("methodNotAllowed") });
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60_000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res
      .status(429)
      .json({ code: "RATE_LIMITED", error: t("rateLimited") });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: "INVALID_REQUEST",
      error: t("invalidRequest"),
      details: parsed.error.issues.map((i) => i.message),
    });
  }

  const user = await verifyCredentials(
    parsed.data.username,
    parsed.data.password
  );
  if (!user) {
    // Deliberately vague: don't reveal whether the username or password failed.
    return res
      .status(401)
      .json({ code: "INVALID_CREDENTIALS", error: t("invalidCredentials") });
  }

  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();

  return res.status(200).json({ user });
}
