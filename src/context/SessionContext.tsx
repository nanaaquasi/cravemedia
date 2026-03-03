"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/app/api/auth/session/route";

interface SessionContextType {
  user: SessionUser | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/session");
  const data = await res.json();
  return data.user ?? null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const u = await fetchSession();
      if (mounted) setUser(u);
      if (mounted) setIsLoading(false);
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        return;
      }
      const u = await fetchSession();
      setUser(u);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SessionContext.Provider value={{ user, isLoading }}>
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
