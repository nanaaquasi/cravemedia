"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type { SessionUser } from "@/app/api/auth/session/route";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SessionContextType {
  user: SessionUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/session", {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  const data = await res.json();
  return data.user ?? null;
}

function toSessionUserFromAuth(rawUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): SessionUser | null {
  if (!rawUser) return null;
  const metadata = rawUser.user_metadata ?? {};
  return {
    id: rawUser.id,
    email: rawUser.email ?? null,
    full_name:
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      null,
    avatar_url:
      (metadata.avatar_url as string | undefined) ??
      (metadata.picture as string | undefined) ??
      null,
  };
}

export function SessionProvider({
  children,
  initialUser,
}: Readonly<{
  children: ReactNode;
  initialUser?: SessionUser | null;
}>) {
  const [user, setUser] = useState<SessionUser | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(initialUser === undefined);

  const refreshSession = useCallback(async () => {
    try {
      const u = await fetchSession();
      setUser(u);
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    const load = async () => {
      const u = await fetchSession();
      if (!mounted) return;
      // Don't overwrite server initialUser with null—avoids race after OAuth redirect
      // when fetch runs before cookies are fully propagated (can cause ~30s delay)
      if (u !== null || initialUser === null || initialUser === undefined) {
        setUser(u);
      }
      setIsLoading(false);
    };

    // When server already provided user (e.g. after login redirect), use it immediately.
    // Don't block UI waiting for fetch—run load in background for sync.
    if (initialUser !== undefined && initialUser !== null) {
      setIsLoading(false);
    }
    load();

    const handleFocus = () => {
      if (mounted) refreshSession();
    };
    window.addEventListener("focus", handleFocus);

    // React immediately to auth state transitions (sign-in/sign-out/token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(toSessionUserFromAuth(session?.user ?? null));
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
      subscription.unsubscribe();
    };
  }, [refreshSession, initialUser]);

  const contextValue = useMemo(
    () => ({ user, isLoading, refreshSession }),
    [user, isLoading, refreshSession],
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
