"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import Toast from "@/components/Toast";
import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";

export function DiscoverHeader() {
  const router = useRouter();
  const { user } = useSession();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchParams = useSearchParams();

  const handleCreateClick = () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/collections/new")}`);
      return;
    }
    router.push("/collections/new");
  };

  // Auto-open create modal when returning from login with ?create=1
  useEffect(() => {
    if (user && searchParams.get("create") === "1") {
      router.push("/collections/new");
    }
  }, [user, searchParams, router]);

  return (
    <>
      <div className="mb-14 w-full md:my-12">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0 max-w-3xl flex-1">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
              Discover
            </h1>
            <p className="text-zinc-400 text-base md:text-lg">
              Browse community cravelists and journeys from other creators.
            </p>
            <button
              type="button"
              onClick={handleCreateClick}
              className="mt-3 inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-transparent rounded cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              Create your own
            </button>
          </div>
          <div className="w-full shrink-0 md:w-[min(100%,22rem)] lg:w-[min(100%,26rem)]">
            <DiscoverSearchBar />
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </>
  );
}
