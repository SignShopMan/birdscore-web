"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useGameStore } from "@/lib/game-store";
import { computePartnershipStats, GameForStats } from "@/lib/partner-stats";
import { MainMenu } from "./MainMenu";

interface SavedGame {
  id: string;
  usTeamName: string;
  themTeamName: string;
  status: "in_progress" | "completed" | "cancelled";
  winner: "US" | "THEM" | null;
  createdAt: string;
  completedAt: string | null;
  usTotal: number;
  themTotal: number;
  players: [string, string, string, string] | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function HistoryScreen({
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onBack,
  onResumeGame,
}: {
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onBack: () => void;
  onResumeGame: () => void;
}) {
  const { userId } = useAuthStore();
  const loadGame = useGameStore((s) => s.loadGame);
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
          {
            winningScore: data.game.winningScore,
            maxPointsPerRound: data.game.maxPointsPerRound,
            usTeamName: data.game.usTeamName,
            themTeamName: data.game.themTeamName,
            players: data.game.players,
          },
          data.rounds,
          data.game.id
        );
        onResumeGame();
      }
    } finally {
      setResumingId(null);
    }
  };

  const cancelGame = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      if (res.ok) {
        setGames((prev) => prev?.map((g) => (g.id === id ? { ...g, status: "cancelled" } : g)) ?? null);
      }
    } finally {
      setCancellingId(null);
      setConfirmingCancelId(null);
    }
  };

  const partnerStats = games ? computePartnershipStats(games as GameForStats[]) : [];

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
        <header className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4"
          >
            &larr; Back
          </button>
          <MainMenu onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} />
        </header>
        <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">History</h1>
        <p className="mt-4 font-body text-sm text-parchment/75">
          Sign in from the menu to see your saved games and partner stats.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
      <header className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4"
        >
          &larr; Back
        </button>
        <MainMenu onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} />
      </header>
      <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">History</h1>

      {partnerStats.length > 0 && (
        <div className="mt-6">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
            Partner Performance
          </p>
          <div className="mt-3 space-y-2">
            {partnerStats.map((p) => {
              const winPct = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
              return (
                <div key={p.players.join("+")} className="rounded-card bg-paper p-3 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-body text-sm font-semibold text-ink">
                      {p.players[0]} &amp; {p.players[1]}
                    </p>
                    <p className="font-score tabular-score text-sm font-bold text-ink">{winPct}%</p>
                  </div>
                  <p className="font-body text-[11px] text-ink/60">
                    {p.wins}-{p.losses} across {p.gamesPlayed} game{p.gamesPlayed === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {games !== null && partnerStats.length === 0 && (
        <p className="mt-6 font-body text-xs text-parchment/60">
          No partner stats yet — play a few completed games with named players (Settings
          &rarr; Team names &amp; players &rarr; Track 4 players) and they&rsquo;ll show up here.
        </p>
      )}

      <div className="mt-6 flex-1">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
          All Games
        </p>
        <div className="mt-3 rounded-card bg-paper-dim p-2 shadow-card">
          {games === null && !gamesError && (
            <p className="p-3 text-center font-body text-xs text-ink/60">Loading\u2026</p>
          )}
          {gamesError && <p className="p-3 text-center font-body text-xs text-trump-red">{gamesError}</p>}
          {games?.length === 0 && (
            <p className="p-3 text-center font-body text-xs text-ink/60">
              No saved games yet — they&rsquo;ll show up here once you play one.
            </p>
          )}
          {games?.map((g) => (
            <div
              key={g.id}
              className={`rounded-md px-2 py-2.5 hover:bg-white/50 ${
                g.status === "cancelled" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-semibold text-ink">
                    {g.status === "completed"
                      ? `${g.winner} won`
                      : g.status === "cancelled"
                      ? "Cancelled"
                      : "In progress"}{" "}
                    <span className="font-score tabular-score font-normal text-ink/70">
                      {g.usTotal}-{g.themTotal}
                    </span>
                  </p>
                  <p className="font-body text-[11px] text-ink/50">
                    {formatDate(g.createdAt)} \u00B7 {g.usTeamName} vs {g.themTeamName}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {g.status === "in_progress" && (
                    <>
                      <button
                        onClick={() => resume(g.id)}
                        disabled={resumingId === g.id}
                        className="rounded-full bg-ink px-3 py-1.5 font-body text-xs font-semibold text-paper disabled:opacity-50"
                      >
                        {resumingId === g.id ? "Loading\u2026" : "Resume"}
                      </button>
                      {confirmingCancelId !== g.id && (
                        <button
                          onClick={() => setConfirmingCancelId(g.id)}
                          className="rounded-full bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink ring-1 ring-ink/20"
                        >
                          Cancel
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {confirmingCancelId === g.id && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-trump-red/10 p-2">
                  <p className="font-body text-xs text-ink">
                    Cancel this game? This can&rsquo;t be undone.
                  </p>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => setConfirmingCancelId(null)}
                      className="rounded-full bg-white px-3 py-1 font-body text-xs font-semibold text-ink ring-1 ring-ink/20"
                    >
                      No
                    </button>
                    <button
                      onClick={() => cancelGame(g.id)}
                      disabled={cancellingId === g.id}
                      className="rounded-full bg-trump-red px-3 py-1 font-body text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {cancellingId === g.id ? "Cancelling\u2026" : "Yes, cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
