"use client";

import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";

/**
 * Answers "the home-screen app doesn't refresh right away" — there's no
 * service worker in this app (see manifest.ts), so that's not a stale-cache
 * problem to fix; it's standard standalone-PWA behavior where reopening
 * from the home screen often just resumes a suspended webview showing
 * whatever JS was already loaded, rather than hitting the network at all.
 * Nothing forces iOS/Android to always do a fresh load on reopen, so
 * instead this detects the drift and offers a one-tap real reload:
 * GET /api/version always reflects whatever's actually deployed right now
 * (unlike APP_VERSION, frozen into this bundle at build time), checked
 * whenever the app becomes visible again — exactly the reopened-from-home-
 * screen moment this exists for.
 */
export function UpdateChecker() {
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    if (APP_VERSION === "local") return; // dev — nothing meaningful to compare

    const check = () => {
      fetch("/api/version", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.version && data.version !== APP_VERSION) {
            setNewVersion(data.version);
          }
        })
        .catch(() => {});
    };

    check();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", check);
    // Fallback for a session left open and foregrounded for a long stretch
    // without ever backgrounding/reopening.
    const interval = setInterval(check, 5 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", check);
      clearInterval(interval);
    };
  }, []);

  if (!newVersion) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-ink px-4 py-2.5 font-body text-xs font-semibold text-paper shadow-lg ring-1 ring-parchment/20"
      >
        A new version of BirdScore is available — tap to reload
      </button>
    </div>
  );
}
