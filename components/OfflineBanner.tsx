"use client";

import { useEffect, useState } from "react";

/**
 * Rendered as a normal (non-fixed) block at the very top of body, not
 * pinned/overlaid — pushes everything else down by its own height when
 * visible instead of needing any safe-area math of its own, and collapses
 * to nothing when back online. Scoring itself never touched the network
 * to begin with (game-store.ts is pure client state + localStorage), so
 * this exists purely to say so — GameSync's own silence on a failed sync
 * otherwise reads as "nothing to report" rather than "something's wrong,"
 * exactly what beta feedback flagged.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="bg-trump-red px-4 py-2 text-center font-body text-xs font-semibold text-white">
      You&rsquo;re offline — scoring still works, saves will catch up once you&rsquo;re back online.
    </div>
  );
}
