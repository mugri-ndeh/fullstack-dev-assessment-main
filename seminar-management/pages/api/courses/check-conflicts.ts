import { createHandler } from "../../../lib/api";
import { conflictCheckSchema } from "../../../schemas/course";
import { detectConflicts } from "../../../services/conflictService";

/**
 * POST /api/courses/check-conflicts
 * Body: { courseId?, date, location, trainerId? }
 * Non-mutating probe so the form UI can surface conflicts before the user
 * submits. Same detection logic the save path enforces.
 */
export default createHandler({
  POST: async (req, res) => {
    const input = conflictCheckSchema.parse(req.body);
    const conflicts = await detectConflicts({
      excludeCourseId: input.courseId,
      date: input.date,
      location: input.location,
      trainerId: input.trainerId,
    });
    res.status(200).json({ conflicts });
  },
});
