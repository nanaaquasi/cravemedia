"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function NetworkStatusIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {/* Offline banner */}
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9998]"
        >
          <div className="bg-amber-500/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-950" />
            <span className="text-sm font-medium text-amber-950">
              You&apos;re offline — some features may be limited
            </span>
          </div>
        </motion.div>
      )}

      {/* Back online toast */}
      {isOnline && wasOffline && (
        <motion.div
          key="online-toast"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9998]"
        >
          <div className="bg-emerald-500/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-950" />
            <span className="text-sm font-medium text-emerald-950">
              You&apos;re back online
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
