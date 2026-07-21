import type { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { z } from "zod";
import { sessionOptions, type SessionData } from "../../../lib/session";
import { verifyCredentials } from "../../../lib/auth";
import { rateLimit } from "../../../lib/rateLimit";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(200),
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 * 200 -> { user } and sets the encrypted session cookie
 * 400 invalid body | 401 bad credentials | 429 rate limited
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
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
      .json({ error: "Too many login attempts. Try again later." });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parsed.error.issues.map((i) => i.message),
    });
  }

  const user = await verifyCredentials(
    parsed.data.username,
    parsed.data.password
  );
  if (!user) {
    // Deliberately vague: don't reveal whether the username or password failed.
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();

  return res.status(200).json({ user });
}
