/**
 * OAuth callback page. For Google sign-in, Supabase redirects here.
 * The hash contains the session tokens. We parse them and close the tab.
 */
import { createSupabaseClient } from "./lib/supabase";

document.addEventListener("DOMContentLoaded", async () => {
  const hash = window.location.hash;
  if (!hash) {
    document.body.innerHTML = "<p>No auth data received. You can close this tab.</p>";
    return;
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.getSession();

  if (error) {
    document.body.innerHTML = `<p>Sign in failed: ${error.message}</p>`;
    return;
  }

  document.body.innerHTML = "<p>Signed in! Closing...</p>";
  window.close();
});
