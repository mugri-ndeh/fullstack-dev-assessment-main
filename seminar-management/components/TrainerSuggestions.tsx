import { useCallback, useEffect, useState } from "react";

// Built strictly against the API contract:
//   POST /api/trainers/suggest        { courseId } -> SuggestResponse
//   PUT  /api/courses/:id             { trainerId, overrideConflicts? }
// Errors always arrive as { error: string, details?: unknown }; a 409 on the
// PUT carries details.conflicts: [{ type, message, conflictingCourse? }].

interface SuggestionFactors {
  subject: string;
  location: string;
  availability: string;
  experience: string;
}

interface TrainerSuggestion {
  trainerId: string;
  name: string;
  confidence: number;
  reasoning: string;
  factors: SuggestionFactors;
}

interface SuggestResponse {
  courseId: string;
  source: "ai" | "fallback";
  fallbackReason?: string;
  cached: boolean;
  generatedAt: string;
  suggestions: TrainerSuggestion[];
}

interface AssignConflict {
  type: string;
  message: string;
  conflictingCourse?: unknown;
}

interface TrainerSuggestionsProps {
  courseId: string;
  onAssigned?: (trainerId: string) => void;
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: SuggestResponse };

// Pull a human-readable message out of the { error, details? } envelope
// without trusting the response body to be well-formed JSON.
const readErrorMessage = async (res: Response): Promise<string> => {
  try {
    const body: unknown = await res.json();
    if (
      body &&
      typeof body === "object" &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
  } catch {
    // Non-JSON body (proxy error page, empty body, …) — fall through.
  }
  return `Request failed (${res.status})`;
};

const FACTOR_LABELS: Array<{ key: keyof SuggestionFactors; label: string }> = [
  { key: "subject", label: "Subject" },
  { key: "location", label: "Location" },
  { key: "availability", label: "Availability" },
  { key: "experience", label: "Experience" },
];

// Self-contained ranked-trainer-suggestions panel. Fetches suggestions for the
// given course on mount (session cookie rides along automatically) and owns
// the full assign flow including the 409 conflict-override confirmation.
const TrainerSuggestions = ({ courseId, onAssigned }: TrainerSuggestionsProps) => {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  // Bumped by the Retry button to re-run the fetch effect.
  const [fetchAttempt, setFetchAttempt] = useState(0);
  // trainerId currently being assigned (disables all Assign buttons).
  const [assigningId, setAssigningId] = useState<string | null>(null);
  // Pending 409: conflicts to confirm before retrying with overrideConflicts.
  const [pendingConflicts, setPendingConflicts] = useState<{
    trainerId: string;
    conflicts: AssignConflict[];
  } | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignedId, setAssignedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setAssigningId(null);
    setPendingConflicts(null);
    setAssignError(null);
    setAssignedId(null);

    (async () => {
      try {
        const res = await fetch("/api/trainers/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: await readErrorMessage(res) });
          return;
        }
        const data = (await res.json()) as SuggestResponse;
        if (cancelled) return;
        setState({ status: "ready", data });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Could not reach the server. Please try again.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, fetchAttempt]);

  const assign = useCallback(
    async (trainerId: string, overrideConflicts: boolean) => {
      setAssigningId(trainerId);
      setAssignError(null);
      try {
        const res = await fetch(`/api/courses/${courseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            overrideConflicts ? { trainerId, overrideConflicts: true } : { trainerId }
          ),
        });

        if (res.ok) {
          setPendingConflicts(null);
          setAssignedId(trainerId);
          onAssigned?.(trainerId);
          return;
        }

        if (res.status === 409) {
          let conflicts: AssignConflict[] = [];
          try {
            const body: unknown = await res.json();
            const details = (body as { details?: { conflicts?: unknown } })
              ?.details;
            if (Array.isArray(details?.conflicts)) {
              conflicts = (details.conflicts as unknown[]).filter(
                (c): c is AssignConflict =>
                  !!c &&
                  typeof c === "object" &&
                  typeof (c as { message?: unknown }).message === "string"
              );
            }
          } catch {
            // Malformed 409 body — fall through to generic conflict notice.
          }
          setPendingConflicts({
            trainerId,
            conflicts:
              conflicts.length > 0
                ? conflicts
                : [
                    {
                      type: "UNKNOWN",
                      message: "A scheduling conflict was detected for this trainer.",
                    },
                  ],
          });
          return;
        }

        setAssignError(await readErrorMessage(res));
      } catch {
        setAssignError("Could not reach the server. Please try again.");
      } finally {
        setAssigningId(null);
      }
    },
    [courseId, onAssigned]
  );

  // ---- Loading (LLM calls can take tens of seconds) ----------------------
  if (state.status === "loading") {
    return (
      <div className="bg-surface border border-line rounded-lg shadow p-4">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <p className="text-sm text-fg-muted">
            Finding the best trainers for this course… AI matching can take up
            to a minute.
          </p>
        </div>
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-line rounded-lg p-4">
              <div className="h-4 bg-surface-hover rounded w-1/3 mb-3"></div>
              <div className="h-2 bg-surface-hover rounded-full w-full mb-3"></div>
              <div className="h-3 bg-surface-muted rounded w-5/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Error -------------------------------------------------------------
  if (state.status === "error") {
    return (
      <div className="bg-danger-soft border border-danger-line rounded-lg shadow p-4">
        <p className="text-sm text-danger-ink mb-3">{state.message}</p>
        <button
          onClick={() => setFetchAttempt((n) => n + 1)}
          className="px-4 py-2 bg-primary hover:bg-primary text-white text-sm rounded-lg shadow-md transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { data } = state;

  // ---- Empty -------------------------------------------------------------
  if (data.suggestions.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-lg shadow p-4">
        <p className="text-sm text-fg-muted">
          No suitable trainers found for this course.
        </p>
      </div>
    );
  }

  // ---- Ranked suggestions ------------------------------------------------
  return (
    <div className="bg-surface border border-line rounded-lg shadow p-4 space-y-3">
      {data.source === "fallback" && (
        <div className="bg-warning-soft border border-warning-line text-warning-ink text-sm rounded-lg p-3">
          <p className="font-semibold">
            AI matching unavailable — showing rule-based suggestions instead.
          </p>
          {data.fallbackReason && <p className="mt-1">{data.fallbackReason}</p>}
        </div>
      )}

      {assignError && (
        <div className="bg-danger-soft border border-danger-line text-danger-ink text-sm rounded-lg p-3">
          {assignError}
        </div>
      )}

      {data.suggestions.map((suggestion, index) => {
        const confidence = Math.max(0, Math.min(100, suggestion.confidence));
        const isAssigned = assignedId === suggestion.trainerId;
        const hasPendingConflict =
          pendingConflicts?.trainerId === suggestion.trainerId;

        return (
          <div
            key={suggestion.trainerId}
            className="border border-line rounded-lg p-4 transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-fg">
                  <span className="text-fg-subtle mr-2">#{index + 1}</span>
                  {suggestion.name}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-40 bg-surface-hover rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                      style={{ width: `${confidence}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-fg-muted">
                    {confidence}% match
                  </span>
                </div>
              </div>
              {isAssigned ? (
                <span className="shrink-0 px-4 py-2 bg-success-soft text-success-ink text-sm font-medium rounded-lg">
                  Assigned
                </span>
              ) : (
                <button
                  onClick={() => assign(suggestion.trainerId, false)}
                  disabled={assigningId !== null}
                  className="shrink-0 px-4 py-2 bg-primary hover:bg-primary disabled:bg-surface-hover disabled:cursor-not-allowed text-white text-sm rounded-lg shadow-md transition"
                >
                  {assigningId === suggestion.trainerId ? "Assigning…" : "Assign"}
                </button>
              )}
            </div>

            <p className="text-sm text-fg-muted mt-3">{suggestion.reasoning}</p>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3">
              {FACTOR_LABELS.map(({ key, label }) => (
                <div key={key} className="flex text-xs">
                  <dt className="w-20 shrink-0 font-medium text-fg-muted">
                    {label}
                  </dt>
                  <dd className="text-fg">{suggestion.factors[key]}</dd>
                </div>
              ))}
            </dl>

            {hasPendingConflict && pendingConflicts && (
              <div className="mt-3 bg-warning-soft border border-warning-line rounded-lg p-3">
                <p className="text-sm font-semibold text-warning-ink mb-2">
                  Scheduling conflicts detected:
                </p>
                <ul className="list-disc list-inside text-sm text-warning-ink space-y-1 mb-3">
                  {pendingConflicts.conflicts.map((conflict, i) => (
                    <li key={i}>{conflict.message}</li>
                  ))}
                </ul>
                <div className="flex space-x-2">
                  <button
                    onClick={() => assign(suggestion.trainerId, true)}
                    disabled={assigningId !== null}
                    className="px-4 py-2 bg-warning hover:bg-warning-hover disabled:bg-surface-hover disabled:cursor-not-allowed text-warning-fg text-sm rounded-lg shadow-md transition"
                  >
                    Assign anyway
                  </button>
                  <button
                    onClick={() => setPendingConflicts(null)}
                    disabled={assigningId !== null}
                    className="px-4 py-2 bg-surface border border-line-strong hover:bg-surface-muted disabled:cursor-not-allowed text-fg text-sm rounded-lg shadow-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-fg-subtle">
        {data.source === "ai" ? "AI-generated" : "Rule-based"} suggestions
        {data.cached ? " (cached)" : ""} · confidence reflects relative ranking,
        not a guarantee.
      </p>
    </div>
  );
};

export default TrainerSuggestions;
