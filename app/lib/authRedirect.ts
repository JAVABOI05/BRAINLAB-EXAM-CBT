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
    if (hostname === "brainlabacademy.com.ng" ||
        hostname.endsWith(".brainlabacademy.com.ng") ||
        hostname === "brainlab.edu.ng" ||
        hostname.endsWith(".brainlab.edu.ng")) {
      return `${window.location.origin}${normalizedPath}`;
    }

    // Preserve only BrainLab's Vercel preview hostnames. Do not trust arbitrary
    // *.vercel.app origins; the project-specific suffix limits this exception
    // to deployments owned by the BrainLab Vercel team.
    const isBrainLabVercelPreview =
      hostname.startsWith("brainlabexam-") &&
      hostname.endsWith("-brainlabtutorials-3645s-projects.vercel.app");

    if (isBrainLabVercelPreview) {
      return `${window.location.origin}${normalizedPath}`;
    }
  }

  // Production fallback remains the canonical branded domain.
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl && !envUrl.includes("localhost")) {
    return `${envUrl.replace(/\/$/, "")}${normalizedPath}`;
  }

  return `https://brainlabacademy.com.ng${normalizedPath}`;
}
