// Rook scoring engine — ported from BirdScore_v3.msapp (Game.pa.yaml / Scorecard.pa.yaml)
// Kept as pure functions with no UI or storage dependencies, so this same module
// can run client-side today and inside a Supabase edge function / API route later
// without changes — that's what lets multi-device sync (Phase 2) reuse it as-is.

export type Team = "US" | "THEM";
export type TrumpColor = "Black" | "Green" | "Red" | "Yellow";

export const TRUMP_OPTIONS: { key: TrumpColor; label: string }[] = [
  { key: "Black", label: "Black" },
  { key: "Green", label: "Green" },
  { key: "Red", label: "Red" },
  { key: "Yellow", label: "Yellow" },
];

export interface Round {
  rowId: string;
  round: number;
  usScore: number;
  themScore: number;
  rowType: "Round" | "Adj";
  createdAt: string;
  // Present when rowType === "Round"
  trump?: TrumpColor;
  bidTeam?: Team;
  bid?: number;
  dealerIndex?: number;
  shootMoon?: boolean;
  // Which seat (0-3) held the Rook this round — Pro tier only ("enhanced
  // stats"). Seat, not a player name directly, so it stays meaningful even
  // if resolved against whichever players were in those seats.
  rookHolderSeat?: number | null;
  // Present when rowType === "Adj" — free-text reason since house rules vary
  // table to table (misdeal, renege, moon bonus, etc.) with no fixed amounts.
  label?: string;
}

/** Reassigns sequential .round numbers after a delete — deleteRound used to
 * just filter the array, leaving gaps (round 2 removed from 1/2/3 meant
 * the survivors stayed labeled 1 and 3), and the next scored round got
 * roundsPlayed()+1 = 3 again, since roundsPlayed just counts rows rather
 * than tracking a max. That produced two different rows both labeled
 * "Round 3". Walks in array order (already chronological) and gives each
 * Round row the next sequential number; an Adj row keeps the same
 * semantics addAdjustment already assigns at creation — "how many real
 * rounds had been played when this was added," not its own number. */
export function renumberRounds(rounds: Round[]): Round[] {
  let count = 0;
  return rounds.map((r) => {
    if (r.rowType === "Round") count += 1;
    return { ...r, round: count };
  });
}

/** Count of actual played rounds, excluding adjustment entries — used for round numbering. */
export function roundsPlayed(rounds: Round[]): number {
  return rounds.filter((r) => r.rowType === "Round").length;
}

/** The highest bid already on the board across actual played rounds (0 if
 * none) — used to stop maxPointsPerRound from being lowered below a bid
 * that already happened. calculateRoundScores's bidderWentSet math
 * (nonBidderScore > maxPointsPerRound - bid) silently breaks once
 * maxPointsPerRound < bid: maxPointsPerRound - bid goes negative, which
 * ANY real nonBidderScore is greater than, so re-scoring that round (even
 * just to fix an unrelated field like trump color) always computes as
 * "went set" regardless of what actually happened at the table. */
export function maxBidOnBoard(rounds: Round[]): number {
  return rounds.reduce(
    (max, r) => (r.rowType === "Round" && r.bid != null && r.bid > max ? r.bid : max),
    0
  );
}

export interface GameSettings {
  winningScore: number; // original default: 500
  maxPointsPerRound: number; // original default: 180 (options: 120/150/180/200/250)
  // Custom team names — $3.99 tier and up (see canUseNamedPlayers in
  // lib/entitlements.ts). Always present with sensible defaults so every
  // display call site can use them unconditionally rather than checking
  // for undefined everywhere; the tier gate lives in the Settings UI (only
  // entitled accounts get an editable field), not in this type.
  usTeamName: string;
  themTeamName: string;
  // Named individual players, one per seat, seat 0-3 — the seat ORDER is
  // the dealing rotation order (0 deals first, then 1, 2, 3, back to 0).
  // Partnerships follow the standard 4-player card-game convention of
  // partners sitting across from each other, not next to each other:
  // seats 0+2 are one team, seats 1+3 are the other. null means not using
  // named players (the simple US/THEM-only flow, still the default and
  // still fully supported). $3.99 tier and up, same gate as team names —
  // when this is set, usTeamName/themTeamName get derived from the pairs
  // ("Jon & Ryan") rather than typed manually.
  players: [string, string, string, string] | null;
  // "Win by spread" house rule — some tables end the game the moment the
  // point GAP between the two teams reaches winningScore, not just when
  // either team's own total does (e.g. 380 vs -120 is a 500-point spread,
  // ending a 500-point game even though neither raw total hit 500). Off by
  // default — this changes when a game actually ends, so it needs to be an
  // explicit per-game opt-in rather than silently changing behavior for
  // every table. See checkGameOver.
  spreadWin: boolean;
}

export const SEAT_LABELS = ["North", "East", "South", "West"] as const;

/** Which team a seat belongs to, given the fixed across-the-table pairing. */
export function seatTeam(seat: number): Team {
  return seat % 2 === 0 ? "US" : "THEM";
}

