"use client";

import { useState } from "react";
import { DEFAULT_SETTINGS, MAX_POINTS_OPTIONS, isValidCustomMaxPoints } from "@/lib/rook-engine";
import { useGameStore } from "@/lib/game-store";

export function SettingsScreen({ onStart }: { onStart: () => void }) {
  const startGame = useGameStore((s) => s.startGame);
  const [winningScore, setWinningScore] = useState(DEFAULT_SETTINGS.winningScore);
  const [maxPoints, setMaxPoints] = useState<number>(DEFAULT_SETTINGS.maxPointsPerRound);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState(String(DEFAULT_SETTINGS.maxPointsPerRound));

  const customValid = isValidCustomMaxPoints(customInput);
  const canStart = customMode ? customValid : true;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-8 lg:max-w-lg lg:py-14">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">New Game</p>
          <span className="rounded-full bg-parchment/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-parchment/60 ring-1 ring-parchment/20">
            Beta
          </span>
        </div>
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
                  onClick={() => {
                    setCustomMode(false);
                    setMaxPoints(v);
                  }}
                  className={`rounded-full px-4 py-1.5 font-score text-sm tabular-score ${
                    !customMode && maxPoints === v
                      ? "bg-ink text-parchment"
                      : "bg-white text-ink ring-1 ring-ink/20"
                  }`}
                >
                  {v}
                </button>
              ))}
              <button
                onClick={() => setCustomMode(true)}
                className={`rounded-full px-4 py-1.5 font-body text-sm ${
                  customMode ? "bg-ink text-parchment" : "bg-white text-ink ring-1 ring-ink/20"
                }`}
              >
                Custom
              </button>
            </div>

            {customMode && (
              <div className="mt-3">
                <input
                  type="number"
                  step={5}
                  inputMode="numeric"
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                    if (isValidCustomMaxPoints(e.target.value)) setMaxPoints(Number(e.target.value));
                  }}
                  placeholder="e.g. 230"
                  className="w-32 rounded-md border border-ink/20 bg-white px-3 py-2 font-score text-lg tabular-score text-ink"
                />
                {!customValid && (
                  <p className="mt-1 font-body text-xs text-trump-red">
                    Enter a multiple of 5, between 50 and 1000.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          startGame({ winningScore, maxPointsPerRound: maxPoints });
          onStart();
        }}
        disabled={!canStart}
        className="mt-8 w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card transition hover:bg-brass-light disabled:opacity-40"
      >
        Start Game
      </button>
    </div>
  );
}
