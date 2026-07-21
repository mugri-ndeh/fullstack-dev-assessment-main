import { z } from "zod";

/** POST /api/trainers/suggest request body. */
export const suggestRequestSchema = z.object({
  courseId: z.string().trim().min(1, "Course ID is required"),
});

// Confidence is self-reported by the model: accept numeric strings/floats and
// normalize to an integer clamped 0-100 rather than rejecting the whole
// suggestion over a value like 87.5 or "90".
const confidenceSchema = z.coerce
  .number({ error: "Confidence must be a number" })
  .transform((n) => Math.min(100, Math.max(0, Math.round(n))));

/** One suggestion as produced by the LLM (before trainerId whitelisting). */
export const llmSuggestionSchema = z.object({
  trainerId: z.string().trim().min(1),
  confidence: confidenceSchema,
  reasoning: z.string().trim().min(1, "Reasoning is required").max(2000),
  factors: z.object({
    subject: z.string().trim().min(1).max(500),
    location: z.string().trim().min(1).max(500),
    availability: z.string().trim().min(1).max(500),
    experience: z.string().trim().min(1).max(500),
  }),
});

/** The full structured object the LLM must return. */
export const llmResponseSchema = z.object({
  suggestions: z.array(llmSuggestionSchema).min(1).max(5),
});

export type SuggestRequest = z.infer<typeof suggestRequestSchema>;
export type LlmSuggestion = z.infer<typeof llmSuggestionSchema>;

/** One suggestion in the API response (name joined from the DB, never LLM). */
export interface TrainerSuggestion {
  trainerId: string;
  name: string;
  confidence: number;
  reasoning: string;
  factors: {
    subject: string;
    location: string;
    availability: string;
    experience: string;
  };
}

/** POST /api/trainers/suggest response body. */
export interface SuggestResponse {
  courseId: string;
  source: "ai" | "fallback";
  fallbackReason?: string;
  cached: boolean;
  generatedAt: string;
  suggestions: TrainerSuggestion[];
}
