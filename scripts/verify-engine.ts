import {
  calculateRoundScores,
  isValidNonBidderScore,
  checkGameOver,
  bidOptions,
  bidShortcuts,
  isValidWinningScore,
  teamTotal,
  roundsPlayed,
  teamLabel,
  formatScore,
  DEFAULT_SETTINGS,
  Round,
} from "../lib/rook-engine";
import { generateJoinCode, joinCodeChannel, isValidJoinCodeFormat } from "../lib/join-code";
import { computePartnershipStats } from "../lib/partner-stats";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`);
  if (!pass) process.exitCode = 1;
}

// Bid team makes it: US bids 60 of 180, THEM (non-bidder) took 50 -> US 130, THEM 50
assertEqual(
  "bidder makes bid",
  calculateRoundScores({ bidTeam: "US", bid: 60, maxPointsPerRound: 180, nonBidderScore: 50, shootMoon: false }),
  { usScore: 130, themScore: 50, bidderSet: false }
);

// Bid team goes set: US bids 60, THEM took 130 (>120 threshold) -> US -60, THEM 130
assertEqual(
  "bidder goes set",
  calculateRoundScores({ bidTeam: "US", bid: 60, maxPointsPerRound: 180, nonBidderScore: 130, shootMoon: false }),
  { usScore: -60, themScore: 130, bidderSet: true }
);

// Shoot the moon succeeds: bid == max, non-bidder took 0
assertEqual(
  "shoot the moon succeeds",
  calculateRoundScores({ bidTeam: "US", bid: 180, maxPointsPerRound: 180, nonBidderScore: 0, shootMoon: true }),
  { usScore: 180, themScore: 0, bidderSet: false }
);

// Shoot the moon fails: non-bidder took any points at all
assertEqual(
  "shoot the moon fails",
  calculateRoundScores({ bidTeam: "US", bid: 180, maxPointsPerRound: 180, nonBidderScore: 5, shootMoon: true }),
  { usScore: -180, themScore: 5, bidderSet: true }
);

// Validation: multiples of 5 only, 0..max, numeric
assertEqual("valid score 50", isValidNonBidderScore("50", 180), true);
assertEqual("invalid: not mult of 5", isValidNonBidderScore("53", 180), false);
assertEqual("invalid: negative", isValidNonBidderScore("-5", 180), false);
assertEqual("invalid: exceeds max", isValidNonBidderScore("200", 180), false);
assertEqual("invalid: empty", isValidNonBidderScore("", 180), false);

// Winning score validation — guards against the leading-zero bug: an empty or "0"
// string must stay invalid rather than silently becoming a valid 0 that gets
// committed to state and re-rendered before the next keystroke lands. The floor
// is now tied to the round's max points, not a flat 50 — a winning score below
// the round max is nonsensical.
assertEqual("winning score valid 500 at 180 max", isValidWinningScore("500", 180), true);
assertEqual("winning score invalid empty", isValidWinningScore("", 180), false);
assertEqual("winning score invalid zero", isValidWinningScore("0", 180), false);
assertEqual("winning score invalid not mult of 5", isValidWinningScore("501", 180), false);
assertEqual("winning score below round max is invalid", isValidWinningScore("100", 180), false);
assertEqual("winning score equal to round max is valid", isValidWinningScore("180", 180), true);

// Game over detection
const over = checkGameOver(
  [
    { rowId: "1", round: 1, trump: "Red", bidTeam: "US", bid: 60, dealerIndex: 0, shootMoon: false, usScore: 480, themScore: 20, rowType: "Round", createdAt: "" },
    { rowId: "2", round: 2, trump: "Green", bidTeam: "US", bid: 60, dealerIndex: 1, shootMoon: false, usScore: 40, themScore: 20, rowType: "Round", createdAt: "" },
  ],
  500
);
assertEqual("game over at 500", over, { over: true, winner: "US", usTotal: 520, themTotal: 40 });

// Regression: the QA report's exact tie scenario — 180 winning score,
// two rounds of 90-90, final 180-180. The old logic declared "US wins"
// unconditionally whenever US crossed the threshold, without checking
// whether THEM had too. Ties this exact continue playing (see the
// comment on checkGameOver for why).
const exactTie = checkGameOver(
  [
    { rowId: "1", round: 1, trump: "Red", bidTeam: "US", bid: 90, dealerIndex: 0, shootMoon: false, usScore: 90, themScore: 90, rowType: "Round", createdAt: "" },
    { rowId: "2", round: 2, trump: "Green", bidTeam: "THEM", bid: 90, dealerIndex: 1, shootMoon: false, usScore: 90, themScore: 90, rowType: "Round", createdAt: "" },
  ],
  180
);
assertEqual("exact tie at winning score continues, no winner declared", exactTie, { over: false, winner: null, usTotal: 180, themTotal: 180 });

// Regression: both teams crossed the threshold, but THEM is actually
// ahead — the old bug declared US the winner here too, since it never
// compared the two totals against each other, only against the
// threshold. This is the more serious case: not a tie at all, just wrong.
const bothCrossedThemAhead = checkGameOver(
  [
    { rowId: "1", round: 1, trump: "Black", bidTeam: "THEM", bid: 180, dealerIndex: 0, shootMoon: false, usScore: 180, themScore: 200, rowType: "Round", createdAt: "" },
  ],
  180
);
assertEqual("both crossed, THEM actually ahead, THEM wins", bothCrossedThemAhead, { over: true, winner: "THEM", usTotal: 180, themTotal: 200 });

// Bid options respect the max-points ceiling
assertEqual("bid options capped at 150", bidOptions(150), [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150]);

// Regression: a custom max above the old hardcoded 200 ceiling must still generate all bids up to it
const bids230 = bidOptions(230);
assertEqual("bid options reach a custom 230 max", bids230[bids230.length - 1], 230);
assertEqual("bid options count for 230 max", bids230.length, 37); // 50..230 step 5

// Bid shortcuts scale with the configured max, rounded to steps of 5
assertEqual("bid shortcuts at 180 max", bidShortcuts(180), [110, 125, 145, 160]);
assertEqual("bid shortcuts at custom 230 max", bidShortcuts(230), [140, 160, 185, 205]);

// Adjustment entries (penalties/bonuses) reuse the Round shape and must fold into
// totals and win detection the same way actual rounds do, with no special-casing.
const withAdjustment: Round[] = [
  { rowId: "1", round: 1, trump: "Red", bidTeam: "US", bid: 60, dealerIndex: 0, shootMoon: false, usScore: 130, themScore: 50, rowType: "Round", createdAt: "" },
  { rowId: "2", round: 1, usScore: 0, themScore: -25, rowType: "Adj", label: "Renege", createdAt: "" },
  { rowId: "3", round: 1, usScore: 50, themScore: 0, rowType: "Adj", label: "Moon bonus", createdAt: "" },
];
assertEqual("adjustments fold into US total", teamTotal(withAdjustment, "US"), 180);
assertEqual("adjustments fold into THEM total", teamTotal(withAdjustment, "THEM"), 25);
assertEqual(
  "adjustments can push a team over the winning score",
  checkGameOver(withAdjustment, 180),
  { over: true, winner: "US", usTotal: 180, themTotal: 25 }
);

// Adjustment entries must not count toward round numbering
assertEqual("roundsPlayed excludes adjustments", roundsPlayed(withAdjustment), 1);

// teamLabel falls back to defaults, and reflects a custom name once set
assertEqual("teamLabel default US", teamLabel("US", DEFAULT_SETTINGS), "Us");
assertEqual("teamLabel default THEM", teamLabel("THEM", DEFAULT_SETTINGS), "Them");
assertEqual(
  "teamLabel custom name",
  teamLabel("US", { usTeamName: "The Watkins", themTeamName: "Them" }),
  "The Watkins"
);

// Join codes: right length, safe alphabet (no 0/O/1/I/L ambiguity), correct channel format
const code = generateJoinCode();
assertEqual("join code length", code.length, 6);
assertEqual("join code excludes ambiguous chars", /[0O1IL]/.test(code), false);
assertEqual("join code channel format", joinCodeChannel("ABC123"), "game:ABC123");

// Regression: the QA report's exact examples of nonsense codes the watch
// page previously accepted as if they were real
assertEqual("rejects punctuation (QA report example)", isValidJoinCodeFormat("!!!!!!"), false);
assertEqual("rejects wrong length", isValidJoinCodeFormat("AB12CD1"), false);
assertEqual("rejects ambiguous excluded chars", isValidJoinCodeFormat("O0IL1X"), false);
assertEqual("accepts a real-shaped code", isValidJoinCodeFormat("ABCDEF"), true);
assertEqual("normalizes lowercase", isValidJoinCodeFormat("abcdef"), true);
assertEqual("normalizes surrounding whitespace", isValidJoinCodeFormat("  ABCDEF  "), true);

// Partner-pairing stats: North+South vs East+West, keyed regardless of
// which seat each player sat in, only completed games with a winner count
const games = [
  { players: ["Jon", "Kevin", "Ryan", "Jared"] as const, winner: "US" as const, status: "completed" as const }, // Jon+Ryan win
  { players: ["Kevin", "Jon", "Jared", "Ryan"] as const, winner: "THEM" as const, status: "completed" as const }, // Jon+Ryan win (different seats, same pair)
  { players: ["Jon", "Jared", "Kevin", "Ryan"] as const, winner: "THEM" as const, status: "completed" as const }, // Jon+Kevin lose
  { players: ["Jon", "Kevin", "Ryan", "Jared"] as const, winner: "THEM" as const, status: "in_progress" as const }, // excluded: not completed
];
const stats = computePartnershipStats(games as never);
const jonRyan = stats.find((s) => s.players.includes("Jon") && s.players.includes("Ryan"));
const jonKevin = stats.find((s) => s.players.includes("Jon") && s.players.includes("Kevin"));
assertEqual("Jon+Ryan games played", jonRyan?.gamesPlayed, 2);
assertEqual("Jon+Ryan wins", jonRyan?.wins, 2);
assertEqual("Jon+Kevin games played", jonKevin?.gamesPlayed, 1);
assertEqual("Jon+Kevin losses", jonKevin?.losses, 1);
assertEqual("in-progress game excluded from stats (3 completed x 2 pairs each)", stats.reduce((n, s) => n + s.gamesPlayed, 0), 6);

// formatScore: readable regardless of sign on either side
assertEqual("formatScore both positive", formatScore(500, 190), "500 \u2013 190");
assertEqual("formatScore negative second stays unambiguous", formatScore(500, -190), "500 \u2013 -190");
assertEqual("formatScore negative first", formatScore(-45, 635), "-45 \u2013 635");

console.log("\nDone.");
