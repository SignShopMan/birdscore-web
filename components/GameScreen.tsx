"use client";

import { bidOptions } from "@/lib/rook-engine";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { TrumpPicker } from "./TrumpPicker";

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
          {DEALER_LABELS[dealerIndex]} →
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

        <section className="rounded-card bg-parchment/10 p-4 ring-1 ring-parchment/20">
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-parchment">Shoot the Moon?</p>
            <button
              onClick={toggleShootMoon}
              disabled={bidLocked}
              aria-pressed={shootMoon}
              className={`rounded-full px-4 py-1.5 font-body text-xs font-semibold uppercase tracking-wide disabled:opacity-50 ${
                shootMoon ? "bg-brass text-ink" : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
              }`}
            >
              {shootMoon ? "Yes 🌜" : "No"}
            </button>
          </div>
        </section>

        {!shootMoon && (
          <section>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/70">
              Bid
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {bids.map((b) => (
                <button
                  key={b}
                  disabled={bidLocked}
                  onClick={() => setBid(b)}
                  className={`rounded-full px-4 py-1.5 font-score text-sm tabular-score disabled:opacity-50 ${
                    bid === b
                      ? "bg-brass text-ink"
                      : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </section>
        )}

        {(bid != null || shootMoon) && trump && (
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
