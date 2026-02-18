"use client";

export default function SkeletonList() {
  return (
    <div className="space-y-1 mt-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 rounded-xl animate-fade-in-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Cover skeleton */}
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg animate-shimmer flex-shrink-0" />

          {/* Text skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 max-w-[60%] rounded-md animate-shimmer" />
            <div className="h-3 w-32 max-w-[40%] rounded-md animate-shimmer" />
          </div>

          {/* Action skeleton */}
          <div className="flex gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-full animate-shimmer" />
            <div className="w-6 h-6 rounded-full animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
