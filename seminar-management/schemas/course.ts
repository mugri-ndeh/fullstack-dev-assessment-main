import { z } from "zod";

export const COURSE_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;

const subjectList = z
  .array(z.string().trim().min(1, "Subject cannot be empty").max(100))
  .min(1, "At least one subject is required")
  .max(20);

export const courseCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  // Accepts "2026-08-14" or full ISO datetime; stored as DATE in Postgres.
  date: z.coerce.date({ error: "Valid date is required" }),
  subjects: subjectList,
  location: z.string().trim().min(1, "Location is required").max(200),
  participants: z.number().int().min(1, "At least 1 participant").max(10000),
  notes: z.string().trim().max(5000).optional().nullable(),
  price: z.number().min(0, "Price cannot be negative").max(1_000_000),
  trainerPrice: z
    .number()
    .min(0, "Trainer price cannot be negative")
    .max(1_000_000),
  status: z.enum(COURSE_STATUSES).default("DRAFT"),
  trainerId: z.string().trim().min(1).optional().nullable(),
});

export const courseUpdateSchema = courseCreateSchema.partial();

// List filtering/sorting — validated so arbitrary query strings can't reach
// the DB layer (whitelist of sortable columns, not raw user input).
export const courseListQuerySchema = z.object({
  status: z.enum(COURSE_STATUSES).optional(),
  subject: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  trainerId: z.string().trim().min(1).optional(),
  sortBy: z.enum(["date", "name", "price", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;
export type CourseListQuery = z.infer<typeof courseListQuerySchema>;
