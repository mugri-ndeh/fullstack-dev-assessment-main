import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export interface User {
  id: string;
  username: string;
  displayName: string;
}

/**
 * Client-side session info. The middleware is the actual security boundary —
 * this hook only fetches who is logged in for display, and provides signOut.
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUser(data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Even if the request failed, drop to /login — middleware re-checks anyway.
      router.push("/login");
    }
  };

  return { user, isLoading, signOut };
}
