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
import { ConfirmDialog } from "./ConfirmDialog";

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
  hidden: boolean;
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

// Deliberately a different glyph per action — Cancel, Hide, and Delete are
// different severities/reversibilities and should look different at a
// glance, not just differ by which screen or status you're on.
function BanIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5l13 13" />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a17.7 17.7 0 0 1-2.16 3.19M6.6 6.6C3.28 8.6 2 12 2 12s3 8 10 8a9.14 9.14 0 0 0 4.53-1.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function EyeIcon() {
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
      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Width of a single action button in the swipe drawer — a row's drawer is
// this times however many actions apply to its status (1 or 2).
const ACTION_WIDTH = 72;

// How many games to show before offering "Show more" — a long list gets
// unwieldy well before the server's own 50-game cap (GET /api/games).
const PAGE_SIZE = 10;

type RowAction = {
  key: "cancel" | "hide" | "unhide" | "delete";
  label: string;
  icon: React.ReactNode;
  colorClass: string;
};

/** Which actions a swipe reveals, entirely determined by status/hidden —
 * matches the actual lifecycle: Cancel only ever applies to a game still
 * in progress (and immediately deletes it too, no lingering "Cancelled"
 * row — see cancelGame in HistoryScreen below); Hide/Unhide and Delete
 * only ever apply to a completed game, and are two genuinely different
 * severities (reversible vs. permanent) rather than one action doing
 * double duty. A `cancelled` row showing up here is the one edge case:
 * it means a previous Cancel's own delete call failed partway through
 * (see cancelGame) — offering it a plain Delete keeps that recoverable
 * with one more swipe instead of a dead end. */
function actionsFor(g: SavedGame): RowAction[] {
  if (g.status === "in_progress") {
    return [{ key: "cancel", label: "Cancel game", icon: <BanIcon />, colorClass: "bg-brass text-ink" }];
  }
  if (g.status === "cancelled") {
    return [{ key: "delete", label: "Permanently delete game", icon: <TrashIcon />, colorClass: "bg-trump-red text-white" }];
  }
  // completed
  const hideAction: RowAction = g.hidden
    ? { key: "unhide", label: "Unhide game", icon: <EyeIcon />, colorClass: "bg-brass text-ink" }
    : { key: "hide", label: "Hide game", icon: <EyeOffIcon />, colorClass: "bg-brass text-ink" };
  return [
    hideAction,
    { key: "delete", label: "Permanently delete game", icon: <TrashIcon />, colorClass: "bg-trump-red text-white" },
  ];
}

/** One History row, dragged over a swipe-revealed action drawer instead of
 * always-visible action buttons — those read as genuinely confusing when
 * one label ("Cancel") had to mean different things depending on status,
 * and cluttered every row all the time on what's installed as a
 * home-screen app, where a native swipe pattern is the more familiar
 * affordance. Only one row's drawer is open at a time (isOpen is
 * controlled by the parent), same as Mail/Reminders-style lists.
 *
 * The revealed action(s) are entirely determined by actionsFor(g) above —
 * an in-progress game only ever offers Cancel, a completed game offers
 * Hide/Unhide + Delete side by side, never a mix. The drawer widens to fit
 * however many actions apply (1 or 2 × ACTION_WIDTH) rather than always
 * reserving room for a fixed single action. */
