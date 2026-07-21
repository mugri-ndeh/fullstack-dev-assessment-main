import { createHandler } from "../../lib/api";
import { prisma } from "../../lib/prisma";

/**
 * GET /api/stats — dashboard overview numbers, computed in the DB
 * (counts + aggregates), not by loading rows into Node.
 */
export default createHandler({
  GET: async (_req, res) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const notDeleted = { deletedAt: null };

    const [totalCourses, totalTrainers, upcomingCourses, unassignedUpcoming, revenue] =
      await Promise.all([
        prisma.course.count({ where: notDeleted }),
        prisma.trainer.count(),
        prisma.course.count({
          where: {
            ...notDeleted,
            date: { gte: today },
            status: { in: ["DRAFT", "SCHEDULED"] },
          },
        }),
        prisma.course.count({
          where: {
            ...notDeleted,
            date: { gte: today },
            status: { in: ["DRAFT", "SCHEDULED"] },
            trainerId: null,
          },
        }),
        prisma.course.aggregate({
          where: { ...notDeleted, status: { not: "CANCELLED" } },
          _sum: { price: true, trainerPrice: true },
        }),
      ]);

    const totalRevenue = Number(revenue._sum.price ?? 0);
    const totalTrainerCosts = Number(revenue._sum.trainerPrice ?? 0);

    res.status(200).json({
      stats: {
        totalCourses,
        totalTrainers,
        upcomingCourses,
        unassignedUpcoming,
        totalRevenue,
        totalTrainerCosts,
        margin: totalRevenue - totalTrainerCosts,
      },
    });
  },
});
