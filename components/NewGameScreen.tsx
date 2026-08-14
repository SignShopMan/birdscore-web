"use client";

import { useGameStore } from "@/lib/game-store";
import { MainMenu } from "./MainMenu";
import { InstallPrompt } from "./InstallPrompt";

/**
 * The actual landing screen now — was Settings before, which meant every
 * fresh visit (or every rematch) dropped straight into a full editable
 * form. This is the lightweight "confirm or adjust" step in between:
 * shows what a new game will actually use, Start Game commits to it,
 * Change Settings is the deliberate opt-in to the detailed form.
 */
export function NewGameScreen({
  onStart,
  onChangeSettings,
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onOpenResources,
}: {
  onStart: () => void;
  onChangeSettings: () => void;
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onOpenResources: () => void;
}) {
  const { settings, startGame } = useGameStore();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-8 lg:max-w-lg lg:py-14">
      <div>
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-brass-text">New Game</p>
            <span className="rounded-full bg-parchment/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-parchment/75 ring-1 ring-parchment/20">
              Beta
            </span>
          </div>
          <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} onOpenResources={onOpenResources} />
        </header>
        <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">BirdScore</h1>
        <p className="mt-2 font-body text-sm text-parchment/75">
          Ready to deal?{" "}
          <button
            onClick={onOpenResources}
            className="text-brass-text underline underline-offset-4"
          >
            New to Rook&reg;? See the rules
          </button>
        </p>

        <div className="mt-4">
          <InstallPrompt />
        </div>

        <div className="mt-4 rounded-card bg-paper p-4 shadow-card">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
            Starting with
          </p>
          <dl className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <dt className="font-body text-sm text-ink/70">Teams</dt>
              <dd className="font-body text-sm font-semibold text-ink">
                {settings.usTeamName} vs {settings.themTeamName}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-body text-sm text-ink/70">Winning score</dt>
              <dd className="font-score tabular-score text-sm font-semibold text-ink">
                {settings.winningScore}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-body text-sm text-ink/70">Max points per hand</dt>
              <dd className="font-score tabular-score text-sm font-semibold text-ink">
                {settings.maxPointsPerRound}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={() => {
            startGame(settings);
            onStart();
          }}
          className="w-full rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink shadow-card transition hover:bg-brass-light"
        >
          Start Game
        </button>
        <button
          onClick={onChangeSettings}
          className="w-full rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-parchment/75 ring-1 ring-parchment/20"
        >
          Change Settings
        </button>
      </div>
    </div>
  );
}
