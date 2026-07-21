import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/api";
import { detectConflicts, type Conflict } from "./conflictService";
import { requireLocation } from "./locationService";
import {
  sendTrainerAssignmentEmail,
  type EmailResult,
} from "./emailService";
import type {
  CourseCreateInput,
  CourseUpdateInput,
  CourseListQuery,
} from "../schemas/course";

// Prisma returns Decimal objects (which JSON-serialize as strings) and Date
// objects; DTOs normalize to numbers / ISO strings so the frontend gets
// predictable JSON.
const courseInclude = {
  trainer: {
    select: {
      id: true,
      name: true,
      email: true,
      locationId: true,
      location: { select: { name: true } },
    },
  },
  location: { select: { id: true, name: true } },
} satisfies Prisma.CourseInclude;

type CourseRow = Prisma.CourseGetPayload<{ include: typeof courseInclude }>;

export function toCourseDto(course: CourseRow) {
  return {
    id: course.id,
    name: course.name,
    date: course.date.toISOString().slice(0, 10),
    subjects: course.subjects,
    // `location` stays the display name so every consumer keeps rendering a
    // plain string; `locationId` is what forms submit back.
    location: course.location.name,
    locationId: course.locationId,
    participants: course.participants,
    notes: course.notes,
    price: Number(course.price),
    trainerPrice: Number(course.trainerPrice),
    status: course.status,
    // Flattened the same way, so the trainer summary stays { …, location: string }.
    trainer: course.trainer && {
      id: course.trainer.id,
      name: course.trainer.name,
      email: course.trainer.email,
      location: course.trainer.location.name,
      locationId: course.trainer.locationId,
    },
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

export type CourseDto = ReturnType<typeof toCourseDto>;

// Soft delete: every read filters deletedAt null. Deleted courses stay in the
// DB so AssignmentHistory and revenue reporting remain intact.
const notDeleted = { deletedAt: null };

export async function listCourses(query: CourseListQuery) {
  const where: Prisma.CourseWhereInput = {
    ...notDeleted,
    ...(query.status && { status: query.status }),
    ...(query.subject && { subjects: { has: query.subject } }),
    ...(query.locationId && { locationId: query.locationId }),
    ...(query.search && {
      name: { contains: query.search, mode: "insensitive" as const },
    }),
    ...(query.trainerId && { trainerId: query.trainerId }),
  };
  const courses = await prisma.course.findMany({
    where,
    include: courseInclude,
    orderBy: { [query.sortBy]: query.sortOrder },
  });
  return courses.map(toCourseDto);
}

export async function getCourse(id: string) {
  const course = await prisma.course.findFirst({
    where: { id, ...notDeleted },
    include: {
      ...courseInclude,
      assignmentHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!course) throw new ApiError(404, "Course not found");
  return {
    ...toCourseDto(course),
    assignmentHistory: course.assignmentHistory.map((h) => ({
      id: h.id,
      action: h.action,
      trainerName: h.trainerName,
      trainerEmail: h.trainerEmail,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

async function requireTrainer(trainerId: string) {
  const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
  if (!trainer) throw new ApiError(400, "Assigned trainer does not exist");
  return trainer;
}

/**
 * Conflict policy: conflicts block the save with a 409 carrying structured
 * details, unless the caller explicitly sets overrideConflicts — then the
 * save proceeds and the conflicts are returned as warnings. Cancelled
 * courses are exempt (they occupy no resources).
 */
async function checkConflictsOrThrow(
  params: Parameters<typeof detectConflicts>[0],
  status: string,
  override: boolean
): Promise<Conflict[]> {
  if (status === "CANCELLED") return [];
  const conflicts = await detectConflicts(params);
  if (conflicts.length && !override) {
    throw new ApiError(409, "Scheduling conflicts detected", { conflicts });
  }
  return conflicts;
}

export async function createCourse(input: CourseCreateInput) {
  const trainer = input.trainerId
    ? await requireTrainer(input.trainerId)
    : null;
  // Validate up front so an unknown location is a 400, not an FK error later.
  await requireLocation(input.locationId);

  const warnings = await checkConflictsOrThrow(
    {
      date: input.date,
      locationId: input.locationId,
      trainerId: input.trainerId,
    },
    input.status,
    input.overrideConflicts
  );

  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        name: input.name,
        date: input.date,
        subjects: input.subjects,
        locationId: input.locationId,
        participants: input.participants,
        notes: input.notes ?? null,
        price: input.price,
        trainerPrice: input.trainerPrice,
        status: input.status,
        trainerId: input.trainerId ?? null,
      },
      include: courseInclude,
    });
    if (trainer) {
      await tx.assignmentHistory.create({
        data: {
          courseId: created.id,
          action: "ASSIGNED",
          trainerId: trainer.id,
          trainerName: trainer.name,
          trainerEmail: trainer.email,
          note: "Assigned at course creation",
        },
      });
    }
    return created;
  });

  // Email is sent AFTER the transaction commits: a mail outage must not roll
  // back the assignment. sendTrainerAssignmentEmail never throws — failures
  // come back as { sent: false } and are surfaced to the client.
  const dto = toCourseDto(course);
  let emailNotification: EmailResult | undefined;
  if (trainer) {
    emailNotification = await sendTrainerAssignmentEmail(trainer, dto);
  }
  return { course: dto, warnings, emailNotification };
}

export async function updateCourse(id: string, input: CourseUpdateInput) {
  const existing = await prisma.course.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new ApiError(404, "Course not found");

  // trainerId semantics: undefined = leave as is, null = unassign, id = assign.
  const trainerChanged =
    input.trainerId !== undefined && input.trainerId !== existing.trainerId;
  const newTrainer =
    trainerChanged && input.trainerId
      ? await requireTrainer(input.trainerId)
      : null;
  if (input.locationId !== undefined) await requireLocation(input.locationId);

  // Check conflicts against the course's *effective* post-update state, so a
  // partial update (e.g. date only) still validates location and trainer.
  const effective = {
    date: input.date ?? existing.date,
    locationId: input.locationId ?? existing.locationId,
    trainerId:
      input.trainerId === undefined ? existing.trainerId : input.trainerId,
    status: input.status ?? existing.status,
  };
  const warnings = await checkConflictsOrThrow(
    {
      excludeCourseId: id,
      date: effective.date,
      locationId: effective.locationId,
      trainerId: effective.trainerId,
    },
    effective.status,
    input.overrideConflicts ?? false
  );

  const course = await prisma.$transaction(async (tx) => {
    if (trainerChanged && existing.trainerId) {
      const old = await tx.trainer.findUnique({
        where: { id: existing.trainerId },
      });
      await tx.assignmentHistory.create({
        data: {
          courseId: id,
          action: "UNASSIGNED",
          trainerId: old?.id ?? null,
          trainerName: old?.name ?? "(deleted trainer)",
          trainerEmail: old?.email ?? "",
          note: "Replaced via course update",
        },
      });
    }
    if (trainerChanged && newTrainer) {
      await tx.assignmentHistory.create({
        data: {
          courseId: id,
          action: "ASSIGNED",
          trainerId: newTrainer.id,
          trainerName: newTrainer.name,
          trainerEmail: newTrainer.email,
          note: "Assigned via course update",
        },
      });
    }
    return tx.course.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.date !== undefined && { date: input.date }),
        ...(input.subjects !== undefined && { subjects: input.subjects }),
        ...(input.locationId !== undefined && {
          locationId: input.locationId,
        }),
        ...(input.participants !== undefined && {
          participants: input.participants,
        }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.trainerPrice !== undefined && {
          trainerPrice: input.trainerPrice,
        }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.trainerId !== undefined && {
          trainerId: input.trainerId,
        }),
      },
      include: courseInclude,
    });
  });

  const dto = toCourseDto(course);
  let emailNotification: EmailResult | undefined;
  if (newTrainer) {
    emailNotification = await sendTrainerAssignmentEmail(newTrainer, dto);
  }
  return { course: dto, warnings, emailNotification };
}

export async function softDeleteCourse(id: string) {
  const existing = await prisma.course.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new ApiError(404, "Course not found");
  await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
