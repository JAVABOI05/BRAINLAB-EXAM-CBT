/**
 * Resolves the canonical authentication redirect URL for Supabase Auth.
 * Ensures students and administrators always see and return to the branded
 * domain (https://brainlabacademy.com.ng) rather than outdated Vercel URLs,
 * while safely preserving localhost for local development.
 */
export function getAuthRedirectUrl(path: string = "/auth/callback"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;

    // 1. Preserve local developer environments
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
      return `${window.location.origin}${normalizedPath}`;
    }

    // 2. If already browsing on a brainlab custom domain, keep their active origin (e.g. www vs apex)
    if (hostname.includes("brainlabacademy.com.ng") || hostname.includes("brainlab.edu.ng")) {
      return `${window.location.origin}${normalizedPath}`;
    }
  }

  // 3. In production, always return the canonical branded domain
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && !envUrl.includes("localhost")) {
    return `${envUrl.replace(/\/$/, "")}${normalizedPath}`;
  }

  return `https://brainlabacademy.com.ng${normalizedPath}`;
}
