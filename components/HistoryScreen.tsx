"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useGameStore } from "@/lib/game-store";
import { formatScore } from "@/lib/rook-engine";
import { computePartnershipStats, GameForStats } from "@/lib/partner-stats";
import { MainMenu } from "./MainMenu";
import { SignInForm } from "./SignInForm";
import { GameDetailModal } from "./GameDetailModal";

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

type StatusFilter = "all" | "in_progress" | "completed";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

// Reveal width for the delete drawer behind each row.
const SWIPE_ACTION_WIDTH = 72;

/** One History row, dragged over a red trash-icon drawer instead of the old
 * always-visible "Cancel"/"Delete" text buttons — those read as genuinely
 * confusing on a completed game ("Cancel" implies stopping something
 * in-progress), and cluttered every row all the time on what's installed as
 * a home-screen app, where a native swipe-to-delete pattern is the more
 * familiar affordance. Only one row's drawer is open at a time (isOpen is
 * controlled by the parent), same as Mail/Reminders-style lists. */
function HistoryRow({
  game: g,
  isOpen,
  onOpenChange,
  onOpenDetail,
  onResume,
  resuming,
  onRemove,
  busy,
}: {
  game: SavedGame;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDetail: () => void;
  onResume: () => void;
  resuming: boolean;
  onRemove: () => void;
  busy: boolean;
}) {
  const [dragX, setDragX] = useState<number | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; base: number; axis: "h" | "v" | null } | null>(
    null
  );

  const restingX = isOpen ? -SWIPE_ACTION_WIDTH : 0;
  const x = dragX ?? restingX;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, base: restingX, axis: null };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const deltaX = e.clientX - d.startX;
    const deltaY = e.clientY - d.startY;
    if (d.axis === null) {
      // Wait for real movement before committing to horizontal (swipe) vs
      // vertical (let the page scroll normally) — otherwise a vertical
      // scroll gesture that starts on a row would get eaten immediately.
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      d.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "h" : "v";
    }
    if (d.axis === "v") return;
    e.preventDefault();
    setDragX(Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, d.base + deltaX)));
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.axis !== "h") {
      setDragX(null);
      return;
    }
    const current = dragX ?? restingX;
    onOpenChange(current < -SWIPE_ACTION_WIDTH / 2);
    setDragX(null);
  };

  return (
    <div className="relative overflow-hidden rounded-md">
      <button
        onClick={onRemove}
        disabled={busy}
        aria-label={g.status === "cancelled" ? "Permanently delete game" : "Delete game"}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-trump-red text-white disabled:opacity-50"
        style={{ width: SWIPE_ACTION_WIDTH }}
      >
        <TrashIcon />
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragX === null ? "transform 200ms ease" : "none",
          touchAction: "pan-y",
        }}
        className={`relative flex items-center justify-between gap-2 bg-paper px-2 py-2.5 ${
          g.status === "cancelled" ? "opacity-50" : ""
        }`}
      >
        <button
          onClick={() => (isOpen ? onOpenChange(false) : onOpenDetail())}
          className="min-w-0 flex-1 text-left hover:opacity-70"
        >
          <p className="truncate font-body text-sm font-semibold text-ink">
            {g.status === "completed"
              ? `${g.winner === "US" ? g.usTeamName : g.themTeamName} won`
              : g.status === "cancelled"
              ? "Cancelled"
              : "In progress"}{" "}
            <span className="font-score tabular-score font-normal text-ink/70">
              {formatScore(g.usTotal, g.themTotal)}
            </span>
          </p>
          <p className="font-body text-[11px] text-ink/50">
            {formatDate(g.createdAt)} &middot; {g.usTeamName} vs {g.themTeamName}
          </p>
        </button>
        {g.status === "in_progress" && (
          <button
            onClick={onResume}
            disabled={resuming}
            className="shrink-0 rounded-full bg-ink px-3 py-1.5 font-body text-xs font-semibold text-paper disabled:opacity-50"
          >
            {resuming ? "Loading…" : "Resume"}
          </button>
        )}
      </div>
    </div>
  );
}

