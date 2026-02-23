import { getStoredSession, getAppUrl } from "./storage";
import { DEFAULT_APP_URL } from "./config";

export interface SavedList {
  id: string;
  name: string;
  description: string;
  items: Array<{
    title: string;
    creator: string;
    year: number;
    type: string;
    posterUrl: string | null;
    externalId: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
  isJourney?: boolean;
}

export interface ListsResponse {
  lists: SavedList[];
  error?: string;
}

export async function fetchLists(): Promise<ListsResponse> {
  const session = await getStoredSession();
  if (!session?.access_token) {
    return { lists: [] };
  }

  const appUrl = (await getAppUrl()) || DEFAULT_APP_URL;
  const url = `${appUrl.replace(/\/$/, "")}/api/lists`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        response.status === 401
          ? "Session expired. Sign out and sign in again."
          : data.error || `Request failed (${response.status})`;
      return { lists: [], error: msg };
    }

    return { lists: data.lists || [] };
  } catch (err) {
    const msg =
      err instanceof TypeError && err.message === "Failed to fetch"
        ? "Cannot reach the app. Check that Site URL is correct and the app is running."
        : err instanceof Error
          ? err.message
          : "Failed to fetch lists";
    return { lists: [], error: msg };
  }
}
