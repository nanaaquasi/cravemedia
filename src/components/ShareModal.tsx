"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Check, Copy, Globe, Lock, Share2, Twitter } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  isPublic?: boolean;
  onMakePublic?: () => Promise<void> | void;
  contentType?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  url,
  title,
  isPublic = true,
  onMakePublic,
  contentType = "cravelist",
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isMakingPublic, setIsMakingPublic] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      handleCopy();
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out "${title}" on Craveo!`);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out "${title}" on Craveo! ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleMakePublic = async () => {
    if (!onMakePublic) return;
    setIsMakingPublic(true);
    await onMakePublic();
    setIsMakingPublic(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-6">
        {!isPublic ? (
          <>
            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                This {contentType} is private
              </h2>
              <p className="text-sm text-white/60 max-w-xs">
                Private {contentType}s can&apos;t be shared. Make it public so
                others can view it.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {onMakePublic && (
                <button
                  onClick={handleMakePublic}
                  disabled={isMakingPublic}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white transition-colors cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  {isMakingPublic
                    ? "Updating..."
                    : `Make Public & Share`}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-1">
                Share
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Send this to friends so they can view it.
              </p>
            </div>

            {/* Link box */}
            <div className="flex items-center gap-2 p-1 bg-black/20 border border-white/10 rounded-xl">
              <input
                type="text"
                readOnly
                value={url}
                className="flex-1 bg-transparent border-none text-sm text-[var(--text-secondary)] px-3 py-2 focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white cursor-pointer min-w-[36px]"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/70" />
                )}
              </button>
            </div>

            {/* Share actions */}
            <div className="grid grid-cols-3 gap-3">
              {typeof navigator !== "undefined" &&
                typeof navigator.share === "function" && (
                  <button
                    onClick={handleNativeShare}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-white/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-white/80">
                      Share
                    </span>
                  </button>
                )}

              <button
                onClick={shareToTwitter}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-white/10"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                  <Twitter className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-white/80">
                  X (Twitter)
                </span>
              </button>

              <button
                onClick={shareToWhatsApp}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-white/10"
              >
                <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-white/80">
                  WhatsApp
                </span>
              </button>
            </div>

            {/* Buttons */}
            <div className="flex pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
