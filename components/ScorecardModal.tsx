"use client";

import { useMemo, useState } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { calculateRoundScores, isValidNonBidderScore, teamLabel } from "@/lib/rook-engine";
import { useGameStore } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canUseEnhancedStats } from "@/lib/entitlements";
import { Modal } from "./Modal";

export function ScorecardModal({ onClose }: { onClose: () => void }) {
  const { settings, trump, bid, bidTeam, shootMoon, saveRound } = useGameStore();
  const { tier } = useAuthStore();
  const [input, setInput] = useState("");
  const [rookHolderSeat, setRookHolderSeat] = useState<number | null>(null);

  if (!trump || !bidTeam || bid == null) return null;

  const trackRookHolder = canUseEnhancedStats(tier) && settings.players !== null;

  const nonBidder = bidTeam === "US" ? "THEM" : "US";
  const bidderName = teamLabel(bidTeam, settings);
  const nonBidderName = teamLabel(nonBidder, settings);
  const valid = isValidNonBidderScore(input, settings.maxPointsPerRound);
  const nonBidderScore = valid ? Number(input) : 0;

  const preview = useMemo(
    () =>
      calculateRoundScores({
        bidTeam,
        bid,
        maxPointsPerRound: settings.maxPointsPerRound,
        nonBidderScore,
        shootMoon,
      }),
    [bidTeam, bid, settings.maxPointsPerRound, nonBidderScore, shootMoon]
  );

  return (
    <Modal
      onClose={onClose}
      labelledBy="scorecard-title"
      panelClassName="w-full max-w-md rounded-t-card bg-paper p-5 shadow-card sm:rounded-card"
    >
      <h2 id="scorecard-title" className="font-display text-xl font-semibold text-ink">
        Enter {nonBidderName}&rsquo;s score
      </h2>
        <p className="mt-1 font-body text-sm text-ink/75">
          {bidderName} bid {shootMoon ? `${bid} (Shoot the Moon)` : bid}. Enter what{" "}
          {nonBidderName} actually took — in multiples of 5.
        </p>

        <input
          autoFocus
          inputMode="numeric"
          aria-label={`${nonBidderName}'s score`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0"
          className="mt-4 w-full rounded-md border border-ink/20 bg-white px-4 py-3 text-center font-score text-4xl tabular-score text-ink"
        />
        {input !== "" && !valid && (
          <p className="mt-2 font-body text-xs text-trump-red">
            Must be a multiple of 5, between 0 and {settings.maxPointsPerRound}.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-card bg-white p-3 text-center ring-1 ring-ink/10">
            <div className="truncate font-body text-xs uppercase tracking-wide text-ink/75">
              {settings.usTeamName}
            </div>
            <div className="font-score tabular-score text-3xl font-bold text-ink">
              {bidTeam === "US" ? preview.usScore : nonBidderScore || 0}
            </div>
          </div>
          <div className="rounded-card bg-white p-3 text-center ring-1 ring-ink/10">
            <div className="truncate font-body text-xs uppercase tracking-wide text-ink/75">
              {settings.themTeamName}
            </div>
            <div className="font-score tabular-score text-3xl font-bold text-ink">
              {bidTeam === "THEM" ? preview.themScore : nonBidderScore || 0}
            </div>
          </div>
        </div>
        {preview.bidderSet && valid && (
          <p className="mt-2 text-center font-body text-xs font-semibold text-trump-red">
            {bidderName} went set — takes &minus;{bid} for the round.
          </p>
        )}

        {trackRookHolder && (
          <div className="mt-5">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
              Who had the Rook?
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {settings.players!.map((name, seat) => (
                <button
                  key={seat}
                  onClick={() => setRookHolderSeat(rookHolderSeat === seat ? null : seat)}
                  className={`truncate rounded-full py-2 font-body text-sm font-semibold ${
                    rookHolderSeat === seat
                      ? "bg-ink text-paper"
                      : "bg-white text-ink ring-1 ring-ink/20"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-ink ring-1 ring-ink/20"
          >
            Back
          </button>
          <button
            disabled={!valid}
            onClick={() => {
              // No-op outside the native wrapper — Capacitor's web fallback
              // for Haptics is a silent unsupported-feature warning, so gate
              // it explicitly rather than relying on that.
              if (Capacitor.isNativePlatform()) {
                Haptics.impact({ style: ImpactStyle.Medium });
              }
              saveRound(nonBidderScore, trackRookHolder ? rookHolderSeat : null);
              onClose();
            }}
            className="flex-1 rounded-full bg-ink py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-paper disabled:opacity-40"
          >
            Save
          </button>
        </div>
    </Modal>
  );
}
