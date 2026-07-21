/**
 * Minimal server-only OpenRouter chat-completions client.
 *
 * Deliberately knows nothing about Prisma or trainer matching — it takes a
 * prompt, returns parsed JSON, and handles transport concerns (auth, retry,
 * timeout). AI failures are thrown as plain Error, never ApiError: the caller
 * (suggestionService) treats any throw as "AI unavailable" and falls back to
 * the rule-based scorer, so an OpenRouter outage must never become an HTTP
 * error surface of its own.
 *
 * OPENROUTER_API_KEY / OPENROUTER_MODEL are read from process.env inside the
 * functions (server-side only — this module must never be imported from
 * client code, and the values are never exposed via NEXT_PUBLIC_*).
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
/** Used when OPENROUTER_MODEL is unset; any OpenRouter model id works. */
const DEFAULT_MODEL = "openai/gpt-4o-mini";

/** .env.example ships this placeholder; treat it the same as "no key". */
const PLACEHOLDER_KEY = "sk-or-...";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2; // 3 attempts total
const BASE_BACKOFF_MS = 500; // 500ms -> 1000ms, +/- jitter
const BACKOFF_JITTER_MS = 250;

function apiKey(): string {
  return (process.env.OPENROUTER_API_KEY ?? "").trim();
}

/** True only when a real API key is configured (placeholder/empty = no). */
export function isConfigured(): boolean {
  const key = apiKey();
  return key.length > 0 && key !== PLACEHOLDER_KEY;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Thrown for failures where another attempt cannot help (e.g. 400/401). */
class NonRetryableError extends Error {}

export interface ChatCompletionInput {
  system: string;
  user: string;
}

/**
 * Calls OpenRouter and returns the assistant message content parsed as JSON.
 *
 * Retries up to MAX_RETRIES times with exponential backoff + jitter on
 * 429/5xx/network errors/timeouts. Other 4xx statuses and malformed response
 * bodies fail immediately — retrying a bad request or a model that ignored
 * the JSON instruction just burns latency budget.
 */
export async function chatCompletionJSON(
  input: ChatCompletionInput
): Promise<unknown> {
  if (!isConfigured()) {
    throw new NonRetryableError("OpenRouter API key is not configured");
  }
  const model = (process.env.OPENROUTER_MODEL ?? "").trim() || DEFAULT_MODEL;

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff =
        BASE_BACKOFF_MS * 2 ** (attempt - 1) +
        Math.round((Math.random() * 2 - 1) * BACKOFF_JITTER_MS);
      await sleep(Math.max(0, backoff));
    }
    try {
      return await attemptOnce(model, input);
    } catch (err) {
      if (err instanceof NonRetryableError) throw err;
      lastError = err; // 429/5xx/network/timeout — loop for another attempt
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter request failed");
}

async function attemptOnce(
  model: string,
  input: ChatCompletionInput
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
  } catch (err) {
    // fetch throws on network failure and on abort — both are retryable.
    throw err instanceof Error ? err : new Error("OpenRouter network error");
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429 || response.status >= 500) {
    throw new Error(`OpenRouter responded ${response.status}`);
  }
  if (!response.ok) {
    throw new NonRetryableError(`OpenRouter responded ${response.status}`);
  }

  let content: unknown;
  try {
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    content = body.choices?.[0]?.message?.content;
  } catch {
    throw new NonRetryableError("OpenRouter returned a non-JSON body");
  }
  if (typeof content !== "string" || content.trim() === "") {
    throw new NonRetryableError("OpenRouter response has no message content");
  }
  try {
    // Some models wrap JSON in markdown fences despite response_format.
    const stripped = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    return JSON.parse(stripped);
  } catch {
    throw new NonRetryableError("Model output was not valid JSON");
  }
}
