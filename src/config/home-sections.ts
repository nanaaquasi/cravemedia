export const FEATURED_AUTOSCROLL_INTERVAL_MS = 5000;

export const MOOD_CARDS = [
  {
    label: "Cozy",
    query: "cozy comfort watch",
    gradient:
      "radial-gradient(ellipse 80% 70% at 30% 70%, #3d2a1a 0%, #2c1f14 40%, #1a1510 100%)",
  },
  {
    label: "Chaotic",
    query: "chaotic unhinged energy",
    gradient:
      "radial-gradient(ellipse 80% 70% at 70% 30%, #4a1a1a 0%, #2d1515 40%, #1a0f0f 100%)",
  },
  {
    label: "Nostalgic",
    query: "nostalgic 90s vibes",
    gradient:
      "radial-gradient(ellipse 80% 70% at 50% 50%, #3d2e1a 0%, #2a2215 40%, #1a1610 100%)",
  },
  {
    label: "Mind-bending",
    query: "mind-bending sci-fi thriller",
    gradient:
      "radial-gradient(ellipse 80% 70% at 70% 30%, #2b2a48 0%, #1e1d35 40%, #151420 100%)",
  },
  {
    label: "Emotional",
    query: "movies that will make me cry",
    gradient:
      "radial-gradient(ellipse 80% 70% at 30% 50%, #2b2b48 0%, #1e1e35 40%, #151520 100%)",
  },
  {
    label: "Dark",
    query: "dark twisted thriller",
    gradient:
      "radial-gradient(ellipse 80% 70% at 50% 80%, #2c3134 0%, #1f2326 40%, #141618 100%)",
  },
  {
    label: "Romantic",
    query: "romantic but not cheesy",
    gradient:
      "radial-gradient(ellipse 80% 70% at 70% 60%, #3d2a35 0%, #2a1e25 40%, #1a1418 100%)",
  },
  {
    label: "Hilarious",
    query: "actually funny comedy",
    gradient:
      "radial-gradient(ellipse 80% 70% at 30% 30%, #3d3520 0%, #2a2518 40%, #1a1810 100%)",
  },
  {
    label: "Intense",
    query: "edge-of-your-seat intense",
    gradient:
      "radial-gradient(ellipse 80% 70% at 50% 20%, #3d1a1a 0%, #2a1515 40%, #1a0f0f 100%)",
  },
  {
    label: "Inspiring",
    query: "inspiring feel-good",
    gradient:
      "radial-gradient(ellipse 80% 70% at 50% 50%, #3d3218 0%, #2a2412 40%, #1a1810 100%)",
  },
  {
    label: "Creepy",
    query: "creepy atmospheric horror",
    gradient:
      "radial-gradient(ellipse 80% 70% at 30% 80%, #1a2a2a 0%, #151f1f 40%, #0f1818 100%)",
  },
  {
    label: "Wholesome",
    query: "wholesome heartwarming",
    gradient:
      "radial-gradient(ellipse 80% 70% at 50% 50%, #1a2a22 0%, #151f1a 40%, #0f1814 100%)",
  },
  {
    label: "Gritty",
    query: "gritty raw drama",
    gradient:
      "radial-gradient(ellipse 80% 70% at 60% 70%, #2a2520 0%, #1f1b18 40%, #151210 100%)",
  },
  {
    label: "Escapist",
    query: "pure escapist fantasy",
    gradient:
      "radial-gradient(ellipse 80% 70% at 30% 30%, #2b3b48 0%, #1e2a35 40%, #151a20 100%)",
  },
] as const;

export const SURPRISE_QUERIES = [
  "Give me something I've never heard of",
  "Something that will ruin my sleep schedule",
  "Unhinged but in a good way",
  "Mind-bending sci-fi that will break my brain",
  "Hidden gems nobody talks about",
  "Movies like The Matrix but weirder",
] as const;

export const WHY_DIFFERENT_ROWS = [
  {
    category: "Multimedia",
    other:
      "Letterboxd = movies. Goodreads = books. Trakt = TV + movies. Separate apps for each.",
    crave:
      "Movies, TV, books, and anime in one place. One search, one list, one journey.",
  },
  {
    category: "Recommendations",
    other:
      "Browse lists, trending, or \"similar to.\" You hunt; the app suggests.",
    crave:
      "Tell us what you feel. Natural language prompts—\"cozy comfort watch,\" \"mind-bending sci-fi\"—get tailored picks.",
  },
  {
    category: "Organization",
    other: "Infinite lists. Manual sorting. No clear path.",
    crave:
      "Journeys: sequenced picks with a start and finish. Each item builds on the last.",
  },
  {
    category: "Learning",
    other: "Log it, rate it, move on. No context.",
    crave:
      "Transitions explain why each pick follows the last. Themes and connections, not just titles.",
  },
  {
    category: "Social",
    other: "Platform-specific. Share within Letterboxd, Goodreads, or Trakt.",
    crave:
      "Share Cravelists, clone others', discover what fellow cravers curate—across all media types.",
  },
  {
    category: "Commitment",
    other: "Never-ending queues. No completion.",
    crave:
      "Finite journeys. \"8 films, you got this.\" Finish and feel it.",
  },
] as const;
