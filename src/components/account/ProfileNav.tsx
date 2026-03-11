"use client";

import {
  LayoutGrid,
  Clock,
  BookOpen,
  Bell,
  User,
  Map,
  Activity,
  BarChart,
  Heart,
} from "lucide-react";

interface ProfileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ProfileNav({ activeTab, onTabChange }: ProfileNavProps) {
  const tabs = [
    { id: "Overview", label: "Overview", icon: LayoutGrid },
    { id: "Favorites", label: "Favorites", icon: Heart },
    { id: "Journeys", label: "Journeys", icon: Map },
    { id: "Collections", label: "Cravelists", icon: BookOpen },
    { id: "Activity", label: "Activity", icon: Activity },
    // { id: "WatchList", label: "WatchList", icon: Clock },
    // { id: "Stats", label: "Stats", icon: BarChart },
  ];

  return (
    <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-4 pt-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-2.5 md:px-5 py-2.5 rounded-2xl text-sm font-medium transition-all whitespace-nowrap
              ${
                isActive
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-lg shadow-black/20"
                  : "bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent"
              }
            `}
          >
            <Icon
              className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-zinc-500"}`}
            />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
