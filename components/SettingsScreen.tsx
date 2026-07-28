"use client";

import { useState } from "react";
import { DEFAULT_SETTINGS, MAX_POINTS_OPTIONS } from "@/lib/rook-engine";
import { useGameStore } from "@/lib/game-store";

export function SettingsScreen({ onStart }: { onStart: () => void }) {
  const startGame = useGameStore((s) => s.startGame);
  const [winningScore, setWinningScore] = useState(DEFAULT_SETTINGS.winningScore);
  const [maxPoints, setMaxPoints] = useState(DEFAULT_SETTINGS.maxPointsPerRound);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-8 lg:max-w-lg lg:py-14">
      <div>
        <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">New Game</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">BirdScore</h1>
        <p className="mt-2 font-body text-sm text-parchment/70">
          Set the table rules, then deal.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-card bg-parchment p-4 shadow-card">
            <label className="font-body text-sm font-semibold text-ink">Winning score</label>
            <p className="mt-1 font-body text-xs text-ink/60">
              First team to reach this score wins the game.
            </p>
            <input
              type="number"
              step={5}
              value={winningScore}
              onChange={(e) => setWinningScore(Number(e.target.value))}
              className="mt-3 w-32 rounded-md border border-ink/20 bg-white px-3 py-2 font-score text-lg tabular-score text-ink"
            />
          </div>

          <div className="rounded-card bg-parchment p-4 shadow-card">
            <label className="font-body text-sm font-semibold text-ink">
              Max points per hand
            </label>
            <p className="mt-1 font-body text-xs text-ink/60">
              Total points on the board for a single round, per your house rules.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MAX_POINTS_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => setMaxPoints(v)}
                  className={`rounded-full px-4 py-1.5 font-score text-sm tabular-score ${
                    maxPoints === v
                      ? "bg-ink text-parchment"
                      : "bg-white text-ink ring-1 ring-ink/20"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          startGame({ winningScore, maxPointsPerRound: maxPoints });
          onStart();
        }}
        className="mt-8 w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card transition hover:bg-brass-light"
      >
        Start Game
      </button>
    </div>
  );
}
