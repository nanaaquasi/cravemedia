const STORAGE_KEYS = {
  SESSION: "supabase_session",
  APP_URL: "app_url",
} as const;

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const { [STORAGE_KEYS.SESSION]: raw } = await chrome.storage.local.get(
    STORAGE_KEYS.SESSION,
  );
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed?.access_token
      ? {
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token ?? "",
          expires_at: parsed.expires_at,
        }
      : null;
  } catch {
    return null;
  }
}

/** Raw session string for Supabase auth storage adapter */
export async function getStoredSessionRaw(): Promise<string | null> {
  const { [STORAGE_KEYS.SESSION]: raw } = await chrome.storage.local.get(
    STORAGE_KEYS.SESSION,
  );
  return typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : null;
}

export async function setStoredSessionRaw(value: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: value });
}

export async function clearStoredSession(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.SESSION);
}

export async function getAppUrl(): Promise<string> {
  const { [STORAGE_KEYS.APP_URL]: url } = await chrome.storage.local.get(
    STORAGE_KEYS.APP_URL,
  );
  return url ?? "";
}

export async function setAppUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.APP_URL]: url });
}
