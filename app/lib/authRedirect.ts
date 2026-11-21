/**
 * Resolves the authentication redirect URL for Supabase Auth.
 * Production uses the branded BrainLab domain, while local development and
 * this project's Vercel previews return to the origin that initiated sign-in.
 */
export function getAuthRedirectUrl(path: string = "/auth/callback"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname.toLowerCase();

    // Preserve local developer environments.
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
      return `${window.location.origin}${normalizedPath}`;
    }

    // Preserve the active branded domain (including www vs apex).
    if (
      hostname === "brainlabacademy.com.ng" ||
      hostname.endsWith(".brainlabacademy.com.ng") ||
      hostname === "brainlab.edu.ng" ||
      hostname.endsWith(".brainlab.edu.ng")
    ) {
      return `${window.location.origin}${normalizedPath}`;
    }

    // Vercel creates several hostname shapes for preview deployments:
    // project aliases, Git-branch aliases and deployment-specific URLs. Do
    // not fall back to NEXT_PUBLIC_SITE_URL (which is commonly the production
    // domain) when the learner is already using a Vercel preview. The URL is
    // derived only from the current browser origin, never from user input.
    if (hostname.endsWith(".vercel.app")) {
      return new URL(normalizedPath, window.location.origin).toString();
    }
  }

  // Server-side fallback: check VERCEL_URL if set in preview environments
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelEnv) {
    const cleanVercel = vercelEnv.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (
      cleanVercel.endsWith(".vercel.app") &&
      (cleanVercel === "brainlabexam-cbt.vercel.app" ||
       cleanVercel.startsWith("brainlabexam-") ||
       cleanVercel.startsWith("brainlab-") ||
       cleanVercel.includes("brainlabtutorials"))
    ) {
      return `https://${cleanVercel}${normalizedPath}`;
    }
  }

  // Production fallback remains the canonical branded domain.
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && !envUrl.includes("localhost")) {
    return `${envUrl.replace(/\/$/, "")}${normalizedPath}`;
  }

  return `https://brainlabacademy.com.ng${normalizedPath}`;
}

/**
 * Strictly sanitizes internal redirect URLs to prevent open-redirect vulnerabilities.
 * Ensures that the destination is a safe, relative, same-origin path.
 * Rejects protocol-relative URLs (//), backslashes (\), javascript schemes, and control characters.
 */
export function sanitizeRedirectUrl(target: string | null | undefined, fallback: string = "/dashboard"): string {
  if (!target || typeof target !== "string") return fallback;
  const trimmed = target.trim();
  // Must start with a single slash and not followed by a second slash or backslash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  // Disallow backslashes anywhere in the path, colons before query, or control chars
  if (trimmed.includes("\\") || trimmed.includes("\0") || trimmed.includes("\r") || trimmed.includes("\n")) {
    return fallback;
  }
  // Validate path format
  const safePathPattern = /^\/[a-zA-Z0-9_\-\/.]*(\?[a-zA-Z0-9_\-=&%.]*)?(#[a-zA-Z0-9_\-]*)?$/;
  if (!safePathPattern.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}
