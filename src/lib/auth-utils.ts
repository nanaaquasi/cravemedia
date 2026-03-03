/**
 * Sanitizes redirect path to prevent open redirect vulnerabilities.
 * Rejects protocol-relative URLs (//evil.com), javascript:, path traversal, etc.
 */
export function sanitizeRedirectPath(next: string | null): string {
  if (!next || next === "/") {
    return "/account";
  }

  const trimmed = next.trim();

  // Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith("//")) {
    return "/account";
  }

  // Reject URLs with scheme (javascript:, https:, etc.)
  if (trimmed.includes(":")) {
    return "/account";
  }

  // Must start with single /
  if (!trimmed.startsWith("/")) {
    return "/account";
  }

  // Reject path traversal
  if (trimmed.includes("..")) {
    return "/account";
  }

  // Allow safe relative paths
  return trimmed;
}
