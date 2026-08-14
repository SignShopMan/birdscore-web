"use client";

import { Team, teamLabel, GameSettings } from "@/lib/rook-engine";
import { ScoreTotals } from "./ScoreTotals";

/**
 * Interposed between the last round hitting the winning score and the
 * actual (locked, synced) Game Over screen — a real mis-click here used
 * to be catastrophic: gameOver flips true the instant a round crosses the
 * winning score, GameOverScreen has always been readOnly, so a bad entry
 * became permanent and unfixable the moment it happened, with no signal
 * anything was even wrong beyond the final numbers looking off. This
 * forces an explicit "does this look right?" checkpoint first — "No"
 * opens the same live-editing Scoreboard used mid-game (still fully
 * capable of fixing any round, not just the last one), which recomputes
 * gameOver/winner automatically; if the fix drops the score back under
 * the winning threshold, this screen simply stops rendering on its own.
 */
export function GameOverConfirmScreen({
  winner,
  usTotal,
  themTotal,
  settings,
  onConfirm,
  onEdit,
}: {
  winner: Team | null;
  usTotal: number;
  themTotal: number;
  settings: GameSettings;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-8 text-center lg:max-w-lg">
      <p className="font-body text-xs uppercase tracking-[0.3em] text-brass-text">Game Over?</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-parchment lg:text-4xl">
        {winner ? `${teamLabel(winner, settings)} win it` : "That's the game"}
      </h1>
      <p className="mt-2 font-body text-sm text-parchment/75">
        Double-check the score before it's locked in — this can&rsquo;t be edited once
        confirmed.
      </p>

      <div className="mt-6 w-full">
        <ScoreTotals
          us={usTotal}
          them={themTotal}
          usLabel={settings.usTeamName}
          themLabel={settings.themTeamName}
          gameOver
        />
      </div>

      <button
        onClick={onConfirm}
        className="mt-8 w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card"
      >
        Yes, that&rsquo;s right
      </button>
      <button
        onClick={onEdit}
        className="mt-3 w-full rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-parchment ring-1 ring-parchment/30"
      >
        No, let me check a round
      </button>
    </div>
  );
}
