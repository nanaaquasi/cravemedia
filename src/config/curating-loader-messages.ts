import type { ContentType } from "@/lib/types";

/** Journey mode — same copy as Ask / search when curating a path */
export const JOURNEY_CURATING_MESSAGES = [
  "Plotting your path through the cosmos...",
  "Mapping the route from start to finish...",
  "Weaving your story, one step at a time...",
  "Sit back—we're crafting your adventure...",
  "Connecting the dots for your perfect journey...",
  "Designing the sequence of your dreams...",
  "Charting your course through the stars...",
  "Building the roadmap to your next obsession...",
] as const;

export const MEDIA_SPECIFIC_CURATING_MESSAGES = {
  movie: [
    "Dimming the lights for your private screening...",
    "Scanning the archives for a cinematic masterpiece...",
    "Casting the leads for your next favorite film...",
    "Reviewing the dailies to find the perfect pick...",
    "Wait for it... the opening credits are starting...",
    "Sifting through the reels for a hidden gem...",
    "Adjusting the lens for your next big adventure...",
    "Scouting locations for a story you'll love...",
  ],
  tv: [
    "Cueing up your next great binge-watch...",
    "Synchronizing with the latest season's best...",
    "Checking the schedule for your next obsession...",
    "Buffering the best plot twists just for you...",
    "Setting the stage for a marathon-worthy series...",
    "Scanning the airwaves for your perfect signal...",
    "Drafting the pilot for your new favorite show...",
    "Ensuring the cliffhanger is worth the wait...",
  ],
  book: [
    "Cracking the spine on a new journey...",
    "Leafing through the shelves for a page-turner...",
    "Dusting off the classics and the bestsellers...",
    "Finding the perfect chapter to get lost in...",
    "Scouring the library for your next great read...",
    "Inking the pages of your upcoming adventure...",
    "Bookmark found. Fetching your next story...",
    "Translating your mood into a literary escape...",
  ],
  anime: [
    "Powering up the search to over 9000...",
    "Syncing the subtitles for your next watch...",
    "Sketching the frames of a new world...",
    "Opening the portal to your next isekai...",
    "Calibrating the spirit energy for your picks...",
    "Scanning the multiverse for top-tier animation...",
    "Choosing a story with a legendary soundtrack...",
    "Rendering the masterpiece you've been waiting for...",
  ],
} as const;

type MediaTypeKey = keyof typeof MEDIA_SPECIFIC_CURATING_MESSAGES;

export function randomCuratingIndex(
  length: number,
  exclude?: number,
): number {
  if (length <= 1) return 0;
  let idx = Math.floor(Math.random() * length);
  if (exclude !== undefined && idx === exclude) {
    idx = (idx + 1) % length;
  }
  return idx;
}

export function getCuratingMessagesForMediaType(
  mediaType: ContentType | ContentType[] | undefined,
): string[] {
  const allMessages = (): string[] =>
    Object.values(MEDIA_SPECIFIC_CURATING_MESSAGES).flatMap((arr) => [...arr]);

  if (!mediaType || mediaType === "all") {
    return allMessages();
  }
  const keys = Array.isArray(mediaType) ? mediaType : [mediaType];
  if (keys.includes("all")) {
    return allMessages();
  }
  const merged = keys.flatMap(
    (k) => MEDIA_SPECIFIC_CURATING_MESSAGES[k as MediaTypeKey] ?? [],
  );
  return merged.length > 0
    ? merged
    : getCuratingMessagesForMediaType("all");
}
