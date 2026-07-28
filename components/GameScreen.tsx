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
}: {
  onScoreRound: () => void;
  onOpenScoreboard: () => void;
}) {
  const {
    settings,
    rounds,
    trump,
    bid,
    bidTeam,
    bidLocked,
    shootMoon,
    dealerIndex,
    setTrump,
    setBidTeam,
    setBid,
    toggleShootMoon,
    lockBid,
    unlockBid,
    advanceDealer,
  } = useGameStore();

  const bidIsValid = !!trump && !!bidTeam && !!bid;
  const bids = bidOptions(settings.maxPointsPerRound);
  const bidChosen = bid != null || shootMoon;

  // Bidding happens before trump is called — once a team is on the hook for the bid,
  // give the stepper a starting number right away instead of showing an empty state.
  useEffect(() => {
    if (bidTeam && bid == null && !shootMoon) setBid(bids[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidTeam]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6 lg:max-w-xl lg:px-0">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">In Progress</p>
          <h1 className="font-display text-2xl font-semibold text-parchment lg:text-3xl">
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
                disabled={bidLocked}
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
                disabled={bidLocked}
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
                disabled={bidLocked}
              />
            )}
          </section>
        )}

        {/* 3. Trump — called after the bid is settled */}
        {bidChosen && (
          <section>
            <div className="flex items-center justify-between">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/70">
                Trump
              </p>
              {bidLocked && (
                <button
                  onClick={unlockBid}
                  className="font-body text-xs text-brass underline underline-offset-2"
                >
                  Edit bid
                </button>
              )}
            </div>
            <div className="mt-2">
              <TrumpPicker value={trump} onChange={setTrump} disabled={bidLocked} />
            </div>
          </section>
        )}

        {bidChosen && trump && (
          <div
            className="rounded-card p-6 text-center shadow-card"
            style={{
              backgroundColor:
                trump === "Black"
                  ? "#1A1A1A"
                  : trump === "Green"
                  ? "#2F7A3D"
                  : trump === "Red"
                  ? "#B23A32"
                  : "#E3B23C",
            }}
          >
            <div
              className={`font-score tabular-score text-6xl font-bold ${
                trump === "Yellow" ? "text-ink" : "text-parchment"
              }`}
            >
              {shootMoon ? settings.maxPointsPerRound : bid}
            </div>
          </div>
        )}
      </div>

      <footer className="mt-6 flex gap-3">
        <button
          onClick={() => (bidLocked ? unlockBid() : lockBid())}
          disabled={!bidIsValid && !bidLocked}
          className="flex-1 rounded-full bg-parchment/10 py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-parchment ring-1 ring-parchment/30 disabled:opacity-40"
        >
          {bidLocked ? "Edit Bid" : "Lock Bid"}
        </button>
        <button
          onClick={onScoreRound}
          disabled={!bidLocked}
          className="flex-1 rounded-full bg-brass py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-ink disabled:opacity-40"
        >
          Score Round
        </button>
      </footer>
    </div>
  );
}
