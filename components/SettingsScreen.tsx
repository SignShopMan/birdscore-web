"use client";

import { useState } from "react";
import {
  MAX_POINTS_OPTIONS,
  GameSettings,
  isValidCustomMaxPoints,
  isValidWinningScore,
  deriveTeamNamesFromPlayers,
  maxBidOnBoard,
} from "@/lib/rook-engine";
import { useGameStore } from "@/lib/game-store";
import { ThemePicker } from "./ThemePicker";
import { CollapsibleCard } from "./CollapsibleCard";
import { BackendStatusBadge } from "./BackendStatusBadge";
import { MainMenu } from "./MainMenu";
import { PlayerSetupCard } from "./PlayerSetupCard";

/**
 * Always reached via a deliberate "Change Settings" action now — from
 * NewGameScreen before a game starts, or from the menu mid-game — never
 * the app's own landing screen anymore (that's NewGameScreen). Which
 * means there's always a sensible place to go back to, so this no longer
 * needs the old mode/canCancel branching: it always just updates the
 * settings draft and hands control back to whoever opened it.
 */
export function SettingsScreen({
  onDone,
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onOpenResources,
}: {
  onDone: () => void;
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onOpenResources: () => void;
}) {
  const updateSettings = useGameStore((s) => s.updateSettings);
  const current = useGameStore((s) => s.settings);
  const rounds = useGameStore((s) => s.rounds);
  // Lowering this below a bid that already happened silently corrupts that
  // round the next time anyone edits it (calculateRoundScores's set-check
  // goes permanently negative once maxPointsPerRound < bid) — see
  // maxBidOnBoard's own doc comment. Blocking the change here, at the
  // source, is simpler and safer than trying to patch every place a stale
  // bid could interact with a new max.
  const maxBidFloor = maxBidOnBoard(rounds);

  const [winningScoreInput, setWinningScoreInput] = useState(String(current.winningScore));
  const presetMatch = MAX_POINTS_OPTIONS.includes(
    current.maxPointsPerRound as (typeof MAX_POINTS_OPTIONS)[number]
  );
  const [maxPoints, setMaxPoints] = useState<number>(current.maxPointsPerRound);
  const [customMode, setCustomMode] = useState(!presetMatch);
  const [customInput, setCustomInput] = useState(String(current.maxPointsPerRound));
  const [usTeamName, setUsTeamName] = useState(current.usTeamName);
  const [themTeamName, setThemTeamName] = useState(current.themTeamName);
  const [useNamedPlayers, setUseNamedPlayers] = useState(current.players !== null);
  const [spreadWin, setSpreadWin] = useState(current.spreadWin);
  const [playerNames, setPlayerNames] = useState<[string, string, string, string]>(
    current.players ?? ["", "", "", ""]
  );

  const winningScoreValid = isValidWinningScore(winningScoreInput, maxPoints);
  const customValid = isValidCustomMaxPoints(customInput);
  const maxPointsBelowBoard = maxPoints < maxBidFloor;
  const playersValid = !useNamedPlayers || playerNames.every((n) => n.trim().length > 0);
  const canSave =
    winningScoreValid &&
    (customMode ? customValid : true) &&
    !maxPointsBelowBoard &&
    playersValid;

  const setPlayer = (seat: number, value: string) => {
    setPlayerNames((prev) => {
      const next = [...prev] as [string, string, string, string];
      next[seat] = value;
      return next;
    });
  };

  const handleSave = () => {
    const players = useNamedPlayers
      ? (playerNames.map((n) => n.trim()) as [string, string, string, string])
      : null;
    const derived = players ? deriveTeamNamesFromPlayers(players) : null;

    const settings: GameSettings = {
      winningScore: Number(winningScoreInput),
      maxPointsPerRound: maxPoints,
      usTeamName: derived?.usTeamName ?? (usTeamName.trim() || "Us"),
      themTeamName: derived?.themTeamName ?? (themTeamName.trim() || "Them"),
      players,
      spreadWin,
    };
    updateSettings(settings);
    onDone();
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-8 sm:max-w-lg md:max-w-xl lg:max-w-2xl lg:py-14">
      <div>
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-brass-text">
              Game Settings
            </p>
            <BackendStatusBadge />
          </div>
          <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} onOpenResources={onOpenResources} />
        </header>
        <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">BirdScore</h1>
        <p className="mt-2 font-body text-sm text-parchment/75">
          Rounds already scored (if any) are untouched by anything here.
        </p>

        <div className="mt-8 space-y-3">
          <CollapsibleCard
            title="Winning score"
            subtitle="First team to reach this score wins the game."
            hasError={!winningScoreValid}
          >
            <input
              type="text"
              inputMode="numeric"
              aria-label="Winning score"
              value={winningScoreInput}
              onChange={(e) => setWinningScoreInput(e.target.value)}
              className="mt-1 w-32 rounded-md border border-ink/20 bg-white px-3 py-2 font-score text-lg tabular-score text-ink"
            />
            {!winningScoreValid && (
              <p className="mt-1 font-body text-xs text-trump-red">
                Enter a multiple of 5, at least {maxPoints} (this hand&rsquo;s max) and up to 5000.
              </p>
            )}
            <label className="mt-3 flex items-start gap-2 font-body text-xs text-ink/75">
              <input
                type="checkbox"
                checked={spreadWin}
                onChange={(e) => setSpreadWin(e.target.checked)}
                className="mt-0.5 accent-brass"
              />
              <span>
                <span className="font-semibold text-ink">Win by spread</span> — also end the
                game the moment the gap between the two totals reaches the winning score (e.g.
                380 to -120 is a 500-point spread), not just when a team&rsquo;s own total does.
              </span>
            </label>
          </CollapsibleCard>

          <CollapsibleCard
            title="Max points per hand"
            subtitle="Total points on the board for a single round, per your house rules."
            hasError={(customMode && !customValid) || maxPointsBelowBoard}
          >
            <div className="flex flex-wrap gap-2">
              {MAX_POINTS_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setCustomMode(false);
                    setMaxPoints(v);
                  }}
                  className={`rounded-full px-4 py-1.5 font-score text-sm tabular-score ${
                    !customMode && maxPoints === v
                      ? "bg-ink text-paper"
                      : "bg-white text-ink ring-1 ring-ink/20"
                  }`}
                >
                  {v}
                </button>
              ))}
              <button
                onClick={() => setCustomMode(true)}
                className={`rounded-full px-4 py-1.5 font-body text-sm ${
                  customMode ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
                }`}
              >
                Custom
              </button>
            </div>

            {maxPointsBelowBoard && (
              <p className="mt-2 font-body text-xs text-trump-red">
                Can&rsquo;t be lower than the highest bid already on the board ({maxBidFloor}).
              </p>
            )}

            {customMode && (
              <div className="mt-3">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Custom max points per hand"
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
          </CollapsibleCard>

          <CollapsibleCard
            title="Team names & players"
            subtitle="Custom names, or track all 4 players for dealer rotation and stats."
            hasError={!playersValid}
          >
            <PlayerSetupCard
              useNamedPlayers={useNamedPlayers}
              onToggleNamedPlayers={setUseNamedPlayers}
              usTeamName={usTeamName}
              themTeamName={themTeamName}
              onChangeUs={setUsTeamName}
              onChangeThem={setThemTeamName}
              playerNames={playerNames}
              onChangePlayer={setPlayer}
            />
          </CollapsibleCard>

          <CollapsibleCard title="Appearance" subtitle="Theme and table felt color.">
            <ThemePicker />
          </CollapsibleCard>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card transition hover:bg-brass-light disabled:opacity-40"
        >
          Save Changes
        </button>
        <button
          onClick={onDone}
          className="w-full rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-parchment/75 ring-1 ring-parchment/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
