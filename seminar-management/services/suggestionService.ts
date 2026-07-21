import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/api";
import { detectConflicts } from "./conflictService";
import { chatCompletionJSON, isConfigured } from "../lib/openrouter";
import { llmResponseSchema } from "../schemas/suggestion";
import type { SuggestResponse, TrainerSuggestion } from "../schemas/suggestion";

/**
 * Trainer suggestion orchestrator for POST /api/trainers/suggest.
 *
 * Pipeline: load course -> load all trainers -> drop trainers with scheduling
 * conflicts (via conflictService — never reimplemented here) -> serve from the
 * 5-minute in-memory cache when inputs are unchanged -> ask the LLM to rank
 * candidates -> validate/whitelist its output -> otherwise fall back to a
 * deterministic rule-based scorer. Every path returns the same DTO shape.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_SUGGESTIONS = 5;
const MIN_SUGGESTIONS = 3;

interface CacheEntry {
  expiresAt: number;
  response: SuggestResponse;
}

// Survives Next.js dev hot-reloads, same pattern as lib/prisma.ts. Per-process
// only (not shared across instances, gone on redeploy) — acceptable per spec.
const globalForSuggestions = globalThis as unknown as {
  suggestionCache?: Map<string, CacheEntry>;
};
const cache = (globalForSuggestions.suggestionCache ??= new Map());

const candidateSelect = {
  id: true,
  name: true,
  subjects: true,
  locationId: true,
  location: { select: { name: true } },
  rating: true,
  hourlyRate: true,
  updatedAt: true,
  availability: {
    select: { type: true, startDate: true, endDate: true },
    orderBy: { startDate: "asc" as const },
  },
  _count: { select: { courses: { where: { deletedAt: null } } } },
} satisfies Prisma.TrainerSelect;

type CandidateRow = Prisma.TrainerGetPayload<{ select: typeof candidateSelect }>;

interface CourseContext {
  id: string;
  name: string;
  date: Date;
  subjects: string[];
  locationId: string;
  location: string;
  participants: number;
  updatedAt: Date;
}

export async function suggestTrainers(
  courseId: string
): Promise<SuggestResponse> {
  const row = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      name: true,
      date: true,
      subjects: true,
      locationId: true,
      location: { select: { name: true } },
      participants: true,
      updatedAt: true,
    },
  });
  if (!row) throw new ApiError(404, "Course not found");

  // Flatten the location relation once: downstream (prompt building, scoring,
  // reasoning strings) wants the display name, matching by id.
  const course: CourseContext = { ...row, location: row.location.name };

  const trainers = await prisma.trainer.findMany({
    select: candidateSelect,
    orderBy: { name: "asc" },
  });

  // Conflict exclusion — reuses conflictService verbatim. Only trainer-scoped
  // conflict types disqualify a candidate: LOCATION_OCCUPIED means the *venue*
  // is double-booked and would wrongly wipe out every candidate at once.
  const conflictLists = await Promise.all(
    trainers.map((t) =>
      detectConflicts({
        excludeCourseId: course.id,
        date: course.date,
        locationId: course.locationId,
        trainerId: t.id,
      })
    )
  );
  const candidates = trainers.filter((_, i) =>
    conflictLists[i].every(
      (c) =>
        c.type !== "TRAINER_DOUBLE_BOOKED" && c.type !== "TRAINER_UNAVAILABLE"
    )
  );

  const fingerprint = computeFingerprint(course, candidates);
  const hit = cache.get(fingerprint);
  if (hit) {
    if (hit.expiresAt > Date.now()) return { ...hit.response, cached: true };
    cache.delete(fingerprint); // lazy eviction
  }

  const response = await buildResponse(course, candidates);
  cache.set(fingerprint, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    response,
  });
  return response;
}

async function buildResponse(
  course: CourseContext,
  candidates: CandidateRow[]
): Promise<SuggestResponse> {
  const base = {
    courseId: course.id,
    cached: false,
    generatedAt: new Date().toISOString(),
  };

  if (candidates.length === 0) {
    return {
      ...base,
      source: "fallback",
      fallbackReason:
        "No conflict-free trainers are available for this course date",
      suggestions: [],
    };
  }

  if (isConfigured()) {
    try {
      const suggestions = await rankWithAi(course, candidates);
      return { ...base, source: "ai", suggestions };
    } catch (err) {
      console.error("[suggestions] AI ranking failed, using fallback:", err);
      return {
        ...base,
        source: "fallback",
        fallbackReason:
          "AI ranking was unavailable; showing rule-based suggestions",
        suggestions: rankWithRules(course, candidates),
      };
    }
  }

  return {
    ...base,
    source: "fallback",
    fallbackReason:
      "AI suggestions are not configured; showing rule-based suggestions",
    suggestions: rankWithRules(course, candidates),
  };
}

/* -------------------------------------------------------------------------- */
/* Cache fingerprint                                                          */
/* -------------------------------------------------------------------------- */

