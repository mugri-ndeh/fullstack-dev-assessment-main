import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/clientFetch";

export interface Location {
  id: string;
  name: string;
}

/**
 * The selectable locations. Shared by the course and trainer forms so both
 * dropdowns are fed from the same reference data.
 *
 * `error` matters: if the list can't load, the form must say so rather than
 * render an empty select that looks like "no locations exist".
 *
 * `refresh` lets a caller that just created a location pull the new list
 * without a page reload.
 */
export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    apiFetch<{ locations: Location[] }>("/api/locations")
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) setLocations(res.data.locations);
        else setError(res.error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { locations, isLoading, error, refresh };
}
