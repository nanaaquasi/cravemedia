"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { SessionUser } from "@/app/api/auth/session/route";

interface SessionContextType {
  user: SessionUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  const data = await res.json();
  return data.user ?? null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const u = await fetchSession();
    setUser(u);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const u = await fetchSession();
      if (mounted) setUser(u);
      if (mounted) setIsLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{ user, isLoading, refreshSession }}
    >
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
