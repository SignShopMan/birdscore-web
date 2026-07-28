"use client";

import { useState } from "react";
import {
  MAX_POINTS_OPTIONS,
  GameSettings,
  isValidCustomMaxPoints,
  isValidWinningScore,
} from "@/lib/rook-engine";
import { useGameStore } from "@/lib/game-store";
import { ThemePicker } from "./ThemePicker";

export function SettingsScreen({
  mode = "new",
  canCancel = false,
  onDone,
}: {
  /** "new" resets to a fresh game; "edit" adjusts rules for the game already in
   * progress without touching rounds already scored. Either way, the form starts
   * pre-filled with whatever settings were last used, not hardcoded defaults. */
  mode?: "new" | "edit";
  canCancel?: boolean;
  onDone: () => void;
}) {
  const startGame = useGameStore((s) => s.startGame);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const current = useGameStore((s) => s.settings);

  const [winningScoreInput, setWinningScoreInput] = useState(String(current.winningScore));
  const presetMatch = MAX_POINTS_OPTIONS.includes(
    current.maxPointsPerRound as (typeof MAX_POINTS_OPTIONS)[number]
  );
  const [maxPoints, setMaxPoints] = useState<number>(current.maxPointsPerRound);
  const [customMode, setCustomMode] = useState(!presetMatch);
  const [customInput, setCustomInput] = useState(String(current.maxPointsPerRound));

  const winningScoreValid = isValidWinningScore(winningScoreInput, maxPoints);
  const customValid = isValidCustomMaxPoints(customInput);
  const canSave = winningScoreValid && (customMode ? customValid : true);

  const handleSave = () => {
    const settings: GameSettings = {
      winningScore: Number(winningScoreInput),
      maxPointsPerRound: maxPoints,
    };
    if (mode === "edit") {
      updateSettings(settings);
    } else {
      startGame(settings);
    }
    onDone();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-8 lg:max-w-lg lg:py-14">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">
            {mode === "edit" ? "Game Settings" : "New Game"}
          </p>
          <span className="rounded-full bg-parchment/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-parchment/60 ring-1 ring-parchment/20">
            Beta
          </span>
        </div>
        <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">BirdScore</h1>
        <p className="mt-2 font-body text-sm text-parchment/70">
          {mode === "edit"
            ? "Adjust the table rules — rounds already scored are untouched."
            : "Set the table rules, then deal."}
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-card bg-paper p-4 shadow-card">
            <label className="font-body text-sm font-semibold text-ink">Winning score</label>
            <p className="mt-1 font-body text-xs text-ink/60">
              First team to reach this score wins the game.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={winningScoreInput}
              onChange={(e) => setWinningScoreInput(e.target.value)}
              className="mt-3 w-32 rounded-md border border-ink/20 bg-white px-3 py-2 font-score text-lg tabular-score text-ink"
            />
            {!winningScoreValid && (
              <p className="mt-1 font-body text-xs text-trump-red">
                Enter a multiple of 5, at least {maxPoints} (this hand&rsquo;s max) and up to 5000.
              </p>
            )}
          </div>

          <div className="rounded-card bg-paper p-4 shadow-card">
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
                  type="text"
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

          <ThemePicker />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card transition hover:bg-brass-light disabled:opacity-40"
        >
          {mode === "edit" ? "Save Changes" : "Start Game"}
        </button>
        {canCancel && (
          <button
            onClick={onDone}
            className="w-full rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-parchment/70 ring-1 ring-parchment/20"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
