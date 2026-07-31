"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { canUseEnhancedStats } from "@/lib/entitlements";
import { Round, TrumpColor, teamLabel, formatScore, TRUMP_DOT_CLASS } from "@/lib/rook-engine";

interface GameDetail {
  id: string;
  winningScore: number;
  maxPointsPerRound: number;
  usTeamName: string;
  themTeamName: string;
  status: "in_progress" | "completed" | "cancelled";
  winner: "US" | "THEM" | null;
  players: [string, string, string, string] | null;
  createdAt: string;
  completedAt: string | null;
}

const SEAT_LABELS = ["North", "East", "South", "West"];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Time since the previous round, not an absolute clock time — a round
 * played 9:55:03 and the next at 9:55:41 both display as "9:55 PM" at
 * minute precision, telling you nothing (this happened in testing: six
 * rounds in a row, all showing the identical minute). Elapsed time is
 * meaningful regardless of how close together rounds were scored. */
function formatElapsed(seconds: number): string {
  if (seconds < 60) return `+${Math.round(seconds)}s`;
  return `+${Math.round(seconds / 60)} min`;
}

/**
 * The actual scorecard behind a History row — round-by-round detail, not
 * just the final tally. Enhanced stats (who dealt, who held the Rook) are
 * Pro-tier only, gated live against the viewer's current tier rather than
 * anything baked into the saved game — matches how every other
 * entitlement in this app works (see lib/entitlements.ts).
 */
export function GameDetailModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { tier } = useAuthStore();
  const showEnhanced = canUseEnhancedStats(tier);
  const [game, setGame] = useState<GameDetail | null>(null);
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/games/${gameId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.game && data.rounds) {
          setGame(data.game);
          setRounds(data.rounds);
        } else {
          setError(data.error ?? "Couldn't load this game");
        }
      })
      .catch(() => setError("Couldn't load this game"));
  }, [gameId]);

  const usTotal = rounds?.reduce((sum, r) => sum + r.usScore, 0) ?? 0;
  const themTotal = rounds?.reduce((sum, r) => sum + r.themScore, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-card bg-paper shadow-card sm:rounded-card">
        <div className="shrink-0 border-b border-ink/10 p-5">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">
              {game?.status === "cancelled" ? "Cancelled Game" : "Game Detail"}
            </p>
            <button
              onClick={onClose}
              className="rounded-full bg-white px-3 py-1 font-body text-xs text-ink ring-1 ring-ink/15"
            >
              Close
            </button>
          </div>
          {game && (
            <>
              <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                {game.usTeamName} vs {game.themTeamName}
              </h2>
              <p className="mt-0.5 font-body text-xs text-ink/50">
                Started {formatDateTime(game.createdAt)}
                {game.completedAt && <> &middot; Finished {formatDateTime(game.completedAt)}</>}
              </p>
              <p className="mt-1 font-score tabular-score text-lg font-bold text-ink">
                {formatScore(usTotal, themTotal)}
                {game.winner && (
                  <span className="ml-2 font-body text-xs font-normal text-ink/60">
                    {teamLabel(game.winner, game)} won
                  </span>
                )}
              </p>
              {!showEnhanced && game.players && (
                <p className="mt-2 font-body text-xs text-ink/60">
                  Dealer and Rook-holder detail is part of the $19.99/yr tier.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="font-body text-sm text-trump-red">{error}</p>}
          {!error && !rounds && <p className="font-body text-sm text-ink/60">Loading&hellip;</p>}
          {rounds?.length === 0 && (
            <p className="font-body text-sm text-ink/60">No rounds were scored in this game.</p>
          )}
          {rounds && rounds.length > 0 && (
            <ul className="space-y-2">
              {rounds.map((r, i) => {
                const prev = i > 0 ? rounds[i - 1] : null;
                const elapsedSeconds = prev
                  ? (new Date(r.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000
                  : null;
                return (
                  <li key={r.rowId} className="rounded-md bg-paper-dim p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-body text-xs font-semibold text-ink/70">
                        {/* r.round is the number saved at scoring time (see
                            roundsPlayed in rook-engine.ts), which correctly
                            skips adjustment rows — the array index i does not,
                            and would misnumber every round after the first
                            adjustment in a game. */}
                        {r.rowType === "Adj" ? r.label || "Adjustment" : `Round ${r.round}`}
                        {elapsedSeconds != null && (
                          <span className="ml-1.5 font-normal text-ink/40">
                            {formatElapsed(elapsedSeconds)}
                          </span>
                        )}
                      </p>
                      <p className="font-score tabular-score text-sm font-bold text-ink">
                        {formatScore(r.usScore, r.themScore)}
                      </p>
                    </div>
                    {r.rowType === "Round" && (
                      <p className="mt-0.5 flex items-center gap-1.5 font-body text-xs text-ink/60">
                        {r.trump && (
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${TRUMP_DOT_CLASS[r.trump as TrumpColor]}`}
                            aria-hidden
                          />
                        )}
                        {r.bidTeam && teamLabel(r.bidTeam, game ?? { usTeamName: "Us", themTeamName: "Them" })}{" "}
                        bid {r.bid} &middot; {r.trump}
                        {r.shootMoon ? " \u00B7 Moon" : ""}
                      </p>
                    )}
                    {showEnhanced && game?.players && r.rowType === "Round" && (
                      <p className="mt-1 font-body text-[11px] text-ink/50">
                        {r.dealerIndex != null && (
                          <>
                            Dealer: {game.players[r.dealerIndex]} ({SEAT_LABELS[r.dealerIndex]})
                          </>
                        )}
                        {r.rookHolderSeat != null && (
                          <> &middot; Rook: {game.players[r.rookHolderSeat]}</>
                        )}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
