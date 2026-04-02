"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

export default function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const handleUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    setShowUpdate(false);
    // Reload after the new SW takes over
    setTimeout(() => window.location.reload(), 500);
  }, [registration]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const checkForUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);

        // If there's already a waiting worker, show the prompt
        if (reg.waiting) {
          setShowUpdate(true);
          return;
        }

        // Listen for new service workers
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // A new SW is installed and waiting to activate
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
      } catch {
        // Service worker not registered yet — skip
      }
    };

    checkForUpdate();

    // Also listen for controller change (another tab updated)
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!showUpdate) return;
    const timer = setTimeout(() => setShowUpdate(false), 30000);
    return () => clearTimeout(timer);
  }, [showUpdate]);

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          key="update-prompt"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-[9999]"
          style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="liquid-glass-strong rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-gradient)" }}
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  A new version is available
                </p>
              </div>
              <button
                onClick={handleUpdate}
                className="py-1.5 px-4 rounded-full text-xs font-semibold text-white transition-all duration-200 hover:scale-[1.03] active:scale-95 flex-shrink-0"
                style={{ background: "var(--accent-gradient)" }}
              >
                Update
              </button>
              <button
                onClick={() => setShowUpdate(false)}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
