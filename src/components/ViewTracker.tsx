"use client";

import { useEffect, useRef } from "react";

interface ViewTrackerProps {
  targetType: string;
  targetId: string;
}

export function ViewTracker({ targetType, targetId }: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    }).catch(() => {});
  }, [targetType, targetId]);

  return null;
}