/** Derives "PlayerA & PlayerB" team names from seated players — seats 0+2
 * for one team, 1+3 for the other, matching seatTeam's pairing. */
export function deriveTeamNamesFromPlayers(
  players: [string, string, string, string]
): Pick<GameSettings, "usTeamName" | "themTeamName"> {
  return {
    usTeamName: `${players[0]} & ${players[2]}`,
    themTeamName: `${players[1]} & ${players[3]}`,
  };
}

/** The one place "US"/"THEM" gets turned into a display string — every
 * component should call this instead of hardcoding "Us"/"Them" or showing
 * the raw Team value, so a custom team name actually shows up everywhere
 * instead of in some places and not others. */
/** A single number for formatScore below — negative values in parens
 * (accounting-style), e.g. -120 -> "(120)". The en dash separator alone
 * already stops a negative number from reading as garbage next to a
 * positive one ("635-45" / worse "635--45"), but it still leaves a minus
 * sign sitting right next to the en dash ("250 – -120"), which reads as
 * an odd double-negative even though it's not actually ambiguous. Parens
 * remove the second dash-like glyph entirely. */
function formatSignedScore(n: number): string {
  return n < 0 ? `(${Math.abs(n)})` : `${n}`;
}

/** Score display that stays readable with negative totals. The one
 * place this should be computed — HistoryScreen, GameDetailModal, and
 * the per-round running-total display all use this rather than each
 * formatting scores their own way. */
export function formatScore(us: number, them: number): string {
  return `${formatSignedScore(us)} \u2013 ${formatSignedScore(them)}`;
}

/** Canonical trump colors, in the two formats different rendering
 * contexts actually need — a Tailwind class for elements already in the
 * app's theme system, a hex value for contexts using inline styles (the
 * realtime viewer page, which can't use the app's CSS custom properties
 * the same way). Three components each had their own independent copy of
 * this before; keeping it in one place means a color changing once
 * updates everywhere instead of needing to be found and changed 3+ times. */
export const TRUMP_DOT_CLASS: Record<TrumpColor, string> = {
  Black: "bg-trump-black",
  Green: "bg-trump-green",
  Red: "bg-trump-red",
  Yellow: "bg-trump-yellow",
};
export const TRUMP_HEX: Record<TrumpColor, string> = {
  Black: "#1A1A1A",
  Green: "#2F7A3D",
  Red: "#B23A32",
  Yellow: "#E3B23C",
};

export function teamLabel(team: Team, settings: Pick<GameSettings, "usTeamName" | "themTeamName">): string {
  return team === "US" ? settings.usTeamName : settings.themTeamName;
}

export const MAX_POINTS_OPTIONS = [120, 150, 180, 200, 250] as const;
export const DEFAULT_SETTINGS: GameSettings = {
  winningScore: 500,
  maxPointsPerRound: 180,
  usTeamName: "Us",
  themTeamName: "Them",
  players: null,
  spreadWin: false,
};

/** Custom max-points input must be a positive multiple of 5, within a sane table-rules range. */
export function isValidPositiveMultipleOfFive(rawText: string, min: number, max: number): boolean {
  const text = rawText.trim();
  if (text === "" || !/^\d+$/.test(text)) return false;
  const value = Number(text);
  return value >= min && value <= max && value % 5 === 0;
}

export function isValidCustomMaxPoints(rawText: string): boolean {
  return isValidPositiveMultipleOfFive(rawText, 50, 1000);
}

export function isValidWinningScore(rawText: string, minWinningScore: number): boolean {
  return isValidPositiveMultipleOfFive(rawText, minWinningScore, 5000);
}

/** Bid options: 50 to maxPointsPerRound, in steps of 5. */
export function bidOptions(maxPointsPerRound: number): number[] {
  const options: number[] = [];
  for (let bid = 50; bid <= maxPointsPerRound; bid += 5) {
    options.push(bid);
  }
  return options;
}

/**
 * Quick-bid shortcuts as a fraction of the max points per round, since this app has
 * no bid history yet to compute a real group average from (everything's client-only,
 * nothing persists between sessions). These fractions reflect general Rook bidding
 * convention — most competitive bids land ~55-65% of total points, stronger hands
 * push toward 80-90% — not this group's actual play. Once Phase 2 persistence is in,
 * this can be swapped for a real "your group's average bid" calculation.
 */
