import { createHandler } from "../../lib/api";
import { locationCreateSchema } from "../../schemas/location";
import { listLocations, createLocation } from "../../services/locationService";

/**
 * GET  /api/locations — the selectable locations, name-ascending.
 * POST /api/locations — add one; 409 if it already exists (case-insensitive).
 *
 * No update or delete: courses and trainers point at these by FK, so renaming
 * would rewrite existing bookings and deleting is blocked by the constraint.
 */
export default createHandler({
  GET: async (_req, res) => {
    res.status(200).json({ locations: await listLocations() });
  },
  POST: async (req, res) => {
    const input = locationCreateSchema.parse(req.body);
    res.status(201).json({ location: await createLocation(input) });
  },
});
