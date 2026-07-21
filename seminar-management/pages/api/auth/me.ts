import type { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "../../../lib/session";

/**
 * GET /api/auth/me
 * 200 -> { user } for the current session | 401 if not logged in.
 * Used by the client to render the signed-in user in the header.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.status(200).json({ user: session.user });
}
