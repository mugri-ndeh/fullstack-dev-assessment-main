import { ApiError, createHandler, queryParam } from "../../../lib/api";
import { trainerUpdateSchema } from "../../../schemas/trainer";
import {
  getTrainer,
  updateTrainer,
  deleteTrainer,
} from "../../../services/trainerService";

function requireId(raw: string | string[] | undefined): string {
  const id = queryParam(raw);
  if (!id) throw new ApiError(400, "Trainer id is required");
  return id;
}

/**
 * GET    /api/trainers/:id — profile incl. courses + assignment history
 * PUT    /api/trainers/:id — partial update; availability is replace-all
 * DELETE /api/trainers/:id — hard delete; assigned courses become unassigned
 *                            and an UNASSIGNED history entry is recorded each
 */
export default createHandler({
  GET: async (req, res) => {
    res
      .status(200)
      .json({ trainer: await getTrainer(requireId(req.query.id)) });
  },
  PUT: async (req, res) => {
    const input = trainerUpdateSchema.parse(req.body);
    res
      .status(200)
      .json({ trainer: await updateTrainer(requireId(req.query.id), input) });
  },
  DELETE: async (req, res) => {
    const result = await deleteTrainer(requireId(req.query.id));
    res.status(200).json(result);
  },
});
