import type { LucideIcon } from "lucide-react";
import {
  Heart,
  Lightbulb,
  Clock,
  Users,
  Telescope,
  Popcorn,
} from "lucide-react";
import { SURPRISE_QUERIES } from "./home-sections";

export type SuggestionCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompts: readonly string[];
};

export const SUGGESTION_CATEGORIES: readonly SuggestionCategory[] = [
  {
    id: "feels",
    label: "Feels",
    icon: Heart,
    prompts: [
      "Make me believe in love again",
      "Movies that feel like a warm hug",
      "Anime that will emotionally destroy me",
      "Books that made people say 'I'm not okay'",
      "Stories about found family that hit different",
      "Something bittersweet",
      "I want to ugly cry tonight",
    ],
  },
  {
    id: "discovery",
    label: "Discovery",
    icon: Telescope,
    prompts: [
      "Book-to-screen adaptations better than the book",
      "What's trending but not on Netflix's front page?",
      "Show me something I've never heard of",
      "What's everyone secretly obsessed with?",
      "Shows everyone's talking about at work",
      "What am I missing on HBO Max?",
      "Underrated shows that got cancelled too soon",
      "Best of 2023 I definitely skipped",
      "What am I missing out on?",
      "Sequels that are better than the original",
    ],
  },
  {
    id: "group",
    label: "Watch Party",
    icon: Popcorn,
    prompts: [
      "Movie night with people who can't agree on anything",
      "Something my parents will actually like",
      "Good for a first date",
      "Watch party material",
      "Book club picks that spark discussion",
      "Shows that won't bore my partner",
      "Watch party that won't put anyone to sleep",
      "Show my whole family can watch together",
      "Date night at home",
      "Movies that'll have us arguing for hours",
    ],
  },
  {
    id: "time-based",
    label: "Time-based",
    icon: Clock,
    prompts: [
      "Hook me in 10 minutes or I'm out",
      "I have two hours tonight",
      "Something I can finish in a weekend",
      "Quick episodes I can squeeze in",
      "A movie that's actually under 90 minutes",
      "Short book I can finish this week",
      "One season shows only",
      "Limited series, nothing ongoing",
    ],
  },
  {
    id: "craves-pick",
    label: "Crave's pick",
    icon: Lightbulb,
    prompts: [
      "What are film nerds watching?",
      "Oscar nominees I've been avoiding",
      "Get me into anime",
      "Trashy reality that's actually good",
      "Classic books I should've read by now",
      "Cheesy rom-coms I can laugh at",
      "So bad it's good",
      "Mindless action movies",
      "Reality TV I can binge shame-free",
      "Best of 2024 I definitely missed",
    ],
  },
] as const;
