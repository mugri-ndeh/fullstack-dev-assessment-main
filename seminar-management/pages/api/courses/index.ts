import { createHandler } from "../../../lib/api";
import {
  courseCreateSchema,
  courseListQuerySchema,
} from "../../../schemas/course";
import { listCourses, createCourse } from "../../../services/courseService";

/**
 * GET  /api/courses — list, filters: status, subject, location, search,
 *                     trainerId, sortBy, sortOrder
 * POST /api/courses — create; body validated by courseCreateSchema
 */
export default createHandler({
  GET: async (req, res) => {
    const query = courseListQuerySchema.parse(req.query);
    res.status(200).json({ courses: await listCourses(query) });
  },
  POST: async (req, res) => {
    const input = courseCreateSchema.parse(req.body);
    res.status(201).json({ course: await createCourse(input) });
  },
});
