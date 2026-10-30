import type { MetadataRoute } from "next";

const siteUrl = "https://www.brainlabacademy.com.ng";

// Robots directives are crawler guidance only, never access control. Do not list
// the private operator route here: publishing a restricted path in robots.txt can
// advertise that it exists. proxy.ts returns 404/noindex for direct admin-route access.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/exam",
        "/result",
        "/corrections",
        "/access",
        "/instructions",
        "/login",
        "/test",
        "/account",
        "/dashboard",
        "/tutor/profile",
        "/auth",
        "/api",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
