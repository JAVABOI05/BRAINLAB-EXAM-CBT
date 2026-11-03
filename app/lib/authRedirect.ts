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

    // Preserve BrainLab's Vercel preview hostnames. Strictly limit to
    // deployments owned by BrainLab CBT to prevent open redirects.
    const isBrainLabVercelPreview =
      hostname.endsWith(".vercel.app") &&
      (hostname === "brainlabexam-cbt.vercel.app" ||
       hostname.startsWith("brainlabexam-") ||
       hostname.startsWith("brainlab-") ||
       hostname.includes("brainlabtutorials"));

    if (isBrainLabVercelPreview) {
      return `${window.location.origin}${normalizedPath}`;
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
