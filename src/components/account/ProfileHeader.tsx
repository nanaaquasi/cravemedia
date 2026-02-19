import { Profile } from "@/lib/supabase/types";
import Image from "next/image";
import { Settings } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";

interface ProfileHeaderProps {
  profile: Profile | null;
  email?: string;
  stats: {
    followers: number;
    following: number;
  };
}

export function ProfileHeader({ profile, email, stats }: ProfileHeaderProps) {
  return (
    <div className="relative h-[120px] md:h-[160px] w-full bg-zinc-900/20 rounded-3xl overflow-hidden group mb-10 bg-center bg-[url('https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/zo8CIjJ2nfNOevqNajwMRO6Hwka.jpg')]">
      {/* Background Image with Overlay */}

      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-4 md:px-6 lg:px-8 xl:px-10 gap-6">
        {/* Avatar Circle */}
        <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full p-1 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
          <div className="w-full h-full rounded-full overflow-hidden relative bg-zinc-800">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white">
                {profile?.full_name?.charAt(0) ||
                  email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="flex flex-col justify-center">
          <h1 className="text-xl md:text-2xl font-bold text-white leading-tight mb-1">
            {profile?.full_name || "Anonymous User"}
          </h1>

          <div className="flex items-center gap-4 text-sm">
            <p className="text-zinc-400">
              <span className="text-white font-bold">
                {stats.followers > 999
                  ? (stats.followers / 1000).toFixed(1) + "k"
                  : stats.followers}
              </span>{" "}
              followers
            </p>
            <p className="text-zinc-400">
              <span className="text-white font-bold">
                {stats.following > 999
                  ? (stats.following / 1000).toFixed(1) + "k"
                  : stats.following}
              </span>{" "}
              following
            </p>
          </div>
        </div>

        {/* Settings & Logout Actions (pushed to right) */}
        <div className="ml-auto flex items-center gap-2">
          <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors backdrop-blur-sm">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
