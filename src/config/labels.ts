/**
 * User-facing labels for the Cravelist feature (formerly "Collection").
 * Change these to rebrand without touching individual components.
 */
export const CRAVELIST_LABEL = "Cravelist";
export const CRAVELIST_LABEL_PLURAL = "Cravelists";

export function getCravelistLabel(count: number): string {
  return count === 1 ? CRAVELIST_LABEL : CRAVELIST_LABEL_PLURAL;
}
