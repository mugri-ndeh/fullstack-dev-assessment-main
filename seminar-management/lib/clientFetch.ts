// Small client-side fetch wrapper: parses the API's { error, details? }
// envelope and never throws on HTTP errors — callers branch on `ok`.

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  details: unknown;
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.body
        ? { "Content-Type": "application/json", ...init?.headers }
        : init?.headers,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: body?.error ?? `Request failed (${res.status})`,
        details: body?.details,
      };
    }
    return { ok: true, status: res.status, data: body as T, error: null, details: null };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Network error. Is the server running?",
      details: null,
    };
  }
}
