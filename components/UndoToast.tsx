"use client";

import { useEffect } from "react";
import { useGameStore } from "@/lib/game-store";

const AUTO_DISMISS_MS = 5000;

/**
 * Answers "I mis-tapped the score, now what" without sending someone back
 * into the round ledger and EditRoundModal for a fix that's often just
 * "delete and redo" — correcting a fresh mistake mid-game, one-handed, at
 * a table, is a real and common moment this app never had a fast path
 * for. Reuses the existing deleteRound action; no new engine logic.
 */
export function UndoToast() {
  const lastSavedRoundId = useGameStore((s) => s.lastSavedRoundId);
  const dismissUndo = useGameStore((s) => s.dismissUndo);
  const deleteRound = useGameStore((s) => s.deleteRound);

  useEffect(() => {
    if (!lastSavedRoundId) return;
    const timer = setTimeout(dismissUndo, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [lastSavedRoundId, dismissUndo]);

  if (!lastSavedRoundId) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-card bg-parchment/10 px-4 py-2.5 ring-1 ring-parchment/20">
      <p className="font-body text-xs text-parchment/75">Round saved</p>
      <button
        onClick={() => {
          deleteRound(lastSavedRoundId);
          dismissUndo();
        }}
        className="font-body text-xs font-semibold uppercase tracking-wide text-brass-text underline underline-offset-4"
      >
        Undo
      </button>
    </div>
  );
}