function HistoryRow({
  game: g,
  isOpen,
  onOpenChange,
  onOpenDetail,
  onResume,
  resuming,
  onAction,
  busy,
}: {
  game: SavedGame;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDetail: () => void;
  onResume: () => void;
  resuming: boolean;
  onAction: (key: RowAction["key"]) => void;
  busy: boolean;
}) {
  const isCancelled = g.status === "cancelled";
  const actions = actionsFor(g);
  const drawerWidth = actions.length * ACTION_WIDTH;
  const [dragX, setDragX] = useState<number | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; base: number; axis: "h" | "v" | null } | null>(
    null
  );

  const restingX = isOpen ? -drawerWidth : 0;
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
    setDragX(Math.min(0, Math.max(-drawerWidth, d.base + deltaX)));
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.axis !== "h") {
      setDragX(null);
      return;
    }
    const current = dragX ?? restingX;
    onOpenChange(current < -drawerWidth / 2);
    setDragX(null);
  };

  return (
    <div className="relative overflow-hidden rounded-md">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: drawerWidth }}>
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => onAction(a.key)}
            disabled={busy}
            aria-label={a.label}
            className={`flex items-center justify-center disabled:opacity-50 ${a.colorClass}`}
            style={{ width: ACTION_WIDTH }}
          >
            {a.icon}
          </button>
        ))}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          // Shrinking width (not translateX) so the label's own `truncate`
          // clips from the END as usual, keeping the start of the team
          // names — the only way to tell which game this drawer belongs
          // to — always visible. Translating the whole row instead used
          // to slide its own left edge (icon + start of the label) off
          // the left side of the overflow-hidden wrapper, leaving an
          // unidentifiable fragment like "in won" once opened.
          width: `calc(100% - ${-x}px)`,
          transition: dragX === null ? "width 200ms ease" : "none",
          touchAction: "pan-y",
        }}
        className={`relative flex items-center justify-between gap-2 bg-paper px-2 py-2.5 ${
          isCancelled || g.hidden ? "opacity-50" : ""
        }`}
      >
        <button
          onClick={() => (isOpen ? onOpenChange(false) : onOpenDetail())}
          className="min-w-0 flex-1 text-left hover:opacity-70"
        >
          <p className="truncate font-body text-sm font-semibold text-ink">
            {g.status === "completed"
              ? `${g.winner === "US" ? g.usTeamName : g.themTeamName} won`
              : isCancelled
              ? "Cancelled"
              : "In progress"}{" "}
            <span className="font-score tabular-score font-normal text-ink/70">
              {formatScore(g.usTotal, g.themTotal)}
            </span>
            {g.hidden && (
              <span className="ml-1.5 rounded-full bg-ink/10 px-1.5 py-0.5 font-body text-[9px] font-semibold uppercase tracking-wide text-ink/60">
                Hidden
              </span>
            )}
          </p>
          <p className="truncate font-body text-[11px] text-ink/50">
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
  const currentGameId = useGameStore((s) => s.currentGameId);
  const abandonGame = useGameStore((s) => s.abandonGame);
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [detailGameId, setDetailGameId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Paging deep into a list and then switching filters would otherwise
  // leave you scrolled past a result set that just got much shorter.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, playerFilter, showHidden]);

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

  // Cancel only ever applies to an in-progress game, and means "end this
  // and remove it" — not "flip status and leave a row behind." So this
  // chains PATCH cancel:true with an immediate DELETE, both behind one
  // confirmation. That chaining has a real, known failure mode (the delete
  // half can fail after cancel succeeds — a network drop between the two
  // calls, a server hiccup), so it's handled explicitly here rather than
  // pretending it can't happen: if delete fails, the row is updated to
  // "cancelled" locally instead of silently staying "in_progress" or
  // disappearing — actionsFor() then offers a plain Delete on that row
  // (see above), so a failed cleanup is one more swipe away from done,
  // not a dead end.
  const [confirming, setConfirming] = useState<{ game: SavedGame; type: "cancel" | "delete" } | null>(
    null
  );

  const cancelGame = async (g: SavedGame) => {
    setRemovingId(g.id);
    try {
      const cancelRes = await fetch(`/api/games/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      if (!cancelRes.ok) return;

      // If this was the locally-active game (e.g. cancelled from History
      // while it's still the in-memory current game), clear the local
      // store too — otherwise gameActive/currentGameId still point at a
      // game that no longer exists server-side, and New Game wrongly
      // prompts "Game in progress" for a game that was just cancelled.
      if (g.id === currentGameId) abandonGame();

      const deleteRes = await fetch(`/api/games/${g.id}`, { method: "DELETE" });
      if (deleteRes.ok) {
        setGames((prev) => prev?.filter((x) => x.id !== g.id) ?? null);
      } else {
        setGames((prev) => prev?.map((x) => (x.id === g.id ? { ...x, status: "cancelled" } : x)) ?? null);
      }
    } finally {
      setRemovingId(null);
      setOpenSwipeId(null);
      setConfirming(null);
    }
  };

  // Delete is permanent and reachable from either a completed game
  // directly or a cancelled one (the edge case above) — same single
  // DELETE call either way.
  const deleteGame = async (g: SavedGame) => {
    setRemovingId(g.id);
    try {
      const res = await fetch(`/api/games/${g.id}`, { method: "DELETE" });
      if (res.ok) {
        setGames((prev) => prev?.filter((x) => x.id !== g.id) ?? null);
      }
    } finally {
      setRemovingId(null);
      setOpenSwipeId(null);
      setConfirming(null);
    }
  };

  // Hide/unhide is reversible and non-destructive — fires immediately on
  // tap, no confirmation, matches why the spec only asks for one on
  // Cancel/Delete.
  const toggleHidden = async (g: SavedGame, hidden: boolean) => {
    setOpenSwipeId(null);
    setGames((prev) => prev?.map((x) => (x.id === g.id ? { ...x, hidden } : x)) ?? null);
    const res = await fetch(`/api/games/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    if (!res.ok) {
      // Roll back the optimistic update if the write didn't actually land.
      setGames((prev) => prev?.map((x) => (x.id === g.id ? { ...x, hidden: !hidden } : x)) ?? null);
    }
  };

  const handleRowAction = (g: SavedGame, key: RowAction["key"]) => {
    if (key === "cancel" || key === "delete") {
      setConfirming({ game: g, type: key });
    } else {
      toggleHidden(g, key === "hide");
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
      // Cancelled rows are the failed-cleanup edge case (see cancelGame) —
      // folded under the same "Show hidden" toggle as hidden completed
      // games, since both are "not normally visible" categories that
      // would otherwise need their own checkbox for an increasingly rare
      // case.
      if ((g.status === "cancelled" || g.hidden) && !showHidden) return false;
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (playerFilter !== "all" && !(g.players?.includes(playerFilter) ?? false)) return false;
      return true;
    });
  }, [games, statusFilter, showHidden, playerFilter]);

  const visibleGames = filteredGames.slice(0, visibleCount);

  // Partner stats always computed from the full unfiltered set — filtering
  // (or hiding) the games list shouldn't secretly change the stats
  // underneath it. hidden/cancelled games are still in `games`, so a
  // hidden completed game keeps counting exactly as before.
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
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="accent-brass"
            />
            Show hidden
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
            {visibleGames.map((g) => (
              <HistoryRow
                key={g.id}
                game={g}
                isOpen={openSwipeId === g.id}
                onOpenChange={(open) => setOpenSwipeId(open ? g.id : null)}
                onOpenDetail={() => setDetailGameId(g.id)}
                onResume={() => resume(g.id)}
                resuming={resumingId === g.id}
                onAction={(key) => handleRowAction(g, key)}
                busy={removingId === g.id}
              />
            ))}
          </div>
          {filteredGames.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="mt-2 w-full rounded-md py-2 font-body text-xs font-semibold text-ink/70 hover:bg-white"
            >
              Show more ({filteredGames.length - visibleCount} more)
            </button>
          )}
        </div>
      </div>

      {detailGameId && (
        <GameDetailModal gameId={detailGameId} onClose={() => setDetailGameId(null)} />
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.type === "cancel" ? "Cancel this game?" : "Permanently delete this game?"}
          message={
            confirming.type === "cancel"
              ? "This ends the game and removes it from History. This can't be undone."
              : "This can't be undone."
          }
          confirmLabel={confirming.type === "cancel" ? "Yes, cancel" : "Yes, delete"}
          cancelLabel="Never mind"
          danger
          confirming={removingId === confirming.game.id}
          onConfirm={() =>
            confirming.type === "cancel" ? cancelGame(confirming.game) : deleteGame(confirming.game)
          }
          onCancel={() => {
            setConfirming(null);
            setOpenSwipeId(null);
          }}
        />
      )}
    </div>
  );
}
