"use client";

import { ActivityFeed } from "@/components/account/ActivityFeed";
import type { Activity } from "@/components/account/queries";

interface SocialFeedProps {
  activities: Activity[];
}

export function SocialFeed({ activities }: SocialFeedProps) {
  if (activities.length === 0) return null;

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ActivityFeed activities={activities} />
    </section>
  );
}
