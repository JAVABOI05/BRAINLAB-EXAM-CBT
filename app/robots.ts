import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.brainlabacademy.com.ng";
  const baseUrl = siteUrl.replace(/\/$/, "");

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
        "/auth",
        "/api",
        "/admin",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
