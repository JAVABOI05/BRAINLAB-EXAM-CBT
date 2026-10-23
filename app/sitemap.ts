import type { MetadataRoute } from "next";

const siteUrl =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brainlabacademy.com.ng").replace(
    /\/$/,
    "",
  );

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Only include public, canonical pages. Do not expose learner, exam, result,
  // correction, account, or API URLs through the sitemap.
  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/ai-learning`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/community`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/schools`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
