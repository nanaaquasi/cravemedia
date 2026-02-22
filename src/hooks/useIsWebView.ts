"use client";

import { useMemo } from "react";

/**
 * User agent patterns for in-app browsers where Google OAuth returns
 * Error 403: disallowed_useragent (Google's "Use secure browsers" policy).
 */
const WEBVIEW_PATTERNS = [
  /Snapchat\//i,
  /FBAN|FBAV/i, // Facebook
  /Instagram/i,
  /Twitter/i,
  /LinkedInApp/i,
  /Line\//i,
  /KAKAOTALK/i,
  /NAVER/i,
  /Daum/i,
  /WebView|wv\)/i, // Generic Android webview
];

export function useIsWebView(): boolean {
  return useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return WEBVIEW_PATTERNS.some((pattern) => pattern.test(ua));
  }, []);
}
