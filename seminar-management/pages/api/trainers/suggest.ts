import { createHandler } from "../../../lib/api";
import { suggestRequestSchema } from "../../../schemas/suggestion";
import { suggestTrainers } from "../../../services/suggestionService";

/**
 * POST /api/trainers/suggest — LLM-ranked (or rule-based fallback) trainer
 * suggestions for a course; body { courseId }. POST rather than GET because it
 * triggers LLM work and is cached server-side, not by HTTP intermediaries.
 */
export default createHandler({
  POST: async (req, res) => {
    const { courseId } = suggestRequestSchema.parse(req.body);
    res.status(200).json(await suggestTrainers(courseId));
  },
});
