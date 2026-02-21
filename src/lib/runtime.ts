/** Parse runtime string to minutes (e.g. "130 min" -> 130, "2h 30m" -> 150) */
export function parseRuntimeMinutes(
  runtime: string | null | undefined,
): number | null {
  if (!runtime || typeof runtime !== "string") return null;
  const s = runtime.trim().toLowerCase();
  const minMatch = /(\d+)\s*min/.exec(s);
  if (minMatch) return Number.parseInt(minMatch[1], 10);
  const hourMatch = /(\d+)\s*h/.exec(s);
  const minPart = /(\d+)\s*m/.exec(s);
  if (hourMatch) {
    const hours = Number.parseInt(hourMatch[1], 10);
    const mins = minPart ? Number.parseInt(minPart[1], 10) : 0;
    return hours * 60 + mins;
  }
  if (minPart) return Number.parseInt(minPart[1], 10);
  const pagesMatch = /(\d+)\s*pages?/i.exec(s);
  if (pagesMatch) return Number.parseInt(pagesMatch[1], 10) * 2; // ~2 min/page estimate
  return null;
}
