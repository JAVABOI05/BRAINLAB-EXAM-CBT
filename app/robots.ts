import type { MetadataRoute } from "next";

// Robots directives are for crawler guidance only. They do not protect routes or data;
// access control must be enforced by the application/database.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/exam",
        "/result",
        "/corrections",
        "/access",
        "/instructions",
        "/login",
        "/test",
      ],
    },
  };
}
