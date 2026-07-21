import { createHandler } from "../../../lib/api";
import {
  trainerCreateSchema,
  trainerListQuerySchema,
} from "../../../schemas/trainer";
import { listTrainers, createTrainer } from "../../../services/trainerService";

/**
 * GET  /api/trainers — list, filters: subject, locationId, search, sortBy, sortOrder
 * POST /api/trainers — create; body validated by trainerCreateSchema
 */
export default createHandler({
  GET: async (req, res) => {
    const query = trainerListQuerySchema.parse(req.query);
    res.status(200).json({ trainers: await listTrainers(query) });
  },
  POST: async (req, res) => {
    const input = trainerCreateSchema.parse(req.body);
    res.status(201).json({ trainer: await createTrainer(input) });
  },
});
