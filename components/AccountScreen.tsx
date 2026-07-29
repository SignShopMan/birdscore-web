"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useGameStore } from "@/lib/game-store";
import { SignInForm } from "./SignInForm";
import { MainMenu } from "./MainMenu";

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  plus: "Plus ($3.99)",
  pro: "Pro ($19.99/yr)",
};

interface SavedGame {
  id: string;
  usTeamName: string;
  themTeamName: string;
  status: "in_progress" | "completed";
  winner: "US" | "THEM" | null;
  createdAt: string;
  completedAt: string | null;
  usTotal: number;
  themTotal: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AccountScreen({
  onOpenSettings,
  onOpenAccount,
  onOpenFaq,
  onResumeGame,
  onBack,
}: {
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenFaq: () => void;
  /** Called after a resumed game is loaded into the store — navigates to Game. */
  onResumeGame: () => void;
  onBack: () => void;
}) {
  const { userId, email, tier, loading, signOut } = useAuthStore();
  const loadGame = useGameStore((s) => s.loadGame);
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => {
        if (data.games) setGames(data.games);
        else setGamesError(data.error ?? "Couldn't load games");
      })
      .catch(() => setGamesError("Couldn't load games"));
  }, [userId]);

  const resume = async (id: string) => {
    setResumingId(id);
    try {
      const res = await fetch(`/api/games/${id}`);
      const data = await res.json();
      if (data.game && data.rounds) {
        loadGame(
          { winningScore: data.game.winningScore, maxPointsPerRound: data.game.maxPointsPerRound },
          data.rounds,
          data.game.id
        );
        onResumeGame();
      }
    } finally {
      setResumingId(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
      <header className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4"
        >
          &larr; Back
        </button>
        <MainMenu onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenFaq={onOpenFaq} />
      </header>
      <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">Your Account</h1>

      <div className="mt-8 rounded-card bg-paper p-4 shadow-card">
        {loading ? (
          <p className="font-body text-xs text-ink/70">Checking sign-in status\u2026</p>
        ) : !userId ? (
          <div>
            <p className="mb-2 font-body text-xs text-ink/70">
              An account is only needed to save game history, use named players, or host
              realtime games — you can keep playing without one.
            </p>
            <SignInForm />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-body text-sm text-ink">
              Signed in as <span className="font-semibold">{email}</span>
            </p>
            <p className="font-body text-xs text-ink/70">
              Tier: <span className="font-semibold">{TIER_LABEL[tier] ?? tier}</span>
            </p>
            <button
              onClick={signOut}
              className="mt-1 rounded-full bg-white px-4 py-1.5 font-body text-xs font-semibold text-ink ring-1 ring-ink/20"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {userId && (
        <div className="mt-6 flex-1">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
            Your Games
          </p>

          <div className="mt-3 rounded-card bg-paper-dim p-2 shadow-card">
            {games === null && !gamesError && (
              <p className="p-3 text-center font-body text-xs text-ink/60">Loading\u2026</p>
            )}
            {gamesError && (
              <p className="p-3 text-center font-body text-xs text-trump-red">{gamesError}</p>
            )}
            {games?.length === 0 && (
              <p className="p-3 text-center font-body text-xs text-ink/60">
                No saved games yet — they&rsquo;ll show up here once you play one.
              </p>
            )}
            {games?.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-2.5 hover:bg-white/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-semibold text-ink">
                    {g.status === "completed" ? `${g.winner} won` : "In progress"}{" "}
                    <span className="font-score tabular-score font-normal text-ink/70">
                      {g.usTotal}-{g.themTotal}
                    </span>
                  </p>
                  <p className="font-body text-[11px] text-ink/50">
                    {formatDate(g.createdAt)} \u00B7 {g.usTeamName} vs {g.themTeamName}
                  </p>
                </div>
                {g.status === "in_progress" && (
                  <button
                    onClick={() => resume(g.id)}
                    disabled={resumingId === g.id}
                    className="shrink-0 rounded-full bg-ink px-3 py-1.5 font-body text-xs font-semibold text-paper disabled:opacity-50"
                  >
                    {resumingId === g.id ? "Loading\u2026" : "Resume"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
