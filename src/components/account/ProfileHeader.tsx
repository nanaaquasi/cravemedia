import { Profile } from "@/lib/supabase/types";
import Image from "next/image";
import { Settings } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { FollowButton } from "@/components/FollowButton";

interface ProfileHeaderProps {
  profile: Profile | null;
  email?: string;
  stats: {
    followers: number;
    following: number;
  };
  isNewUser?: boolean;
  /** When set, show Follow button instead of SignOut (public profile view) */
  isPublicProfile?: boolean;
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean, newCount: number) => void;
}

export function ProfileHeader({
  profile,
  email,
  stats,
  isNewUser,
  isPublicProfile,
  isFollowing = false,
  onFollowChange,
}: ProfileHeaderProps) {
  return (
    <div className="relative min-h-[200px] md:h-[160px] w-full bg-zinc-900/20 rounded-3xl overflow-hidden group mb-10 bg-center bg-[url('https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/zo8CIjJ2nfNOevqNajwMRO6Hwka.jpg')]">
      {/* Background Image with Overlay */}

      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 min-h-full flex flex-col md:flex-row items-center md:items-center py-6 md:py-0 px-4 md:px-6 lg:px-8 xl:px-10 gap-4 md:gap-6">
        {/* Avatar Circle */}
        <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full p-1 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
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
        <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2 mb-1 flex-wrap justify-center md:justify-start">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
              {profile?.full_name || "Anonymous User"}
            </h1>
            {isNewUser && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/30 text-purple-200 border border-purple-500/40">
                Welcome!
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm justify-center md:justify-start">
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

        {/* Actions (pushed to right on desktop) */}
        <div className="mt-2 md:mt-0 md:ml-auto flex items-center justify-center md:justify-end gap-2">
          {isPublicProfile && profile ? (
            <FollowButton
              userId={profile.id}
              initialIsFollowing={isFollowing}
              initialFollowersCount={stats.followers}
              onFollowChange={onFollowChange}
            />
          ) : (
            <>
              <button className="hidden p-2 rounded-full bg-black/20 hover:bg-black/40 border border-white/5 text-zinc-400 hover:text-white transition-all">
                <Settings className="w-5 h-5" />
              </button>
              <SignOutButton />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
