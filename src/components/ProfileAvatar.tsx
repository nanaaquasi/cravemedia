"use client";

import { useState, type ReactNode } from "react";

/**
 * User/profile photos from the DB can point at Supabase Storage, OAuth CDNs, etc.
 * Using next/image requires every hostname in remotePatterns; plain <img> avoids that
 * and we fall back to initials on error.
 */
type ProfileAvatarProps = Readonly<{
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: ReactNode;
}>;

export function ProfileAvatar({
  src,
  alt,
  className,
  fallback,
}: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  if (!src?.trim() || failed) {
    return <>{fallback}</>;
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
