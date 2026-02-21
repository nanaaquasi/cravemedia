# Journey Architecture & Vision

## Overview

**Journeys** are AI-curated, sequential media experiences. Unlike Cravelists (user-curated lists), journeys have a narrative arc: each item builds on the last, with transitions explaining "why next." They're designed for discovery and commitment—"I'm going to watch these 10 films in this order."

This doc covers how we track journey progress, how it feeds into stats, and how to make the feature engaging.

---

## Data Model: Three Ways to Track "Watched"

| Source | Purpose | Stats? |
|--------|---------|--------|
| **Journey progress** | Items marked watched within a saved journey | ✅ Yes |
| **Cravelist items** | User-curated lists with watch status | ✅ Yes |
| **Episode progress** | Per-episode TV tracking | ✅ Yes |

All three feed into `user_stats` (total items watched, total hours). We avoid double-counting by treating each as a distinct "source of truth" for that context.

---

## Journey Lifecycle

1. **Explore** → User gets AI journey (search). No DB yet. Progress in localStorage only.
2. **Save** → Journey + `journey_progress` rows created. User can now mark items watched → DB.
3. **In progress** → User marks items. `journey_progress.status` = `completed`, `journeys.status` = `in_progress`.
4. **Complete** → Last item marked → `journeys.status` = `completed`. Optional: rate journey.

---

## Stats Flow

### What we track

- **total_items_watched** = journey_progress (completed) + collection_items (watched) + episode_progress (watched)
- **total_hours_watched** = sum of runtimes from all three
- **total_journeys_completed** = journeys with status `completed`
- **total_journeys_in_progress** = journeys with status `in_progress`
- **average_journey_rating** = avg of journey overall_rating
- **journey_completion_rate** = completed / (completed + abandoned) × 100

### Double-counting

If a user adds the same movie to both a Cravelist and a Journey and marks it watched in both, it counts twice. That's intentional: they experienced it in two contexts (standalone list + curated sequence). We could dedupe by `media_id` later if we want stricter stats.

---

## Journey Items: What to Store

Each `journey_progress` row stores:

- `journey_id`, `user_id`, `item_position`
- `item_title`, `item_year`, `item_runtime_minutes` (denormalized for stats)
- `status`: `locked` | `available` | `current` | `completed` | `skipped`
- `item_rating`, `review_text`, `completed_at`

Runtime comes from the enriched journey item (`runtime` string → `item_runtime_minutes`). If missing, we could fall back to TMDB lookup or a default (e.g. 90 min for movies).

---

## What Makes Journeys Interesting

### For users

1. **Commitment** — "I'm doing this 10-film journey." Progress bar and completion feel rewarding.
2. **Sequence** — Transitions explain why each pick follows the last. Learning, not just watching.
3. **Discovery** — AI suggests paths they wouldn't have found.
4. **Social** — Share journeys, clone others', see "Found in X journeys" on media pages.

### For the platform

1. **Engagement** — Streaks, completion rate, journey ratings.
2. **Differentiation** — Curated sequences vs. flat lists.
3. **Data** — Which journeys complete, which get abandoned, which sequences rate well.

### Future ideas

- **Journey templates** — "Intro to Noir," "Kurosawa essentials" — pre-built, forkable.
- **Branching** — "If you liked X, take path A; else path B."
- **Badges** — "Completed first journey," "10 journeys completed."
- **Recommendations** — "Based on journeys you completed, try…"

---

## Implementation Notes

- **Saved journeys only** — DB progress exists only after save. Before save, use localStorage.
- **journeyId** — UUID = saved (use DB). Slug = unsaved (use localStorage).
- **Triggers** — `on_item_completed` on `journey_progress` fires activities and `update_user_stats`.
- **Clone** — Cloning creates new journey; new owner gets fresh `journey_progress` on first interaction (or we could seed on clone).
