import { createHandler } from "../../../lib/api";
import {
  courseCreateSchema,
  courseListQuerySchema,
} from "../../../schemas/course";
import { listCourses, createCourse } from "../../../services/courseService";

/**
 * GET  /api/courses — list, filters: status, subject, location, search,
 *                     trainerId, sortBy, sortOrder
 * POST /api/courses — create; body validated by courseCreateSchema.
 *   409 + { details: { conflicts } } if scheduling conflicts are detected;
 *   pass overrideConflicts: true to save anyway (conflicts echoed as warnings).
 */
export default createHandler({
  GET: async (req, res) => {
    const query = courseListQuerySchema.parse(req.query);
    res.status(200).json({ courses: await listCourses(query) });
  },
  POST: async (req, res) => {
    const input = courseCreateSchema.parse(req.body);
    const { course, warnings } = await createCourse(input);
    res.status(201).json({ course, warnings });
  },
});
