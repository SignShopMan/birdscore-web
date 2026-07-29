"use client";

import { useState } from "react";

export function InviteCard({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/watch/${joinCode}` : `/watch/${joinCode}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the code is still visible to read aloud/type
    }
  };

  return (
    <div className="rounded-card bg-paper-dim p-3 ring-1 ring-ink/15">
      <p className="font-body text-[10px] uppercase tracking-wide text-ink/60">
        Invite &middot; watch live, no account needed
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="font-score tabular-score text-2xl font-bold tracking-wider text-ink">
          {joinCode}
        </span>
        <button
          onClick={copy}
          className="shrink-0 rounded-full bg-ink px-3 py-1.5 font-body text-xs font-semibold text-paper"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
