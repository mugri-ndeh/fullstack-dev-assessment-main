import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Look up a login account by username.
 *
 * Returns the full row including `passwordHash` — the only consumer is
 * `lib/auth.ts`, which compares the hash and then discards it. Nothing here
 * is ever serialised into an API response.
 */
export async function findUserByUsername(
  username: string
): Promise<User | null> {
  return prisma.user.findUnique({ where: { username } });
}
