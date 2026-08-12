"use client";

import { useEffect, useState } from "react";

/**
 * Replaces picking a team directly with picking who actually won the
 * bid — tap a player as they pass; the last one left is the bidder, and
 * their team is derived from that (see setBidderSeat in game-store.ts),
 * never chosen independently. Two things this fixes at once: the exact
 * failure mode from a mis-picked team two nights running (there's no
 * longer a team choice to get wrong, only "who's still in"), and it
 * captures which individual player won each bid — previously invisible,
 * now the source for per-player bidding stats in History.
 *
 * resetKey ties this component's internal passing state to something
 * that changes once per round (rounds.length works well) — a fresh round
 * should never start with the previous round's passes still showing.
 */
export function BidderPicker({
  players,
  bidderSeat,
  onSelectBidder,
  disabled,
  resetKey,
}: {
  players: [string, string, string, string];
  bidderSeat: number | null;
  onSelectBidder: (seat: number | null) => void;
  disabled?: boolean;
  resetKey: number;
}) {
  const [passedSeats, setPassedSeats] = useState<Set<number>>(new Set());

  useEffect(() => {
    setPassedSeats(new Set());
  }, [resetKey]);

  const togglePass = (seat: number) => {
    if (disabled) return;
    const isPassed = passedSeats.has(seat);
    const activeCount = 4 - passedSeats.size;
    // Can't pass the last player still in — someone has to win the bid.
    if (!isPassed && activeCount <= 1) return;

    const next = new Set(passedSeats);
    if (isPassed) next.delete(seat);
    else next.add(seat);
    setPassedSeats(next);

    const active = [0, 1, 2, 3].filter((s) => !next.has(s));
    onSelectBidder(active.length === 1 ? active[0] : null);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {players.map((name, seat) => {
        const passed = passedSeats.has(seat);
        const isBidder = bidderSeat === seat;
        return (
          <button
            key={seat}
            type="button"
            disabled={disabled}
            onClick={() => togglePass(seat)}
            aria-pressed={isBidder}
            className={`truncate rounded-card py-3 font-body text-sm font-semibold transition disabled:cursor-not-allowed ${
              isBidder
                ? "bg-brass text-ink"
                : passed
                ? "bg-parchment/5 text-parchment/40 line-through"
                : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
            } ${disabled && !isBidder ? "opacity-50" : ""}`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
