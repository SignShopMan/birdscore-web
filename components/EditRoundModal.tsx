"use client";

import { useMemo, useState } from "react";
import {
  Round,
  Team,
  TrumpColor,
  GameSettings,
  calculateRoundScores,
  isValidNonBidderScore,
  bidOptions,
  teamLabel,
  TRUMP_DOT_CLASS,
} from "@/lib/rook-engine";
import { useAuthStore } from "@/lib/auth-store";
import { canUseEnhancedStats } from "@/lib/entitlements";

const TRUMP_COLORS: TrumpColor[] = ["Black", "Green", "Red", "Yellow"];
const SEAT_LABELS = ["North", "East", "South", "West"];

/**
 * Editing a completed round used to accept two arbitrary numbers with no
 * relationship to each other or to the game's actual rules — a QA report
 * caught a valid 105-75 hand edited to an impossible 100-75 (for a made
 * bid, the two scores are coupled: bidder = maxPoints - nonBidder, so
 * they aren't independent numbers a simple bounds check would catch).
 * This reopens the actual original inputs — team, bid, trump, shoot the
 * moon, the non-bidder's raw score — and always recomputes both scores
 * through the same calculateRoundScores() used for live scoring. There's
 * no path here to save a number that didn't come out of that function.
 */
export function EditRoundModal({
  round,
  settings,
  onSave,
  onClose,
}: {
  round: Round;
  settings: GameSettings;
  onSave: (updated: {
    trump: TrumpColor;
    bidTeam: Team;
    bid: number;
    shootMoon: boolean;
    rookHolderSeat: number | null;
    usScore: number;
    themScore: number;
  }) => void;
  onClose: () => void;
}) {
  const { tier } = useAuthStore();
  const trackRookHolder = canUseEnhancedStats(tier) && settings.players !== null;

  const [bidTeam, setBidTeam] = useState<Team>(round.bidTeam ?? "US");
  const [trump, setTrump] = useState<TrumpColor>(round.trump ?? "Black");
  const [bid, setBid] = useState<number>(round.bid ?? 50);
  const [shootMoon, setShootMoon] = useState(round.shootMoon ?? false);
  const [rookHolderSeat, setRookHolderSeat] = useState<number | null>(round.rookHolderSeat ?? null);

  // The non-bidder's score is the one genuinely free-entered number — see
  // calculateRoundScores: nonBidderFinal is always exactly this value,
  // never transformed, so it's recoverable directly from whichever of
  // usScore/themScore belonged to whoever didn't bid.
  const originalNonBidderScore = round.bidTeam === "US" ? round.themScore : round.usScore;
  const [input, setInput] = useState(String(originalNonBidderScore));

  const valid = isValidNonBidderScore(input, settings.maxPointsPerRound);
  const nonBidderScore = valid ? Number(input) : 0;
  const nonBidder: Team = bidTeam === "US" ? "THEM" : "US";

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

  const save = () => {
    if (!valid) return;
    onSave({
      trump,
      bidTeam,
      bid,
      shootMoon,
      rookHolderSeat: trackRookHolder ? rookHolderSeat : null,
      usScore: preview.usScore,
      themScore: preview.themScore,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-card bg-paper p-5 shadow-card sm:rounded-card">
        <h2 className="font-display text-xl font-semibold text-ink">Edit Round {round.round}</h2>
        <p className="mt-1 font-body text-xs text-ink/60">
          Changes recompute both scores the same way live scoring does — there&rsquo;s no way to
          save a pair of numbers that couldn&rsquo;t actually happen.
        </p>

        <p className="mt-4 font-body text-xs font-semibold uppercase tracking-wide text-ink/60">
          Bidding team
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["US", "THEM"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setBidTeam(t)}
              className={`truncate rounded-full py-2 font-body text-sm font-semibold ${
                bidTeam === t ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
              }`}
            >
              {teamLabel(t, settings)}
            </button>
          ))}
        </div>

        <p className="mt-4 font-body text-xs font-semibold uppercase tracking-wide text-ink/60">
          Trump
        </p>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {TRUMP_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setTrump(c)}
              className={`flex flex-col items-center gap-1 rounded-md py-2 ${
                trump === c ? "bg-ink" : "bg-white ring-1 ring-ink/20"
              }`}
            >
              <span className={`h-3 w-3 rounded-full ${TRUMP_DOT_CLASS[c]}`} aria-hidden />
              <span className={`font-body text-[11px] font-semibold ${trump === c ? "text-paper" : "text-ink"}`}>
                {c}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 font-body text-xs font-semibold uppercase tracking-wide text-ink/60">Bid</p>
        <select
          value={bid}
          onChange={(e) => setBid(Number(e.target.value))}
          className="mt-1.5 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-score text-lg tabular-score text-ink"
        >
          {bidOptions(settings.maxPointsPerRound).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <label className="mt-3 flex items-center gap-2 font-body text-sm text-ink">
          <input
            type="checkbox"
            checked={shootMoon}
            onChange={(e) => setShootMoon(e.target.checked)}
            className="accent-brass"
          />
          Shoot the Moon
        </label>

        <p className="mt-4 font-body text-xs font-semibold uppercase tracking-wide text-ink/60">
          {teamLabel(nonBidder, settings)}&rsquo;s score
        </p>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${teamLabel(nonBidder, settings)}'s score`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-score text-lg tabular-score text-ink"
        />
        {!valid && (
          <p className="mt-1 font-body text-xs text-trump-red">
            Must be a multiple of 5, between 0 and {settings.maxPointsPerRound}.
          </p>
        )}

        {trackRookHolder && (
          <>
            <p className="mt-4 font-body text-xs font-semibold uppercase tracking-wide text-ink/60">
              Who had the Rook?
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {settings.players!.map((name, seat) => (
                <button
                  key={seat}
                  onClick={() => setRookHolderSeat(rookHolderSeat === seat ? null : seat)}
                  className={`truncate rounded-full py-2 font-body text-sm font-semibold ${
                    rookHolderSeat === seat ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
                  }`}
                >
                  {name} <span className="font-normal opacity-70">({SEAT_LABELS[seat]})</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 rounded-card bg-paper-dim p-3 text-center">
          <p className="font-body text-[10px] uppercase tracking-wide text-ink/50">Recomputed result</p>
          <p className="mt-1 font-score tabular-score text-2xl font-bold text-ink">
            {preview.usScore} &ndash; {preview.themScore}
          </p>
          {preview.bidderSet && (
            <p className="mt-1 font-body text-xs font-semibold text-trump-red">
              {teamLabel(bidTeam, settings)} went set &mdash; takes &minus;{bid}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-ink ring-1 ring-ink/20"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!valid}
            className="flex-1 rounded-full bg-ink py-3 font-body text-sm font-semibold uppercase tracking-[0.15em] text-paper disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
