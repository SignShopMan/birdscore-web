# BirdScore Web

A Rook scorekeeper, rebuilt from the `BirdScore_v3.msapp` Power Apps prototype as a
Next.js web app. Phase 1 (this drop) is a fully playable, faithful port of the
original game logic — no accounts or billing yet. Phases 2–4 below are the path to
the accounts + paywall version you're after.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Play a full game — Settings → bid → trump → score
each round → Game Over — and check it matches how the Power Apps version behaved.

`npm run build` does a production build. Note: `next/font/google` needs internet
access at build time to fetch Fraunces/Inter/Space Mono — that's normal and will
work fine on your machine and on Vercel; it's only blocked in the sandboxed
environment I built this in.

## Changelog

**Beta round 8** — contrast audit:
- **The reported bug**: trump-card text used `text-parchment` (theme-reactive)
  on Black/Green/Red instead of a constant — fine in dark mode where
  parchment resolves near-white, broken in light mode where it resolves
  near-black. Now `text-white` on Black/Green/Red, `text-ink` on Yellow —
  both constants, since trump colors themselves are constants.
- **A bigger version of the same bug, found while auditing**: every "selected"
  pill (team picker, mode picker, accent picker, max-points preset, custom
  toggle) used `bg-ink text-parchment`. `ink` is a constant; in light mode
  `parchment` resolves to that *same* value — navy text on a navy background,
  completely invisible. Now `bg-ink text-paper` (paper is the one other
  always-cream constant, so visually this is unchanged from how it always
  looked in dark mode — light mode just now actually shows it too).
