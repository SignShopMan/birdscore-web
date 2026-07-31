import { MetadataRoute } from "next";

// Only the public, content-bearing pages — the app itself (/) is a live
// scoring tool, not something search results should send someone into
// mid-game, but /watch (the spectator entry point) and this
// static-content pair are exactly what's worth indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://therealbirdscore.com";
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${base}/watch`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
