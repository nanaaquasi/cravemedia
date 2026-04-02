import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionUser } from "@/app/api/auth/session/route";

/** One Supabase auth + profile read per request (deduped across layout + pages). */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  return resolveSessionUser(supabase);
});
