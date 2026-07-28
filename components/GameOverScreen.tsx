"use client";

import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { ScoreTotals } from "./ScoreTotals";
import { Scoreboard } from "./Scoreboard";

export function GameOverScreen({
  onNewGame,
  onOpenSettings,
}: {
  onNewGame: () => void;
  onOpenSettings: () => void;
}) {
  const { rounds, winner, newGame, updateRound, deleteRound } = useGameStore();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 text-center lg:max-w-lg lg:py-14">
      <div>
        <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">Game Over</p>
        <h1 className="mt-1 font-display text-5xl font-semibold text-parchment lg:text-6xl">
          {winner} wins
        </h1>
        <p className="mt-3 font-body text-sm text-parchment/70">
          Nicely played — here&rsquo;s the final tally.
        </p>

        <div className="mt-8">
          <ScoreTotals us={usTotal(rounds)} them={themTotal(rounds)} />
        </div>
      </div>

      <div className="mt-8 h-64 text-left lg:h-80">
        <Scoreboard
          rounds={rounds}
          usTotal={usTotal(rounds)}
          themTotal={themTotal(rounds)}
          onUpdateRound={updateRound}
          onDeleteRound={deleteRound}
          readOnly
          hideTotals
        />
      </div>

      <button
        onClick={() => {
          newGame();
          onNewGame();
        }}
        className="mt-8 w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card"
      >
        New Game
      </button>
      <button
        onClick={onOpenSettings}
        className="mt-3 w-full font-body text-xs text-parchment/60 underline underline-offset-4"
      >
        Change settings before the next game
      </button>
    </div>
  );
}