export function HistoryScreen({
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onOpenResources,
  onBack,
  onResumeGame,
}: {
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onOpenResources: () => void;
  onBack: () => void;
  onResumeGame: () => void;
}) {
  const { userId } = useAuthStore();
  const loadGame = useGameStore((s) => s.loadGame);
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [detailGameId, setDetailGameId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<string>("all");

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
            spreadWin: data.game.spreadWin,
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

  // Collapses the old two-step Cancel-then-Delete flow into one gesture:
  // swipe reveals the trash icon, tapping it asks a single native confirm,
  // then does whatever it actually takes server-side (cancel first if the
  // game isn't already cancelled — the DELETE endpoint refuses anything
  // else — then permanently delete). The swipe + explicit tap + confirm is
  // the safety rail now, not a separate visible banner per row.
  const removeGame = async (g: SavedGame) => {
    const verb = g.status === "cancelled" ? "Permanently delete" : "Delete";
    if (!window.confirm(`${verb} this game? This can't be undone.`)) {
      setOpenSwipeId(null);
      return;
    }
    setRemovingId(g.id);
    try {
      if (g.status !== "cancelled") {
        const cancelRes = await fetch(`/api/games/${g.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancel: true }),
        });
        if (!cancelRes.ok) return;
      }
      const deleteRes = await fetch(`/api/games/${g.id}`, { method: "DELETE" });
      if (deleteRes.ok) {
        setGames((prev) => prev?.filter((x) => x.id !== g.id) ?? null);
      }
    } finally {
      setRemovingId(null);
      setOpenSwipeId(null);
    }
  };

  const allPlayerNames = useMemo(() => {
    const names = new Set<string>();
    for (const g of games ?? []) {
      g.players?.forEach((n) => names.add(n));
    }
    return Array.from(names).sort();
  }, [games]);

  const filteredGames = useMemo(() => {
    return (games ?? []).filter((g) => {
      if (g.status === "cancelled" && !showCancelled) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (playerFilter !== "all" && !(g.players?.includes(playerFilter) ?? false)) return false;
      return true;
    });
  }, [games, statusFilter, showCancelled, playerFilter]);

  // Partner stats always computed from the full unfiltered set — filtering
  // the games list shouldn't secretly change the stats underneath it.
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
          <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} onOpenResources={onOpenResources} />
        </header>
        <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">History</h1>
        <div className="mt-8 rounded-card bg-paper p-4 shadow-card">
          <p className="mb-2 font-body text-xs text-ink/70">
            Sign in to see your saved games and partner stats.
          </p>
          <SignInForm />
        </div>
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
        <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} onOpenResources={onOpenResources} />
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
        <div className="flex items-center justify-between">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
            All Games
          </p>
          <label className="flex items-center gap-1.5 font-body text-[11px] text-parchment/75">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="accent-brass"
            />
            Show cancelled
          </label>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {([
            ["all", "All"],
            ["in_progress", "In Progress"],
            ["completed", "Completed"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-full px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-wide ${
                statusFilter === key
                  ? "bg-brass text-ink"
                  : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
              }`}
            >
              {label}
            </button>
          ))}
          {allPlayerNames.length > 0 && (
            <select
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
              className="rounded-full bg-parchment/10 px-3 py-1 font-body text-[11px] font-semibold text-parchment ring-1 ring-parchment/30"
            >
              <option value="all">All players</option>
              {allPlayerNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-3 rounded-card bg-paper-dim p-2 shadow-card">
          {games === null && !gamesError && (
            <p className="p-3 text-center font-body text-xs text-ink/60">Loading&hellip;</p>
          )}
          {gamesError && <p className="p-3 text-center font-body text-xs text-trump-red">{gamesError}</p>}
          {games?.length === 0 && (
            <p className="p-3 text-center font-body text-xs text-ink/60">
              No saved games yet — they&rsquo;ll show up here once you play one.
            </p>
          )}
          {games && games.length > 0 && filteredGames.length === 0 && (
            <p className="p-3 text-center font-body text-xs text-ink/60">
              No games match these filters.
            </p>
          )}
          <div className="space-y-2">
            {filteredGames.map((g) => (
              <HistoryRow
                key={g.id}
                game={g}
                isOpen={openSwipeId === g.id}
                onOpenChange={(open) => setOpenSwipeId(open ? g.id : null)}
                onOpenDetail={() => setDetailGameId(g.id)}
                onResume={() => resume(g.id)}
                resuming={resumingId === g.id}
                onRemove={() => removeGame(g)}
                busy={removingId === g.id}
              />
            ))}
          </div>
        </div>
      </div>

      {detailGameId && (
        <GameDetailModal gameId={detailGameId} onClose={() => setDetailGameId(null)} />
      )}
    </div>
  );
}
