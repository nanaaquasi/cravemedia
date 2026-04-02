"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DURATION = 14 * 24 * 60 * 60 * 1000; // 14 days
const ENGAGEMENT_THRESHOLD = 2; // pages visited before showing

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone)
  );
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [engaged, setEngaged] = useState(false);

  // Track page engagement
  useEffect(() => {
    const count = parseInt(sessionStorage.getItem("pwa-page-views") || "0", 10) + 1;
    sessionStorage.setItem("pwa-page-views", String(count));
    if (count >= ENGAGEMENT_THRESHOLD) setEngaged(true);
  }, []);

  // Check if dismissed recently
  const isDismissed = useCallback(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    return Date.now() - parseInt(dismissed, 10) < DISMISS_DURATION;
  }, []);

  // Listen for beforeinstallprompt (Chrome / Edge / Android)
  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isDismissed]);

  // Show the prompt once engagement threshold is met
  useEffect(() => {
    if (!engaged || isDismissed() || isStandalone()) return;

    if (deferredPrompt) {
      // Android / Desktop Chrome
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    } else if (isIOS()) {
      // iOS Safari — show manual instructions
      const timer = setTimeout(() => setShowIOSGuide(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [engaged, deferredPrompt, isDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowPrompt(false);
    setShowIOSGuide(false);
  };

  return (
    <AnimatePresence>
      {/* Android / Desktop install prompt */}
      {showPrompt && (
        <motion.div
          key="install-prompt"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[9999]"
        >
          <div className="liquid-glass-strong rounded-[var(--radius-xl)] p-5">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-gradient)" }}>
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                  Install Craveo
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  Get the full experience — faster loads, offline access, and native feel.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleInstall}
                    className="flex-1 py-2.5 px-4 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-95"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="py-2.5 px-4 rounded-full text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* iOS guide */}
      {showIOSGuide && (
        <motion.div
          key="ios-guide"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[9999]"
        >
          <div className="liquid-glass-strong rounded-[var(--radius-xl)] p-5">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-gradient)" }}>
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                  Add Craveo to Home Screen
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
                  Install the app for instant access and offline support.
                </p>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Share className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0" />
                    <span>
                      Tap the <strong className="text-[var(--text-primary)]">Share</strong> button
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0" />
                    <span>
                      Tap{" "}
                      <strong className="text-[var(--text-primary)]">Add to Home Screen</strong>
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="mt-4 w-full py-2.5 px-4 rounded-full text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
