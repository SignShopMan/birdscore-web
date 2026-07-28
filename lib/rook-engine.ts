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
  trump: TrumpColor;
  bidTeam: Team;
  bid: number;
  dealerIndex: number;
  shootMoon: boolean;
  usScore: number;
  themScore: number;
  rowType: "Round" | "Adj";
  createdAt: string;
}

export interface GameSettings {
  winningScore: number; // original default: 500
  maxPointsPerRound: number; // original default: 180 (options: 120/150/180/200/250)
}

export const MAX_POINTS_OPTIONS = [120, 150, 180, 200, 250] as const;
export const DEFAULT_SETTINGS: GameSettings = {
  winningScore: 500,
  maxPointsPerRound: 180,
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

export function isValidWinningScore(rawText: string): boolean {
  return isValidPositiveMultipleOfFive(rawText, 50, 5000);
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

export function checkGameOver(
  rounds: Round[],
  winningScore: number
): { over: boolean; winner: Team | null; usTotal: number; themTotal: number } {
  const usTotal = teamTotal(rounds, "US");
  const themTotal = teamTotal(rounds, "THEM");
  const over = usTotal >= winningScore || themTotal >= winningScore;
  const winner = over ? (usTotal >= winningScore ? "US" : "THEM") : null;
  return { over, winner, usTotal, themTotal };
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
