import { z } from "zod";

export const AVAILABILITY_TYPES = ["AVAILABLE", "BLACKOUT"] as const;

const availabilityEntry = z
  .object({
    type: z.enum(AVAILABILITY_TYPES),
    startDate: z.coerce.date({ error: "Valid start date required" }),
    endDate: z.coerce.date({ error: "Valid end date required" }),
  })
  .refine((r) => r.endDate >= r.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

export const trainerCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  subjects: z
    .array(z.string().trim().min(1, "Subject cannot be empty").max(100))
    .min(1, "At least one subject is required")
    .max(50),
  location: z.string().trim().min(1, "Location is required").max(200),
  email: z.email("Valid email is required").max(320),
  hourlyRate: z.number().min(0).max(100_000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  availability: z.array(availabilityEntry).max(100).optional(),
});

export const trainerUpdateSchema = trainerCreateSchema.partial();

export const trainerListQuerySchema = z.object({
  subject: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.enum(["name", "rating", "hourlyRate", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type TrainerCreateInput = z.infer<typeof trainerCreateSchema>;
export type TrainerUpdateInput = z.infer<typeof trainerUpdateSchema>;
export type TrainerListQuery = z.infer<typeof trainerListQuerySchema>;
