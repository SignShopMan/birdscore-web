import { MetadataRoute } from "next";

/**
 * The cheap, high-value first slice of PWA support — makes the app
 * actually installable (Add to Home Screen / desktop install prompts)
 * using icons already built for the favicon. This does NOT make the app
 * work offline — that needs a service worker and real caching strategy,
 * genuinely separate scope, and the natural next step given how much
 * offline-capable scoring would matter at a venue with bad wifi.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BirdScore — Rook® Scorekeeper",
    short_name: "BirdScore",
    description: "Live bid and score tracking for Rook®, tableside.",
    start_url: "/",
    display: "standalone",
    background_color: "#173C31",
    theme_color: "#173C31",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
