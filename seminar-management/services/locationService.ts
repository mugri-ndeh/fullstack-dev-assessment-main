import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/api";
import type { LocationCreateInput } from "../schemas/location";

/**
 * Locations are reference data: created once, then selected from. Courses and
 * trainers reference them by FK, so there is deliberately no update or delete
 * path — renaming or removing a location would silently rewrite or block
 * existing bookings. Adding one is safe, so that is the only mutation exposed.
 */
export async function listLocations() {
  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
  });
  return locations.map((l) => ({ id: l.id, name: l.name }));
}

/**
 * Add a selectable location.
 *
 * The unique index on `name` is case-sensitive, so "berlin, germany" and
 * "Berlin, Germany" would both be accepted by the database — exactly the case
 * drift that motivated making locations a table. This rejects a
 * case-insensitive match up front and reports the existing spelling, so the
 * user picks the one that's already there instead of creating a near-duplicate.
 */
export async function createLocation(input: LocationCreateInput) {
  const existing = await prisma.location.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
  });
  if (existing) {
    throw new ApiError(409, `Location "${existing.name}" already exists`);
  }
  const location = await prisma.location.create({ data: { name: input.name } });
  return { id: location.id, name: location.name };
}

/**
 * Guard for write paths: a locationId that doesn't exist is a client error
 * (400), not a 500 from the FK constraint firing deeper in the stack.
 */
export async function requireLocation(locationId: string) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
  });
  if (!location) throw new ApiError(400, "Selected location does not exist");
  return location;
}
