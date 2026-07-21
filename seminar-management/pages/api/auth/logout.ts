import type { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "../../../lib/session";

/**
 * POST /api/auth/logout
 * Destroys the session cookie. POST (not GET) so it can't be triggered by a
 * cross-site image/link — pairs with the SameSite=Lax cookie.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.destroy();
  return res.status(200).json({ ok: true });
}
