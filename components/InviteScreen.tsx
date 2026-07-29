"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/game-store";

export function InviteScreen({ onClose }: { onClose: () => void }) {
  const { joinCode, viewerCount } = useGameStore();
  const [copied, setCopied] = useState(false);

  if (!joinCode) return null;

  const link =
    typeof window !== "undefined" ? `${window.location.origin}/watch/${joinCode}` : `/watch/${joinCode}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the code below is still visible to read aloud/type
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-card bg-paper p-6 text-center shadow-card sm:rounded-card">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">Invite to Watch</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">No account needed</h2>
        <p className="mt-1 font-body text-xs text-ink/70">
          Anyone with the code or link below can watch live — they can&rsquo;t change anything.
        </p>

        <div className="mt-5 rounded-card bg-paper-dim p-5">
          <div className="font-score tabular-score text-6xl font-bold tracking-[0.15em] text-ink">
            {joinCode}
          </div>
        </div>

        <button
          onClick={copy}
          className="mt-4 w-full rounded-full bg-ink py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-paper"
        >
          {copied ? "Link copied!" : "Copy invite link"}
        </button>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-full bg-paper-dim px-4 py-2">
          <span
            className={`h-2 w-2 rounded-full ${viewerCount > 0 ? "bg-trump-green" : "bg-ink/30"}`}
            aria-hidden
          />
          <p className="font-body text-sm text-ink">
            {viewerCount === 0
              ? "No one watching yet"
              : `${viewerCount} ${viewerCount === 1 ? "person" : "people"} watching`}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-ink ring-1 ring-ink/20"
        >
          Done
        </button>
      </div>
    </div>
  );
}
