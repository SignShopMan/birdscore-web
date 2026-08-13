"use client";

import { useEffect, useState } from "react";
import { bidOptions, roundsPlayed, teamLabel } from "@/lib/rook-engine";
import { useGameStore, usTotal, themTotal } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canHostRealtime } from "@/lib/entitlements";
import { TrumpPicker } from "./TrumpPicker";
import { BidSlider } from "./BidSlider";
import { BidderPicker } from "./BidderPicker";
import { MainMenu } from "./MainMenu";
import { InviteScreen } from "./InviteScreen";
import { DealerPickerModal } from "./DealerPickerModal";
import { UndoToast } from "./UndoToast";

const SEAT_FALLBACK_LABELS = ["Seat 1", "Seat 2", "Seat 3", "Seat 4"];

export function GameScreen({
  onScoreRound,
  onOpenScoreboard,
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onOpenResources,
}: {
  onScoreRound: () => void;
  onOpenScoreboard: () => void;
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onOpenResources: () => void;
}) {
  const {
    settings,
    rounds,
    trump,
    bid,
    bidTeam,
    bidderSeat,
    shootMoon,
    dealerIndex,
    joinCode,
    viewerCount,
    syncStatus,
    setTrump,
    clearTrump,
    setBidTeam,
    setBidderSeat,
    setBid,
    toggleShootMoon,
    setDealerIndex,
  } = useGameStore();
  const { tier } = useAuthStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [dealerPickerOpen, setDealerPickerOpen] = useState(false);
  const isHost = canHostRealtime(tier);

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
      <header>
        <div className="flex items-center justify-between">
          <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} onOpenResources={onOpenResources} />
          {/* Beta feedback: this used to be a text-xs pill the same subtle
              weight as everything else in the header, easy to miss at a
              glance mid-game. Bumped to the same brass-banner treatment the
              invite code already uses for "this matters, look here" — the
              dealer name itself is now the visually dominant part, "change"
              demoted to a small hint rather than competing with it. */}
          <button
            onClick={() => setDealerPickerOpen(true)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-brass/20 px-4 py-2 font-body text-sm font-semibold text-parchment ring-1 ring-brass/50"
          >
            <span className="font-normal text-parchment/70">Dealer</span>
            <span>{settings.players ? settings.players[dealerIndex] : SEAT_FALLBACK_LABELS[dealerIndex]}</span>
            <span className="font-normal text-parchment/50">&middot; change</span>
          </button>
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold text-parchment lg:text-3xl">
          Round {roundsPlayed(rounds) + 1}
        </h1>
        <UndoToast />
      </header>

      {/* Prominent by design — this used to only live inside the mobile
          Scoreboard sheet, which meant a pro host had no visible way to
          find their own invite code without an extra tap into a sub-sheet.
          Now it's the first thing under the header, same on mobile and
          desktop. */}
      {isHost && (
        <button
          onClick={() => setInviteOpen(true)}
          className={`mt-4 flex items-center justify-between rounded-card px-4 py-3 ring-1 ${
            !joinCode && syncStatus === "error"
              ? "bg-trump-red/20 ring-trump-red/50"
              : "bg-brass/20 ring-brass/50"
          }`}
        >
          <span className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-parchment">
            {joinCode
              ? "Invite others to watch"
              : syncStatus === "error"
              ? "Couldn't create invite \u2014 tap for details"
              : "Generating invite code\u2026"}
          </span>
          {joinCode && (
            <span className="font-score tabular-score text-lg font-bold text-parchment">
              {joinCode}
              {viewerCount > 0 && (
                <span className="ml-2 font-body text-xs font-normal text-parchment/75">
                  &middot; {viewerCount} watching
                </span>
              )}
            </span>
          )}
        </button>
      )}

      {inviteOpen && <InviteScreen onClose={() => setInviteOpen(false)} />}
      {dealerPickerOpen && (
        <DealerPickerModal
          currentIndex={dealerIndex}
          players={settings.players}
          onSelect={setDealerIndex}
          onClose={() => setDealerPickerOpen(false)}
        />
      )}

      {/* Compact totals + scoreboard entry point — the sidebar covers this on desktop.
          Stacked (label above totals) rather than one crowded line — a single
          "Scoreboard" + "Kevin/Jon 45 · Jared/Ryan 60" row wraps badly the moment
          team names are longer than the original "Us"/"Them" defaults. */}
      <button
        onClick={onOpenScoreboard}
        className="mt-5 flex flex-col gap-1 rounded-card bg-parchment/10 px-4 py-3 ring-1 ring-parchment/20 lg:hidden"
      >
        <span className="font-body text-xs uppercase tracking-[0.15em] text-parchment/75">
          Scoreboard
        </span>
        <span className="flex items-center justify-between gap-3 font-score tabular-score text-lg font-bold text-parchment">
          <span
            className={`truncate ${usTotal(rounds) > themTotal(rounds) ? "text-brass" : ""}`}
          >
            {settings.usTeamName} {usTotal(rounds)}
          </span>
          <span
            className={`shrink-0 truncate ${themTotal(rounds) > usTotal(rounds) ? "text-brass" : ""}`}
          >
            {settings.themTeamName} {themTotal(rounds)}
          </span>
        </span>
      </button>

      <div className="mt-6 flex-1 space-y-5">
        {/* 1. Who's bidding — pass players down to the winner when named
               players are set (derives the team, no separate team pick to
               get wrong); falls back to the plain team pick otherwise,
               since there are no individual seats to attribute a bid to. */}
        <section>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
            {settings.players ? "Tap who passes" : "Bidding team"}
          </p>
          <div className="mt-2">
            {settings.players ? (
              <BidderPicker
                players={settings.players}
                bidderSeat={bidderSeat}
                onSelectBidder={setBidderSeat}
                disabled={locked}
                resetKey={rounds.length}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(["US", "THEM"] as const).map((team) => (
                  <button
                    key={team}
                    disabled={locked}
                    onClick={() => setBidTeam(team)}
                    className={`truncate rounded-card py-3 font-body text-sm font-semibold uppercase tracking-wide transition disabled:opacity-50 ${
                      bidTeam === team
                        ? "bg-brass text-ink"
                        : "bg-parchment/10 text-parchment ring-1 ring-parchment/30"
                    }`}
                  >
                    {teamLabel(team, settings)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 2. The bid itself — happens before trump is called, like the real auction does.
               Once trump is called, this whole section gives way to the collapsed card below;
               Edit Bid clears trump to bring it back rather than leaving it visible-but-disabled. */}
        {bidTeam && !trump && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
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
                <div className="font-body text-[10px] uppercase tracking-wide text-parchment/75">
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
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
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
          className="flex-1 rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] transition disabled:cursor-not-allowed disabled:bg-transparent disabled:text-parchment/60 disabled:ring-1 disabled:ring-parchment/20 enabled:bg-parchment/10 enabled:text-brass enabled:ring-2 enabled:ring-brass"
        >
          Edit Bid
        </button>
        <button
          onClick={onScoreRound}
          disabled={!locked}
          className="flex-1 rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] transition disabled:cursor-not-allowed disabled:bg-transparent disabled:text-parchment/60 disabled:ring-1 disabled:ring-parchment/20 enabled:bg-brass enabled:text-ink"
        >
          Score Round
        </button>
      </footer>
    </div>
  );
}
