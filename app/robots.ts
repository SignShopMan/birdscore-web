import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /auth/callback and /api are functional routes, not content —
      // nothing there is meant to be indexed or crawled.
      disallow: ["/auth/", "/api/"],
    },
    sitemap: "https://therealbirdscore.com/sitemap.xml",
  };
}
