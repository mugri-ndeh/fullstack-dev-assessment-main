import bcrypt from "bcryptjs";
import { findUserByUsername } from "../services/userService";

// Not a credential: a throwaway bcrypt hash of a random string, compared
// against when the username doesn't exist so that an unknown user costs the
// same ~100ms as a wrong password. Nothing can match it — the plaintext was
// never recorded.
const DECOY_HASH =
  "$2b$10$5vMnUDxgW/5y3ex6RELSae/MjwslkSQyTlXLsOLOZWSVPFVH3Bw0i";

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
}

/**
 * Verify credentials against the User table.
 *
 * Always runs bcrypt.compare — even for unknown usernames — so response
 * timing doesn't reveal whether an account exists.
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const user = await findUserByUsername(username);

  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DECOY_HASH
  );

  if (!user || !passwordMatches) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}