/**
 * SHA-256 over everything a ranking depends on. Including updatedAt for the
 * course and every candidate bounds staleness: any edit to those records
 * changes the fingerprint and busts the cache before the TTL does.
 */
function computeFingerprint(
  course: CourseContext,
  candidates: CandidateRow[]
): string {
  const payload = {
    courseId: course.id,
    date: dateOnly(course.date),
    subjects: course.subjects,
    location: course.location,
    updatedAt: course.updatedAt.toISOString(),
    candidates: [...candidates]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((t) => ({
        id: t.id,
        subjects: t.subjects,
        locationId: t.locationId,
        rating: t.rating,
        updatedAt: t.updatedAt.toISOString(),
        availability: t.availability.map(
          (a) => `${a.type}:${dateOnly(a.startDate)}:${dateOnly(a.endDate)}`
        ),
      })),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/* -------------------------------------------------------------------------- */
/* AI ranking                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Prompt design — why each piece of context is included:
 *
 * - Course name/subjects: the core matching signal; subjects let the model
 *   judge topical fit beyond exact string equality (e.g. "React" vs
 *   "Frontend Development"), which is exactly what the rule scorer can't do.
 * - Course date + a precomputed availableOnDate flag per trainer: the model
 *   should reward explicit availability, but we resolve the date math
 *   server-side (LLMs are unreliable at date-window arithmetic) and only feed
 *   it the boolean. Hard conflicts are already filtered out before the prompt,
 *   so every listed trainer is assignable.
 * - Course location + trainer location: travel is a real cost driver; the
 *   model can weigh same-city matches without us hardcoding geography.
 * - Participants: proxy for course size/stakes, lets the model prefer proven
 *   trainers for large groups.
 * - Per trainer: id (the ONLY key it may echo back — names are re-joined from
 *   the DB to prevent hallucinated identities), subjects, location, rating
 *   (1-5 or null), hourlyRate (cost awareness), pastCourseCount (experience).
 *   Email is deliberately excluded: it adds no matching signal and keeps PII
 *   out of a third-party API call.
 * - The system prompt pins the output contract (strict JSON, 3-5 items,
 *   best-first, confidence 0-100 int, reasoning 1-3 sentences, four factor
 *   notes) so the response parses against llmResponseSchema; temperature and
 *   response_format are handled by lib/openrouter.
 */
async function rankWithAi(
  course: CourseContext,
  candidates: CandidateRow[]
): Promise<TrainerSuggestion[]> {
  const system = [
    "You are an assistant that ranks seminar trainers for a course.",
    "Respond with ONLY a JSON object, no prose, in exactly this shape:",
    '{"suggestions":[{"trainerId":"<id from the candidate list>","confidence":<integer 0-100>,"reasoning":"<1-3 sentences>","factors":{"subject":"<note on subject fit>","location":"<note on location fit>","availability":"<note on availability>","experience":"<note on experience>"}}]}',
    `Return between ${MIN_SUGGESTIONS} and ${MAX_SUGGESTIONS} suggestions (fewer only if fewer candidates exist), ordered best match first.`,
    "Use only trainerId values from the candidate list. Never invent trainers.",
    "Weigh subject fit highest, then availability on the course date, then location proximity, then experience (past courses, rating). Consider hourly rate as a tie-breaker.",
  ].join("\n");

  const user = JSON.stringify(
    {
      course: {
        name: course.name,
        date: dateOnly(course.date),
        subjects: course.subjects,
        location: course.location,
        participants: course.participants,
      },
      candidates: candidates.map((t) => ({
        trainerId: t.id,
        subjects: t.subjects,
        location: t.location.name,
        rating: t.rating,
        hourlyRate: t.hourlyRate === null ? null : Number(t.hourlyRate),
        pastCourseCount: t._count.courses,
        availableOnDate: hasAvailableWindow(t, course.date),
      })),
    },
    null,
    2
  );

  const raw = await chatCompletionJSON({ system, user });
  const parsed = llmResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Model output failed validation: ${parsed.error.message}`);
  }

  // Anti-hallucination whitelist: keep only ids that exist in the candidate
  // set, drop duplicates, and always take the display name from the DB.
  const byId = new Map(candidates.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const suggestions: TrainerSuggestion[] = [];
  for (const s of parsed.data.suggestions) {
    const trainer = byId.get(s.trainerId);
    if (!trainer || seen.has(s.trainerId)) continue;
    seen.add(s.trainerId);
    suggestions.push({
      trainerId: trainer.id,
      name: trainer.name,
      confidence: s.confidence,
      reasoning: s.reasoning,
      factors: s.factors,
    });
    if (suggestions.length === MAX_SUGGESTIONS) break;
  }
  if (suggestions.length < 1) {
    throw new Error("Model returned no valid trainer ids");
  }
  return suggestions;
}

/* -------------------------------------------------------------------------- */
/* Deterministic rule-based fallback                                          */
/* -------------------------------------------------------------------------- */

/**
 * Weighted score, clamped to 0-100:
 *   50 * subject match ratio        (matched course subjects / total)
 *   20 * same location              (locationId equality)
 *   15 * (rating ?? 3) / 5          (unrated trainers assumed average)
 *   10 * availability               (1 if an AVAILABLE window covers the
 *                                    date, else 0.5 — unknown, not blocked)
 *    5 * min(pastCourses, 5) / 5    (experience, capped)
 * Ties broken by name then id so the ordering is fully deterministic.
 */
function rankWithRules(
  course: CourseContext,
  candidates: CandidateRow[]
): TrainerSuggestion[] {
  const courseSubjects = course.subjects.map((s) => s.toLowerCase());
  const scored = candidates.map((t) => {
    const matched = t.subjects.filter((s) =>
      courseSubjects.includes(s.toLowerCase())
    );
    const subjectRatio =
      courseSubjects.length > 0 ? matched.length / courseSubjects.length : 0;
    const sameLocation = t.locationId === course.locationId;
    const availableOnDate = hasAvailableWindow(t, course.date);
    const courseCount = t._count.courses;
    const score = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          50 * subjectRatio +
            20 * (sameLocation ? 1 : 0) +
            (15 * (t.rating ?? 3)) / 5 +
            10 * (availableOnDate ? 1 : 0.5) +
            (5 * Math.min(courseCount, 5)) / 5
        )
      )
    );
    return { t, matched, subjectRatio, sameLocation, availableOnDate, score };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.t.name.localeCompare(b.t.name) ||
      a.t.id.localeCompare(b.t.id)
  );

  const date = dateOnly(course.date);
  return scored.slice(0, MAX_SUGGESTIONS).map((s) => ({
    trainerId: s.t.id,
    name: s.t.name,
    confidence: s.score,
    reasoning: buildFallbackReasoning(s, course),
    factors: {
      subject: s.matched.length
        ? `Covers ${s.matched.length} of ${course.subjects.length} course subject(s): ${s.matched.join(", ")}`
        : `No direct overlap with the course subjects (${course.subjects.join(", ")})`,
      location: s.sameLocation
        ? `Based in ${s.t.location.name}, same as the course location`
        : `Based in ${s.t.location.name}; course takes place in ${course.location}`,
      availability: s.availableOnDate
        ? `Has an explicit availability window covering ${date}`
        : `No conflicts on ${date}, but no explicit availability window covers it`,
      experience: `${s.t._count.courses} assigned course(s) on record${
        s.t.rating !== null ? `, rated ${s.t.rating}/5` : ", not yet rated"
      }`,
    },
  }));
}

function buildFallbackReasoning(
  s: {
    t: CandidateRow;
    matched: string[];
    sameLocation: boolean;
    availableOnDate: boolean;
    score: number;
  },
  course: CourseContext
): string {
  const first = s.matched.length
    ? `${s.t.name} matches ${s.matched.length} of ${course.subjects.length} course subject(s) and has no scheduling conflicts on the course date.`
    : `${s.t.name} has no scheduling conflicts on the course date, though their subjects do not directly overlap with the course.`;
  const second = s.sameLocation
    ? `They are based in ${course.location}, avoiding any travel.`
    : `They would travel from ${s.t.location.name}.`;
  const third = s.availableOnDate
    ? "Their availability calendar explicitly covers this date."
    : "";
  return [first, second, third].filter(Boolean).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function hasAvailableWindow(trainer: CandidateRow, date: Date): boolean {
  const t = date.getTime();
  return trainer.availability.some(
    (a) =>
      a.type === "AVAILABLE" &&
      a.startDate.getTime() <= t &&
      a.endDate.getTime() >= t
  );
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}
