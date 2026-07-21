import { ApiError, createHandler, queryParam } from "../../../lib/api";
import { courseUpdateSchema } from "../../../schemas/course";
import {
  getCourse,
  updateCourse,
  softDeleteCourse,
} from "../../../services/courseService";

function requireId(raw: string | string[] | undefined): string {
  const id = queryParam(raw);
  if (!id) throw new ApiError(400, "Course id is required");
  return id;
}

/**
 * GET    /api/courses/:id — detail incl. assignment history
 * PUT    /api/courses/:id — partial update (all fields optional)
 * DELETE /api/courses/:id — soft delete (kept for history/reporting)
 */
export default createHandler({
  GET: async (req, res) => {
    res.status(200).json({ course: await getCourse(requireId(req.query.id)) });
  },
  PUT: async (req, res) => {
    const input = courseUpdateSchema.parse(req.body);
    const { course, warnings } = await updateCourse(
      requireId(req.query.id),
      input
    );
    res.status(200).json({ course, warnings });
  },
  DELETE: async (req, res) => {
    await softDeleteCourse(requireId(req.query.id));
    res.status(204).end();
  },
});
