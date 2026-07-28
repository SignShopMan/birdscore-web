"use client";

import { useEffect } from "react";
import { bidOptions } from "@/lib/rook-engine";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { TrumpPicker } from "./TrumpPicker";
import { BidSlider } from "./BidSlider";

const DEALER_LABELS = ["Dealer: Seat 1", "Dealer: Seat 2", "Dealer: Seat 3", "Dealer: Seat 4"];

export function GameScreen({
  onScoreRound,
  onOpenScoreboard,
  onOpenSettings,
}: {
  onScoreRound: () => void;
  onOpenScoreboard: () => void;
  onOpenSettings: () => void;
}) {
  const {
    settings,
    rounds,
    trump,
    bid,
    bidTeam,
    shootMoon,
    dealerIndex,
    setTrump,
    clearTrump,
    setBidTeam,
    setBid,
    toggleShootMoon,
    advanceDealer,
  } = useGameStore();

  const bids = bidOptions(settings.maxPointsPerRound);
  const bidChosen = bid != null || shootMoon;
  // No separate "locked" flag to manage — once all three are set, the round is
  // implicitly ready. Edit Bid (below) is the one way back to an editable state.
  const locked = !!bidTeam && bidChosen && !!trump;
  const bidValue = shootMoon ? settings.maxPointsPerRound : bid ?? 0;

  // Bidding happens before trump is called — once a team is on the hook for the bid,
  // give the slider a starting number right away instead of showing an empty state.
  useEffect(() => {
    if (bidTeam && bid == null && !shootMoon) setBid(bids[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidTeam]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6 lg:max-w-xl lg:px-0">
      <header className="flex items-center justify-between">
        <div>
          <button
            onClick={onOpenSettings}
            className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4"
          >
            &larr; Settings
          </button>
          <h1 className="mt-1 font-display text-2xl font-semibold text-parchment lg:text-3xl">
            Round {rounds.length + 1}
          </h1>
        </div>
        <button
          onClick={advanceDealer}
          className="rounded-full bg-parchment/10 px-3 py-1.5 font-body text-xs text-parchment ring-1 ring-parchment/30"
        >
          {DEALER_LABELS[dealerIndex]} &middot; override
        </button>
      </header>

      {/* Compact totals + scoreboard entry point — the sidebar covers this on desktop */}
      <button
        onClick={onOpenScoreboard}
        className="mt-5 flex items-center justify-between rounded-card bg-parchment/10 px-4 py-3 ring-1 ring-parchment/20 lg:hidden"
      >
        <span className="font-body text-xs uppercase tracking-[0.15em] text-parchment/70">
          Scoreboard
        </span>
        <span className="font-score tabular-score text-lg font-bold text-parchment">
          Us {usTotal(rounds)} &middot; Them {themTotal(rounds)}
        </span>
      </button>

      <div className="mt-6 flex-1 space-y-5">
        {/* 1. Who's bidding */}
        <section>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/70">
            Bidding team
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["US", "THEM"] as const).map((team) => (
              <button
                key={team}
                disabled={locked}
                onClick={() => setBidTeam(team)}
                className={`rounded-card py-3 font-body text-sm font-semibold uppercase tracking-wide transition disabled:opacity-50 ${
                  bidTeam === team
                    ? "bg-brass text-ink"
                    : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
                }`}
              >
                {team}
              </button>
            ))}
          </div>
        </section>

        {/* 2. The bid itself — happens before trump is called, like the real auction does */}
        {bidTeam && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/70">
                Bid
              </p>
              <button
                onClick={toggleShootMoon}
                disabled={locked}
                aria-pressed={shootMoon}
                className={`rounded-full px-3 py-1 font-body text-xs font-semibold uppercase tracking-wide disabled:opacity-50 ${
                  shootMoon
                    ? "bg-brass text-ink"
                    : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
                }`}
              >
                Shoot the Moon {shootMoon ? "🌜" : ""}
              </button>
            </div>

            {shootMoon ? (
              <div className="rounded-card bg-parchment/10 p-3 text-center ring-1 ring-parchment/20">
                <div className="font-score tabular-score text-5xl font-bold text-parchment">
                  {settings.maxPointsPerRound}
                </div>
                <div className="font-body text-[10px] uppercase tracking-wide text-parchment/50">
                  All or nothing
                </div>
              </div>
            ) : (
              <BidSlider
                value={bid ?? bids[0]}
                min={bids[0]}
                max={settings.maxPointsPerRound}
                onChange={setBid}
                disabled={locked}
              />
            )}
          </section>
        )}

        {/* 3. Trump — called after the bid is settled; collapses to one card once set */}
        {bidChosen && (
          <section>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/70">
              Trump
            </p>
            <div className="mt-2">
              <TrumpPicker value={trump} bidValue={bidValue} onChange={setTrump} disabled={locked} />
            </div>
          </section>
        )}
      </div>

      <footer className="mt-6 flex gap-3">
        <button
          onClick={clearTrump}
          disabled={!locked}
          className="flex-1 rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] transition disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-parchment/40 disabled:ring-1 disabled:ring-parchment/20 enabled:bg-parchment/10 enabled:text-brass enabled:ring-2 enabled:ring-brass"
        >
          Edit Bid
        </button>
        <button
          onClick={onScoreRound}
          disabled={!locked}
          className="flex-1 rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-ink disabled:opacity-40"
        >
          Score Round
        </button>
      </footer>
    </div>
  );
}
