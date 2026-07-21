import bcrypt from "bcryptjs";

// Hardcoded credentials are explicitly allowed for this assessment, but the
// password is still stored as a bcrypt hash, not plaintext. The hash lives in
// code rather than .env because Next.js expands `$VAR` inside .env files,
// which silently corrupts bcrypt hashes (`$2b$10$...`). ADMIN_PASSWORD_HASH
// still overrides it for deployments that manage env safely.
//
// Demo login: admin / admin123
const DEMO_USER = {
  username: "admin",
  displayName: "Admin",
  // bcrypt("admin123", cost 10)
  passwordHash: "$2b$10$nvcnFH5zNvNI9QVry/H5Tu4f.M3pxvCBMOM0VjH/UYqdE81W6HRDC",
};

export interface AuthenticatedUser {
  username: string;
  displayName: string;
}

/**
 * Verify credentials. Always runs bcrypt.compare — even for unknown
 * usernames — so response timing doesn't reveal whether a username exists.
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const hash = process.env.ADMIN_PASSWORD_HASH || DEMO_USER.passwordHash;
  const isKnownUser = username === DEMO_USER.username;

  const passwordMatches = await bcrypt.compare(password, hash);

  if (isKnownUser && passwordMatches) {
    return { username: DEMO_USER.username, displayName: DEMO_USER.displayName };
  }
  return null;
}