- **Systemic sweep**: every opacity-muted text/icon color in the app
  (`text-parchment/40..60`, `text-ink/40..60` — subtitles, captions, labels,
  the ledger's edit/delete icons) got checked numerically, not eyeballed.
  Several failed WCAG AA (4.5:1) even in the *original* dark-only design —
  this wasn't only a light-mode problem. Standardized on a 75% opacity floor
  (verified with real margin, not a razor's-edge pass) across the board.
- **Added `scripts/verify-contrast.ts`** — a permanent, run-anytime check
  covering every real text/background pairing in the app (all 6 mode×accent
  combos, the trump card, selected pills, muted text) against WCAG AA. Run it
  after any future color or opacity change: `npx tsx scripts/verify-contrast.ts`.
  This is how round 8 got found systematically instead of by re-screenshotting
  every screen by hand — worth running as a habit from here on, the same way
  `verify-engine.ts` already gets run for scoring logic changes.

**Beta round 7**:
- Light-mode felt colors were nearly indistinguishable between accents (RGB
  distance of 6-14 between green/blue/mono — genuinely invisible). Replaced
  with more saturated values (distance now 30-42) while contrast against ink
  text actually *improved* slightly (7.85-10.30:1, checked numerically, all
  well past WCAG AA). Old pale-pastel values were the bug; not a taste call.
- The "leading" indicator was previously just a subtle background tint
  (`bg-brass/25`) — too subtle to read at a glance in a close game. Added an
  explicit "Leading" badge on the ahead team's total card (`ScoreTotals.tsx`),
  plus a bolded/brass-colored total in the compact mobile strip on the Game
  screen for the same reason.
- Settings cards (Winning score, Max points, Appearance) are now collapsible
  (`CollapsibleCard.tsx`) — click the header to fold/unfold. All default open
  so nothing's hidden on first visit; if a collapsed card has an invalid
  value, a small red dot appears next to its chevron so a disabled Save/Start
  button doesn't look unexplained.
- Theme preview swatches in Settings now reflect whichever mode is actually
  active (light vs dark) instead of always previewing the dark-mode hex —
  pulled from a single `THEME_PALETTE` source of truth in `theme-store.ts` so
  the JS preview and the CSS in `globals.css` can't silently drift apart.

**Beta round 6** — theme picker:
- Settings now has an Appearance card: System/Light/Dark mode, and a felt color
  choice (Green/Blue/Monochrome). Applies immediately, independent of the
  "Save"/"Start Game" flow, since it's an app preference rather than a game
  rule. Persisted to `localStorage` (key `birdscore-theme`) via zustand's
  `persist` middleware — this is a real deployed app, not a Claude artifact,
  so `localStorage` is the correct tool here.
- **Trump colors (Black/Green/Red/Yellow) deliberately don't theme.** They have
  to match the physical Rook deck regardless of which app theme someone's
  chosen, so they're a constant, not a preference — same for the cream
  scorepad-paper surface (`paper`/`paper-dim` in `tailwind.config.ts`), which
  represents a physical paper scorepad and shouldn't flip with dark/light mode.
  Only the table felt and on-felt text (`felt`, `felt-dark`, `parchment`) are
  theme-reactive, via CSS custom properties set per `data-mode`/`data-accent`
  on `<html>` (`app/globals.css`). All 8 text/background combinations checked
  against WCAG AA (4.5:1) — all pass comfortably, most above AAA (7:1).
- No flash of the wrong theme on load: a small inline script
  (`next/script`, `beforeInteractive`) reads `localStorage` and sets
  `data-mode`/`data-accent` before first paint; `ThemeInit.tsx` keeps it in
  sync reactively afterward, including live updates if the OS theme changes
  mid-session while "System" is selected.
- **On colorblind accessibility**: rather than a togglable "colorblind mode"
  (which implies most people don't get the accessible version), the fix went
  in as a permanent, always-on change — the Scoreboard ledger row was the one
  place in the app relying on trump color *alone*, with no text label (the
  picker and the collapsed in-round card both already paired color with a
  text label). It now always shows the trump name as text too. This works
  for every type of color vision deficiency without needing to redesign the
  four trump hues, which can't change anyway since they have to match the
  cards. A next step, if wanted: distinct shapes per trump color (not just
  color) in the ledger dot and picker swatches, on top of the text that's
  there now.

**Beta round 5** (from a screenshot of real gameplay):
- The `Adj` row marker was brass (`#C9A227`), which sits close enough to Yellow
  trump (`#E3B23C`) to be indistinguishable at 10px — a real "Renege" row was
  unreadable against a Yellow-trump round right above it. Changed to a square
  instead of a circle, so the shape itself disambiguates regardless of color.
- The mobile scoreboard sheet was `bg-felt-dark/95`, letting the Game screen
  ghost through behind it (visible "SETTINGS," "Round 3," dealer pill in the
  screenshot). It's a full-screen takeover, not a translucent overlay — now
  fully opaque.
- Adjustment rows showed "0" for the team not affected by that adjustment,
  ambiguous against a team genuinely scoring 0 in a real round. Now shows a
  dash instead.

**Beta round 4**:
- Winning score can no longer be set below the configured max points per round —
  the floor is now dynamic (`isValidWinningScore` takes the round max as a
  parameter) instead of a flat 50, since a winning score under the round max was
  never sensible in the first place.
- The collapsed trump/bid card is bigger (`text-8xl`/`text-9xl`, more padding),
  and the bid section (slider, shortcuts, Shoot the Moon toggle) now disappears
  entirely once trump is called instead of just greying out — Edit Bid brings it
  back by clearing trump.
- Added a fully optional penalty/bonus workflow, reachable from the Scoreboard
  ("+ Penalty / Bonus"): pick a team, Penalty or Bonus, a point value, and a
  free-text reason (misdeal, renege, moon bonus — whatever your table uses,
  since there's no fixed amount for any of these). These show up as `Adj` rows
  in the ledger, separate from `Round` rows, and fold into totals and win
  detection the same way rounds do (`Round` type now covers both; `roundsPlayed`
  excludes adjustments from round numbering so "Round 4" still means the 4th
  hand actually played).

**Beta round 3**:
- Trump picker now collapses into a single card (trump color + bid, large) once
  trump is called, instead of staying a 4-swatch grid with one highlighted — matches
  what the original prototype did, and it's the thing everyone at the table actually
  needs to read during the round (`TrumpPicker.tsx`).
- Removed the manual "Lock Bid" step. There's no `bidLocked` state anymore — once
  team + bid + trump are all set, the round is automatically ready to score. In its
  place, an "Edit Bid" button lights up (goes from greyed-out to a filled brass
  outline) once there's something to edit, and resets trump so you can recall it.
  Team and bid stay directly editable the whole time — only trump collapses, so
  only trump needs an explicit way back.
- Fixed a real bug: the winning-score field was a `type="number"` input whose state
  was a `number`, re-coerced from `e.target.value` on every keystroke. Selecting all
  and typing over it hit a keystroke where the field was momentarily empty,
  `Number("")` evaluated to `0`, and that got committed and re-rendered before the
  next digit landed — hence the leading zero. Fixed by making it string-backed with
  its own validation, same pattern the custom max-points field already used.
- Added a way back to Settings: a "← Settings" link in the Game screen header edits
  the rules for the game already in progress without touching rounds already scored
  (`updateSettings` in the store, separate from `startGame`'s full reset). Game Over
  also got a "Change settings before the next game" link, pre-filled with whatever
  was just used rather than resetting to defaults.

**Beta round 2**:
- Replaced the ±5 stepper with a slider — dragging from 55 to 125 was a lot of taps.
- Added quick-bid shortcut chips below the slider (`lib/rook-engine.ts`:
  `bidShortcuts`) at 60/70/80/90% of the configured max, rounded to steps of 5.
  These are based on general Rook bidding convention (competitive bids commonly
  land ~55-65% of total points, strong hands push 80-90%) — **not** measured
  from your group's actual games, since nothing persists yet. Worth revisiting
  once Phase 2 has real data to compute this group's actual average bid instead.

**Beta round 1** (post-launch feedback):
- Bid now comes before trump (matches how the real auction works) — trump picker is
  hidden until a bid is set.
- Replaced the full row of bid buttons with a stepper (±5) — was 27+ buttons at a
  180 max, unreadable at 250+.
- Fixed a real bug: `bidOptions()` was hardcoded to stop generating at 200, so a
  230-point max (as a beta tester requested) silently made bids above 200
  unreachable. Now scales to any max.
- Settings now supports a custom max points per hand, not just the five presets.
- Dealer seat was only auto-advancing if you happened to tap the header control
  once at game start to "arm" it — an undiscoverable gate most people would never
  trigger. It now always auto-advances after each round is scored; the header
  control is a manual override for corrections only.
- Added a persistent "Beta · send feedback" mailto link (bottom-right, all
  screens) pointed at `feedback@therealbirdscore.com` — swap the address in
  `components/FeedbackLink.tsx` if you'd rather use something else. You'll need
  to set up that inbox/forwarding on your end; the app side is just the link.

## Scoreboard & responsive layout

`components/Scoreboard.tsx` is the round-by-round ledger the original Scorecard
screen had (trump, bidder, bid, Us/Them per round) plus the running totals —
each row supports inline edit and delete, same as the original's edit/delete
row behavior. It's shared across three places rather than three separate
implementations:

- **Desktop (`lg:` and up):** a sticky sidebar next to the game controls —
  always visible, no extra taps.
- **Mobile:** a full-screen sheet opened from a compact "Us X · Them Y" strip,
  since there isn't room for a permanent sidebar on a phone.
- **Game Over:** a read-only recap under the final tally.

That's also the answer to "different UI for desktop vs. mobile" more broadly —
rather than one layout stretched to fit both, the extra desktop width goes to
showing the scoreboard permanently instead of widening buttons and inputs
past a comfortable size. The trump color picker is the other place this
shows: 2x2 on a phone, a single row of 4 once there's room (`sm:grid-cols-4`
in `TrumpPicker.tsx`).

## What's ported 1:1 from the original

`lib/rook-engine.ts` holds every scoring rule as a pure function, pulled directly
from `Game.pa.yaml` and `Scorecard.pa.yaml`:

- Bid options (50 → max, steps of 5)
- Non-bidder score entry validation (multiple of 5, 0..max)
- Bidder score calculation, including going set
- Shoot the Moon
- Dealer rotation (advances only after the first dealer is manually set)
- Win detection at the configured winning score

`scripts/verify-engine.ts` has scenario checks for all of the above (`npx tsx
scripts/verify-engine.ts`) — worth extending as you add rules, since this file is
what Phase 2's realtime sync and any future game variant will build on top of.

The reason the engine is a separate, framework-free module: it can run identically
in the browser (like now) or inside a Supabase Edge Function / Next.js API route
later, so when a second device needs to see the same round's score, you're not
duplicating scoring logic client- and server-side.

## Design direction

The original app used the trump colors as its only real visual identity (Black /
Green / Red / Yellow, straight off the Rook deck). This rebuild leans into that
instead of a generic dashboard look: a felt-table green background, a parchment
"scorepad" surface, a slab serif for headers, tabular-figure mono for scores (so
digits don't jitter as they change at a glance across the table), and the trump
picker rendered as actual card-shaped chips rather than a dropdown.

## Roadmap to accounts + paywall

**Phase 2 — Accounts & persistence (Supabase)**
1. Create a Supabase project. Add `users` (handled by Supabase Auth), `games`,
   and `rounds` tables — `rounds` maps directly to the `Round` type in
   `lib/rook-engine.ts`.
2. Swap `lib/game-store.ts`'s in-memory zustand store for one backed by Supabase:
   `saveRound` becomes an insert into `rounds`, game totals become a query instead
   of `Array.reduce`. The scoring math in `rook-engine.ts` doesn't change at all.
3. Add email or magic-link sign-in via Supabase Auth.

**Phase 3 — Multi-device live sync (premium)**
Supabase's Postgres change subscriptions push row inserts to every connected
client in real time — when one phone saves a round, everyone else's screen
updates without polling. This is the natural place to gate: free accounts play
on one device: premium accounts can have every player watching live on their
own phone.

**Phase 4 — Billing (Stripe)**
1. Stripe Checkout for the premium subscription, Customer Portal for
   cancel/upgrade.
2. A webhook endpoint (`app/api/stripe-webhook/route.ts`) that flips a
   `is_premium` flag on the user's row when their subscription becomes
   active/past_due/canceled.
3. Gate Phase 3's realtime sync and multi-variant support behind that flag.

**Phase 5 — Additional game variants**
Everything in `rook-engine.ts` is Rook-specific by design — bid steps of 5,
trump colors instead of suits, the set/moon rules. A second variant (e.g.
Spades or Euchre) would get its own `lib/<game>-engine.ts` alongside it, with
a shared `Round`-like interface so the Scorecard/GameOver UI can stay mostly
generic. Worth deferring until Phase 2–4 are solid — the account and billing
plumbing is the same regardless of which games sit on top of it.

## What I'd need from you to start Phase 2

- A Supabase project (free tier is fine to start) — project URL + anon key
- A Stripe account, in test mode to start — publishable + secret key, and a
  price ID for the premium subscription

Neither of those need to be shared in chat — once you've created them, drop the
keys into a `.env.local` file (never committed) and I can wire up the
integration code against the actual variable names.
