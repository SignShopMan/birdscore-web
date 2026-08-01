// Verifies lib/entitlements.ts's tier resolution — layered rules (real
// tier + lapse policy, beta-tester grant, dev override) that are easy to
// get subtly wrong. Run with `npx tsx scripts/verify-entitlements.ts`.

import { effectiveTier, isBetaTester, isDevAccount, withinBetaGrantWindow } from "../lib/entitlements";

function assertEqual(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`);
  if (!pass) process.exitCode = 1;
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

// Real tier + lapse policy (no beta/dev involvement)
assertEqual(
  "free stays free",
  effectiveTier({ tier: "free", proCurrentPeriodEnd: null, email: "x@example.com", devTierOverride: null, createdAt: daysAgo(1) }),
  "free"
);
assertEqual(
  "plus stays plus",
  effectiveTier({ tier: "plus", proCurrentPeriodEnd: null, email: "x@example.com", devTierOverride: null, createdAt: daysAgo(1) }),
  "plus"
);
assertEqual(
  "active pro stays pro",
  effectiveTier({
    tier: "pro",
    proCurrentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
    email: "x@example.com",
    devTierOverride: null,
    createdAt: daysAgo(1),
  }),
  "pro"
);
assertEqual(
  "lapsed pro drops to plus, not free",
  effectiveTier({
    tier: "pro",
    proCurrentPeriodEnd: new Date(Date.now() - 86400000).toISOString(),
    email: "x@example.com",
    devTierOverride: null,
    createdAt: daysAgo(1),
  }),
  "plus"
);

// isBetaTester / isDevAccount are case-insensitive and don't match unrelated emails
assertEqual("isDevAccount matches exact", isDevAccount("watkins.jonathan@gmail.com"), true);
assertEqual("isDevAccount case-insensitive", isDevAccount("Watkins.Jonathan@Gmail.com"), true);
assertEqual("isDevAccount rejects others", isDevAccount("someone-else@gmail.com"), false);
assertEqual("isBetaTester rejects null", isBetaTester(null), false);
assertEqual("isBetaTester rejects non-listed email", isBetaTester("random@example.com"), false);
assertEqual("isBetaTester matches a real listed tester", isBetaTester("andyjwatkins@gmail.com"), true);
assertEqual(
  "isBetaTester matches regardless of the case they actually type",
  isBetaTester("Thompsonhomeimprovements@Outlook.com"),
  true
);

// Beta grant window: 12 months per person, anchored to createdAt — not a
// shared date for everyone. Test the date math directly since that's
// exactly the kind of thing worth verifying precisely.
assertEqual("beta window: just created, well within 12 months", withinBetaGrantWindow(daysAgo(1)), true);
assertEqual("beta window: 6 months in, still within", withinBetaGrantWindow(daysAgo(180)), true);
assertEqual("beta window: 13 months ago, expired", withinBetaGrantWindow(daysAgo(395)), false);
assertEqual("beta window: exactly 11 months ago, still within", withinBetaGrantWindow(daysAgo(335)), true);

// Dev override always wins, even over a real "pro" tier — lets the dev
// account test the free/plus view regardless of its own real tier.
assertEqual(
  "dev override beats real pro tier",
  effectiveTier({
    tier: "pro",
    proCurrentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
    email: "watkins.jonathan@gmail.com",
    devTierOverride: "free",
    createdAt: daysAgo(1),
  }),
  "free"
);
assertEqual(
  "dev override does nothing for a non-dev email",
  effectiveTier({ tier: "free", proCurrentPeriodEnd: null, email: "someone-else@gmail.com", devTierOverride: "pro", createdAt: daysAgo(1) }),
  "free"
);
assertEqual(
  "null devTierOverride falls through to real tier even for the dev account",
  effectiveTier({ tier: "plus", proCurrentPeriodEnd: null, email: "watkins.jonathan@gmail.com", devTierOverride: null, createdAt: daysAgo(1) }),
  "plus"
);

console.log("\nDone.");
