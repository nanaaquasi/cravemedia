import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import {
  getStoredSessionRaw,
  setStoredSessionRaw,
  clearStoredSession,
} from "./storage";

export function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: {
        getItem: async (key: string) => {
          if (key.includes("session") || key.includes("auth")) {
            return await getStoredSessionRaw();
          }
          return null;
        },
        setItem: async (key: string, value: string) => {
          if (key.includes("session") || key.includes("auth")) {
            await setStoredSessionRaw(value);
          }
        },
        removeItem: async () => {
          await clearStoredSession();
        },
      },
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
