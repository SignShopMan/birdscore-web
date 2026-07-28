import {
  calculateRoundScores,
  isValidNonBidderScore,
  checkGameOver,
  bidOptions,
  bidShortcuts,
} from "../lib/rook-engine";

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

// Game over detection
const over = checkGameOver(
  [
    { rowId: "1", round: 1, trump: "Red", bidTeam: "US", bid: 60, dealerIndex: 0, shootMoon: false, usScore: 480, themScore: 20, rowType: "Round", createdAt: "" },
    { rowId: "2", round: 2, trump: "Green", bidTeam: "US", bid: 60, dealerIndex: 1, shootMoon: false, usScore: 40, themScore: 20, rowType: "Round", createdAt: "" },
  ],
  500
);
assertEqual("game over at 500", over, { over: true, winner: "US", usTotal: 520, themTotal: 40 });

// Bid options respect the max-points ceiling
assertEqual("bid options capped at 150", bidOptions(150), [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150]);

// Regression: a custom max above the old hardcoded 200 ceiling must still generate all bids up to it
const bids230 = bidOptions(230);
assertEqual("bid options reach a custom 230 max", bids230[bids230.length - 1], 230);
assertEqual("bid options count for 230 max", bids230.length, 37); // 50..230 step 5

// Bid shortcuts scale with the configured max, rounded to steps of 5
assertEqual("bid shortcuts at 180 max", bidShortcuts(180), [110, 125, 145, 160]);
assertEqual("bid shortcuts at custom 230 max", bidShortcuts(230), [140, 160, 185, 205]);

console.log("\nDone.");
