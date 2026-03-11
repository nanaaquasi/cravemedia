/**
 * Sanitizes redirect path to prevent open redirect vulnerabilities.
 * Rejects protocol-relative URLs (//evil.com), javascript:, path traversal, etc.
 */
export function sanitizeRedirectPath(next: string | null): string {
  if (!next || next === "/") {
    return "/profile";
  }

  const trimmed = next.trim();

  // Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith("//")) {
    return "/profile";
  }

  // Reject URLs with scheme (javascript:, https:, etc.)
  if (trimmed.includes(":")) {
    return "/profile";
  }

  // Must start with single /
  if (!trimmed.startsWith("/")) {
    return "/profile";
  }

  // Reject path traversal
  if (trimmed.includes("..")) {
    return "/profile";
  }

  // Allow safe relative paths
  return trimmed;
}
