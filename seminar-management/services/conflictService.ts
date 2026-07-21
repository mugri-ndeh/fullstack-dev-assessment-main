import { prisma } from "../lib/prisma";

/**
 * Conflict detection.
 *
 * Granularity: courses are scheduled per calendar day (the Course model has a
 * date, not time slots — matching the assessment's data model), so "overlap"
 * means "same day". If hours were added later, only `overlapsSameDay` and the
 * candidate query below would change — the classification logic stays.
 *
 * Checked (against non-deleted, non-cancelled courses only):
 * - TRAINER_DOUBLE_BOOKED: assigned trainer already has a course that day
 * - LOCATION_OCCUPIED:     another course runs at the same location that day
 * - TRAINER_UNAVAILABLE:   course date falls in a BLACKOUT window of the trainer
 */

export type ConflictType =
  | "TRAINER_DOUBLE_BOOKED"
  | "LOCATION_OCCUPIED"
  | "TRAINER_UNAVAILABLE";

export interface Conflict {
  type: ConflictType;
  message: string;
  conflictingCourse?: {
    id: string;
    name: string;
    date: string;
    location: string;
  };
}

export interface ConflictCheckInput {
  /** Set on updates so a course doesn't conflict with itself. */
  excludeCourseId?: string;
  date: Date;
  location: string;
  trainerId?: string | null;
}

export async function detectConflicts(
  input: ConflictCheckInput
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  // One indexed query fetches every same-day course that could conflict on
  // either dimension; classification happens in code. O(courses that day).
  const sameDay = await prisma.course.findMany({
    where: {
      date: input.date,
      deletedAt: null,
      status: { not: "CANCELLED" },
      ...(input.excludeCourseId && { id: { not: input.excludeCourseId } }),
      OR: [
        { location: { equals: input.location, mode: "insensitive" } },
        ...(input.trainerId ? [{ trainerId: input.trainerId }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      date: true,
      location: true,
      trainerId: true,
    },
  });

  for (const other of sameDay) {
    const summary = {
      id: other.id,
      name: other.name,
      date: other.date.toISOString().slice(0, 10),
      location: other.location,
    };
    if (input.trainerId && other.trainerId === input.trainerId) {
      conflicts.push({
        type: "TRAINER_DOUBLE_BOOKED",
        message: `Trainer is already booked for "${other.name}" on ${summary.date}`,
        conflictingCourse: summary,
      });
    }
    if (other.location.toLowerCase() === input.location.toLowerCase()) {
      conflicts.push({
        type: "LOCATION_OCCUPIED",
        message: `"${other.name}" already takes place at ${other.location} on ${summary.date}`,
        conflictingCourse: summary,
      });
    }
  }

  if (input.trainerId) {
    const blackout = await prisma.trainerAvailability.findFirst({
      where: {
        trainerId: input.trainerId,
        type: "BLACKOUT",
        startDate: { lte: input.date },
        endDate: { gte: input.date },
      },
    });
    if (blackout) {
      conflicts.push({
        type: "TRAINER_UNAVAILABLE",
        message: `Trainer is unavailable ${blackout.startDate
          .toISOString()
          .slice(0, 10)} to ${blackout.endDate.toISOString().slice(0, 10)}`,
      });
    }
  }

  return conflicts;
}