export function bidShortcuts(maxPointsPerRound: number, min = 50): number[] {
  const fractions = [0.6, 0.7, 0.8, 0.9];
  const values = fractions.map((f) => {
    const raw = Math.round((maxPointsPerRound * f) / 5) * 5;
    return Math.min(maxPointsPerRound, Math.max(min, raw));
  });
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

/**
 * Bidder's/non-bidder's score for a round, mirroring lblUsCalcScore / lblThemCalcScore.
 * The non-bidding team enters a score (must be a clean multiple of 5, 0..max).
 * The bidding team's score is (max - nonBidderScore), unless that would exceed what
 * they bid for (nonBidderScore > max - bid), in which case the bidder goes SET and
 * scores -bid for the round.
 */
export function calculateRoundScores(params: {
  bidTeam: Team;
  bid: number;
  maxPointsPerRound: number;
  nonBidderScore: number;
  shootMoon: boolean;
}): { usScore: number; themScore: number; bidderSet: boolean } {
  const { bidTeam, bid, maxPointsPerRound, nonBidderScore, shootMoon } = params;

  // Shoot the Moon is fully captured by bid === maxPointsPerRound below —
  // shootMoon itself doesn't change the math. Every caller is expected to
  // keep the two in sync (game-store.ts's toggleShootMoon sets bid to
  // maxPointsPerRound the instant the flag turns on), so this asserts that
  // invariant explicitly rather than leaving shootMoon silently unused —
  // a future caller that drifts from it should fail loudly here, not
  // quietly compute "correct" math for a state that shouldn't exist.
  if (shootMoon && bid !== maxPointsPerRound) {
    throw new Error("calculateRoundScores: shootMoon is true but bid !== maxPointsPerRound");
  }

  // Shoot the Moon: bidding team must take every point (bid == maxPointsPerRound).
  // Any points the "non-bidder" is entered as having taken means the moon shot failed.
  const bidderWentSet = nonBidderScore > maxPointsPerRound - bid;
  const bidderScore = bidderWentSet ? -bid : maxPointsPerRound - nonBidderScore;
  const nonBidderFinal = nonBidderScore;

  if (bidTeam === "US") {
    return { usScore: bidderScore, themScore: nonBidderFinal, bidderSet: bidderWentSet };
  }
  return { usScore: nonBidderFinal, themScore: bidderScore, bidderSet: bidderWentSet };
}

/** Mirrors btnSaveScore's DisplayMode validation gate on the non-bidder's score input. */
export function isValidNonBidderScore(rawText: string, maxPointsPerRound: number): boolean {
  const text = rawText.trim();
  if (text === "" || !/^-?\d+$/.test(text)) return false;
  const value = Number(text);
  if (!Number.isInteger(value)) return false;
  if (value % 5 !== 0) return false;
  if (value < 0 || value > maxPointsPerRound) return false;
  return true;
}

export function teamTotal(rounds: Round[], team: Team): number {
  return rounds.reduce((sum, r) => sum + (team === "US" ? r.usScore : r.themScore), 0);
}

/** spreadWin (default false) adds an alternate win condition on top of the
 * normal "either team's own total reaches winningScore" check: the GAP
 * between the two totals reaching winningScore also ends the game — e.g.
 * 380 vs -120 is a 500-point spread, ending a 500-point game even though
 * neither raw total hit 500. A non-zero spread means the totals can't be
 * equal, so this can't introduce a new tie case beyond the one already
 * handled below. */
export function checkGameOver(
  rounds: Round[],
  winningScore: number,
  spreadWin = false
): { over: boolean; winner: Team | null; usTotal: number; themTotal: number } {
  const usTotal = teamTotal(rounds, "US");
  const themTotal = teamTotal(rounds, "THEM");
  const usCrossed = usTotal >= winningScore;
  const themCrossed = themTotal >= winningScore;
  const spreadCrossed = spreadWin && Math.abs(usTotal - themTotal) >= winningScore;

  if (!usCrossed && !themCrossed && !spreadCrossed) {
    return { over: false, winner: null, usTotal, themTotal };
  }

  if (usTotal === themTotal) {
    // Both crossed the winning score in the same round, exactly tied.
    // This is the one real product decision in this function, not just a
    // bug fix: per the house's own account, a tie this close is rare
    // enough in real play (per-round splits essentially never happen,
    // since bidding dynamics push toward one side taking more than half)
    // that the simplest defensible rule is to just keep playing rather
    // than invent an arbitrary tiebreaker. Change here if that ever
    // stops being the right call.
    return { over: false, winner: null, usTotal, themTotal };
  }

  // Both may have crossed the threshold in the same round (a big
  // adjustment, or a round that pushes one team over while the other was
  // already past it) — whoever actually has the higher total wins. The
  // previous version of this function defaulted to US whenever US had
  // crossed at all, without checking THEM's total — meaning THEM could
  // legitimately be ahead, even by a lot, and US would still be declared
  // the winner. That was the actual bug, not just mishandled ties.
  const winner: Team = usTotal > themTotal ? "US" : "THEM";
  return { over: true, winner, usTotal, themTotal };
}

/** The running us/them total immediately after each row in `rounds` —
 * distinct from both the per-row score (that row's own delta, already on
 * each Round) and the final game total (teamTotal above, just the last
 * entry here). This is what answers "how far back were they at Round 3,"
 * not visible from either of the other two numbers alone. */
export function runningTotals(rounds: Round[]): { usTotal: number; themTotal: number }[] {
  let usTotal = 0;
  let themTotal = 0;
  return rounds.map((r) => {
    usTotal += r.usScore;
    themTotal += r.themScore;
    return { usTotal, themTotal };
  });
}

/** Dealer rotates through 4 seats; only advances automatically once the first dealer is set. */
export function nextDealerIndex(currentIndex: number): number {
  return (currentIndex + 1) % 4;
}

export function newRoundId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
