"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { canUseEnhancedStats } from "@/lib/entitlements";
import { Round, TrumpColor, teamLabel, formatScore, runningTotals, TRUMP_DOT_CLASS } from "@/lib/rook-engine";
import { generateGameNarrative, currentStreak, GameForStreak } from "@/lib/game-narrative";
import { Modal } from "./Modal";

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
export function GameDetailModal({
  gameId,
  onClose,
  allGames,
}: {
  gameId: string;
  onClose: () => void;
  // Used only to compute each partnership's win streak entering this
  // game — optional since a caller without the full games list (there
  // isn't one today, but nothing requires it) just gets a narrative
  // without a streak clause rather than a crash.
  allGames?: GameForStreak[];
}) {
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

  // Sports-recap-style summary — only for a finished game with a real
  // winner and at least a couple of rounds (a 1-round game has no "arc"
  // worth narrating). Streak clauses need named players to know who's on
  // which side across other games; without them the narrative still
  // works, just without that detail.
  const narrative =
    game && game.status === "completed" && game.winner && rounds && rounds.length > 1
      ? generateGameNarrative({
          rounds,
          usLabel: game.usTeamName,
          themLabel: game.themTeamName,
          winner: game.winner,
          winnerStreak:
            game.players && allGames
              ? currentStreak(
                  allGames,
                  game.winner === "US" ? game.players[0] : game.players[1],
                  game.winner === "US" ? game.players[2] : game.players[3],
                  game.id
                )
              : 0,
          loserStreak:
            game.players && allGames
              ? currentStreak(
                  allGames,
                  game.winner === "US" ? game.players[1] : game.players[0],
                  game.winner === "US" ? game.players[3] : game.players[2],
                  game.id
                )
              : 0,
        })
      : null;

  return (
    <Modal
      onClose={onClose}
      labelledBy="game-detail-title"
      backdropClassName="sm:p-4"
      panelClassName="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-card bg-paper shadow-card sm:rounded-card"
    >
        <div className="shrink-0 border-b border-ink/10 p-5">
          <div className="flex items-center justify-between">
            <p id="game-detail-title" className="font-body text-xs uppercase tracking-[0.3em] text-brass-text">
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
              {narrative && (
                <p className="mt-3 rounded-md bg-paper-dim p-3 font-body text-sm italic leading-relaxed text-ink/80">
                  {narrative}
                </p>
              )}
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
              {(() => {
                const totalsAfterEachRound = runningTotals(rounds);
                return rounds.map((r, i) => {
                  const prev = i > 0 ? rounds[i - 1] : null;
                  const elapsedSeconds = prev
                    ? (new Date(r.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000
                    : null;
                  const runningTotal = totalsAfterEachRound[i];
                  // Authoritative from the engine itself (a negative bidder
                  // score), not a raw score comparison — the actual
                  // Rook-meaningful verdict, not just "which number is
                  // bigger." Only the bidder's own score can ever go
                  // negative, so this is exactly equivalent to checking
                  // bidderSet directly without needing to re-derive it.
                  const bidderSet = r.bidTeam ? (r.bidTeam === "US" ? r.usScore : r.themScore) < 0 : false;
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
                      {r.rowType === "Round" && r.bidTeam && (
                        <p
                          className={`mt-0.5 flex items-center gap-1.5 font-body text-xs font-semibold ${
                            bidderSet ? "text-trump-red" : "text-ink"
                          }`}
                        >
                          {r.trump && (
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${TRUMP_DOT_CLASS[r.trump as TrumpColor]}`}
                              aria-hidden
                            />
                          )}
                          {r.bidderSeat != null && game?.players
                            ? game.players[r.bidderSeat]
                            : teamLabel(r.bidTeam, game ?? { usTeamName: "Us", themTeamName: "Them" })}{" "}
                          {bidderSet ? "went set" : "made it"} &middot; bid {r.bid} &middot; {r.trump}
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
                      <p className="mt-1 font-body text-[11px] text-ink/40">
                        Total: {formatScore(runningTotal.usTotal, runningTotal.themTotal)}
                      </p>
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </div>
    </Modal>
  );
}
