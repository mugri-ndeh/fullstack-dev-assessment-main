import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/api";
import { requireLocation } from "./locationService";
import type {
  TrainerCreateInput,
  TrainerUpdateInput,
  TrainerListQuery,
} from "../schemas/trainer";

const trainerInclude = {
  availability: { orderBy: { startDate: "asc" as const } },
  location: { select: { id: true, name: true } },
} satisfies Prisma.TrainerInclude;

type TrainerRow = Prisma.TrainerGetPayload<{ include: typeof trainerInclude }>;

export function toTrainerDto(trainer: TrainerRow) {
  return {
    id: trainer.id,
    name: trainer.name,
    subjects: trainer.subjects,
    // Display name for rendering, id for the form's select.
    location: trainer.location.name,
    locationId: trainer.locationId,
    email: trainer.email,
    hourlyRate: trainer.hourlyRate === null ? null : Number(trainer.hourlyRate),
    rating: trainer.rating,
    availability: trainer.availability.map((a) => ({
      id: a.id,
      type: a.type,
      startDate: a.startDate.toISOString().slice(0, 10),
      endDate: a.endDate.toISOString().slice(0, 10),
    })),
    createdAt: trainer.createdAt.toISOString(),
    updatedAt: trainer.updatedAt.toISOString(),
  };
}

export type TrainerDto = ReturnType<typeof toTrainerDto>;

export async function listTrainers(query: TrainerListQuery) {
  const where: Prisma.TrainerWhereInput = {
    ...(query.subject && { subjects: { has: query.subject } }),
    ...(query.locationId && { locationId: query.locationId }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { email: { contains: query.search, mode: "insensitive" as const } },
      ],
    }),
  };
  // The { sort, nulls } form is only valid on nullable columns; rating and
  // hourlyRate use it so unrated trainers sink to the bottom of "desc" sorts.
  const nullableSort = ["rating", "hourlyRate"].includes(query.sortBy);
  const trainers = await prisma.trainer.findMany({
    where,
    include: trainerInclude,
    orderBy: {
      [query.sortBy]: nullableSort
        ? { sort: query.sortOrder, nulls: "last" }
        : query.sortOrder,
    },
  });
  return trainers.map(toTrainerDto);
}

export async function getTrainer(id: string) {
  const trainer = await prisma.trainer.findUnique({
    where: { id },
    include: {
      ...trainerInclude,
      courses: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        select: {
          id: true,
          name: true,
          date: true,
          location: { select: { name: true } },
          status: true,
        },
      },
      assignmentHistory: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { course: { select: { id: true, name: true } } },
      },
    },
  });
  if (!trainer) throw new ApiError(404, "Trainer not found");
  return {
    ...toTrainerDto(trainer),
    courses: trainer.courses.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      location: c.location.name,
      date: c.date.toISOString().slice(0, 10),
    })),
    assignmentHistory: trainer.assignmentHistory.map((h) => ({
      id: h.id,
      action: h.action,
      course: h.course,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export async function createTrainer(input: TrainerCreateInput) {
  await requireLocation(input.locationId);
  const trainer = await prisma.trainer.create({
    data: {
      name: input.name,
      subjects: input.subjects,
      locationId: input.locationId,
      email: input.email.toLowerCase(),
      hourlyRate: input.hourlyRate ?? null,
      rating: input.rating ?? null,
      availability: input.availability
        ? { create: input.availability }
        : undefined,
    },
    include: trainerInclude,
  });
  return toTrainerDto(trainer);
}

export async function updateTrainer(id: string, input: TrainerUpdateInput) {
  const existing = await prisma.trainer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Trainer not found");
  if (input.locationId !== undefined) await requireLocation(input.locationId);

  const trainer = await prisma.$transaction(async (tx) => {
    // Availability is replace-all: simpler contract for the client than
    // diffing individual windows, and the volume (<100 rows) makes it cheap.
    if (input.availability !== undefined) {
      await tx.trainerAvailability.deleteMany({ where: { trainerId: id } });
      if (input.availability.length) {
        await tx.trainerAvailability.createMany({
          data: input.availability.map((a) => ({ ...a, trainerId: id })),
        });
      }
    }
    return tx.trainer.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.subjects !== undefined && { subjects: input.subjects }),
        ...(input.locationId !== undefined && {
          locationId: input.locationId,
        }),
        ...(input.email !== undefined && { email: input.email.toLowerCase() }),
        ...(input.hourlyRate !== undefined && { hourlyRate: input.hourlyRate }),
        ...(input.rating !== undefined && { rating: input.rating }),
      },
      include: trainerInclude,
    });
  });
  return toTrainerDto(trainer);
}

/**
 * Deleting a trainer must not delete their courses. The FK is SET NULL, so
 * courses revert to "unassigned"; here we also write an UNASSIGNED history
 * entry per affected course (with name/email snapshot) inside one transaction
 * so the audit trail explains *why* the course lost its trainer.
 */
export async function deleteTrainer(id: string) {
  const trainer = await prisma.trainer.findUnique({
    where: { id },
    include: { courses: { where: { deletedAt: null }, select: { id: true } } },
  });
  if (!trainer) throw new ApiError(404, "Trainer not found");

  await prisma.$transaction(async (tx) => {
    if (trainer.courses.length) {
      await tx.assignmentHistory.createMany({
        data: trainer.courses.map((c) => ({
          courseId: c.id,
          action: "UNASSIGNED" as const,
          trainerId: null,
          trainerName: trainer.name,
          trainerEmail: trainer.email,
          note: "Trainer deleted from system",
        })),
      });
    }
    await tx.trainer.delete({ where: { id } });
  });

  return { unassignedCourses: trainer.courses.length };
}
