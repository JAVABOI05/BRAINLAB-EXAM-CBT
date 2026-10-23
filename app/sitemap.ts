import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.brainlabacademy.com.ng";
  const baseUrl = siteUrl.replace(/\/$/, "");
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/cbt`, lastModified, changeFrequency: "daily", priority: 0.95 },
    { url: `${baseUrl}/learn`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/challenge-arena`, lastModified, changeFrequency: "daily", priority: 0.85 },
    { url: `${baseUrl}/ai-learning`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/schools`, lastModified, changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/support`, lastModified, changeFrequency: "monthly", priority: 0.65 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.65 },
    { url: `${baseUrl}/faq`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
