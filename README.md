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

**Magic link clicks doing nothing — a real, known Supabase gotcha, plus a
real gap in my own error handling**:
- Root cause: the old `/auth/callback` route consumed the sign-in code
  the instant the URL was hit — no click required, just loading the page.
  Supabase's own docs name this as a known issue: some mail providers and
  security scanners *prefetch* links inside emails before a human ever
  clicks them, and since the token is single-use, that automated prefetch
  silently burns it. By the time the person actually clicks, it's already
  dead — exactly matching "the link arrived, but clicking it does
  nothing."
- Fixed using Supabase's own recommended mitigation: `/auth/callback` is
  now a real interstitial page, not an auto-redirecting route. It shows a
  "Complete Sign In" button and does nothing until that's actually
  clicked — a prefetch visiting the URL doesn't consume anything, only a
  genuine click does, via a new `POST /api/auth/exchange`.
- This also closes a gap that existed independent of the root cause: the
  old flow redirected to `/?auth=error` on failure, but nothing in the
  app ever read that parameter — a failed sign-in looked *exactly* like a
  successful one from the outside, just silently landing back on the
  normal app with no explanation. The interstitial now shows a real error
  message ("This link has expired or was already used…") instead of
  nothing.
- Separately flagged (not a code fix): the two emails just added to
  `BETA_TESTER_EMAILS` don't exactly match the actual signed-up accounts
  seen in Supabase's Users table — `isBetaTester()` does an exact string
  match, so even one character off means no Pro grant, silently, with
  nothing telling you why.

**Two things from a screenshot: a literal "\u00B7" showing on screen, and
no date on the game detail page**:
- Root cause of the literal text: `\u00B7` only decodes to "·" inside a
  JS string or template literal — used as bare JSX text (not wrapped in
  quotes) it renders as the six literal characters instead. Found and
  fixed four instances of this exact mistake across the codebase (the
  middle dot in `HistoryScreen.tsx`, plus three separate "Loading…"
  spinners in `HistoryScreen.tsx`, `GameDetailModal.tsx`, and
  `AccountScreen.tsx`), all switched to the HTML entity form (`&middot;`,
  `&hellip;`) that JSX actually decodes correctly in raw text — the
  pattern already used correctly everywhere else in the app.
- Tried adding an automated scan for this the same way the earlier
  `bg-ink`/`text-parchment` one works, and pulled it back out — it
  false-positived on the very first real file it touched, because
  distinguishing "a `}` that closes a template-literal interpolation
  (still inside the string)" from "a `}` that closes a JSX expression
  (exits to raw text)" needs an actual parser, not a character-counting
  heuristic. A check that cries wolf on legitimate code is worse than no
  check — better to rely on having actually swept every instance by hand
  this round than ship something unreliable.
- `GameDetailModal.tsx` never showed a date at all — the API endpoint
  backing it (`GET /api/games/[id]`) simply didn't return
  `created_at`/`completed_at`. Added both, now shown as "Started ... ·
  Finished ..." in the header, plus a per-round time next to each round
  number — that data was already on every round, just never displayed.

**"New Game" now actually prevents orphaning, not just cleans up after
it** — confirmed the 540-0 duplicates were test data, not a real sync
bug. This closes the other half of the orphaned-games problem:

- Added "New Game" to the menu (`MainMenu.tsx`) — previously the only way
  to reach a fresh game was finishing the current one or cleaning up via
  History; there was no deliberate "abandon this and start over" path at
  all despite that being exactly how games were getting orphaned.
- Tapping it while a game is genuinely active shows a real confirmation
  (`ConfirmDialog.tsx`, new reusable component) — and confirming doesn't
  just warn, it actually cancels the abandoned game through the same
  PATCH endpoint History's Cancel button uses, so nothing gets left
  behind as a phantom "in_progress" row. Game Over's own New Game button
  reuses this same handler; the confirmation naturally never triggers
  there since the guard checks `gameActive && !gameOver`, which is always
  false once a game has actually finished.
- New `abandonGame()` in `game-store.ts` — resets the active-game fields
  without touching settings (so the New Game screen still shows sensible
  values to confirm) and without marking a fresh game active, so a reload
  between confirming and actually pressing Start Game can't resurrect the
  just-cancelled game through the resume-on-reload logic.

**History page: two real bugs fixed, plus filters, delete, and a tier-gated
drill-down** (from a screenshot review — brutal-assessment requested and
delivered):

- **Bug**: `${g.winner} won` printed the raw "US"/"THEM" constant instead
  of the actual team name — every other screen in the app resolves this
  through `teamLabel()`, this one was missed building a brand-new screen.
  Fixed.
- **Bug**: score display (`${us}-${them}`) produced unreadable strings
  the moment either total went negative from a penalty adjustment —
  "635--45", "-155-600". New `formatScore()` uses a spaced en dash, which
  never collides with a minus sign regardless of sign on either side.
- **Filters**: status chips (All/In Progress/Completed), a player
  dropdown (built from every name that's appeared across named-player
  games), and a "Show cancelled" checkbox — cancelled games are hidden by
  default now instead of sitting in the list dimmed but still cluttering
  it, which was the actual point of adding Cancel in the first place.
  Partner Performance stats are computed from the full unfiltered set on
  purpose — filtering the list view shouldn't quietly change the stats
  underneath it.
- **Permanent delete**, scoped to cancelled games only — new `DELETE
  /api/games/[id]`, deliberately refuses anything not already cancelled
  (a safety rail against the client accidentally nuking a completed
  game's real history; RLS also means it can only ever touch your own
  games regardless). rounds/players cascade-delete automatically.
- **Drill-down**: tapping a game opens `GameDetailModal.tsx` — the actual
  round-by-round scorecard, not just the final tally. Dealer and
  Rook-holder per round are Pro tier, gated live against the viewer's
  *current* tier (same pattern as every other entitlement in this app) —
  not baked into the saved game, so it reflects whatever tier you have
  right now, not whatever you had when the game was played.

**Cancel games, named players/seats/dealer rotation, Rook-holder tracking,
and a real History page** — the biggest single round so far, three
related asks that turned out to depend on each other:

- **Cancel a game**: new `cancelled` status (migration
  `0005_cancel_game_status.sql`), a minimal PATCH path that leaves
  existing rounds untouched (still a real record of what was played) and
  just flips status, and inline confirm-before-cancel on the new History
  page. This is the cleanup half — orphaned games can now actually be
  removed. The creation half (a "you have a game in progress, cancel it
  first?" warning before starting a new one) is a known related gap I
  didn't build this round — flagged, not fixed.
- **Named players, seats, and dealer rotation**: `GameSettings.players`
  is `[string,string,string,string] | null` — seat 0 deals first, seats
  rotate 0→1→2→3→0, and partnerships follow the real-table convention of
  sitting *across*, not next to each other (seats 0+2 vs 1+3). New
  `PlayerSetupCard.tsx` replaces the old team-names-only card with a
  toggle between the simple flow and full 4-player tracking; team names
  auto-derive from the pairs ("Jon & Ryan") once players are set. The
  dealer button on `GameScreen.tsx` shows the actual name now instead of
  "Seat N".
- **Rook-holder tracking**: Pro tier, shown in `ScorecardModal.tsx` only
  when named players are in use — tap-to-select, optional, doesn't block
  saving the round.
- **The sync work underneath both of those** is what makes them actually
  useful later, not just cosmetic: `players` rows get created once at
  game creation (`lib/game-persistence.ts`'s new `createPlayers`), and
  `dealer_player_id`/`rook_holder_player_id` on each round resolve
  against them (`fetchSeatToPlayerId` on subsequent syncs). Players are
  intentionally NOT editable mid-game — same as the real thing, you don't
  swap partners partway through a hand.
- **A real dedicated History page** (`HistoryScreen.tsx`), split out of
  `AccountScreen.tsx` — account identity and game history are genuinely
  different reasons to visit. Shows every game (in progress, completed,
  cancelled) with Resume/Cancel, plus **Partner Performance**: win rate
  per partnership pairing, computed by `lib/partner-stats.ts` (a pure,
  independently-tested function — `scripts/verify-engine.ts` now covers
  it directly). **Honest caveat**: this will show nothing meaningful
  until games get played *with* named players from here forward — old
  games, and any game using the simple team-names-only flow, don't have
  the player-level data this needs.
- "History" added as a new menu destination, right after Account.

**Version number in the menu, and a beta-grant correction**:
- Added `lib/version.ts`, showing next to "Beta" in the menu. Deliberately
  NOT a manually-bumped number — that's exactly the kind of thing that
  goes stale silently. Uses Vercel's own `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`
  (auto-injected at build time, no setup needed), so what's shown can be
  compared directly against `git log -1` to know for certain whether a
  deploy actually matches what was pushed — the exact question that's
  come up repeatedly this session.
- Corrected the beta-tester Pro grant: it was a single shared expiration
  date for the whole batch; changed to 12 months **per person**, anchored
  to `profiles.created_at` — i.e. from whenever that specific email
  actually registers, not a fixed date for everyone. Needed no new
  column: `created_at` is already set exactly at first sign-up. Threaded
  through both callers (`lib/auth-store.ts`, `app/api/games/route.ts`).
  `scripts/verify-entitlements.ts` now directly tests the date math
  (12 months out, just past it, well within it) rather than just the
  membership check.
- On "NewGameScreen doesn't seem to be the landing screen" — I re-read
  `page.tsx` carefully rather than assume, and the logic is correct: the
  initial screen state is `"newgame"`, unconditionally, unless a game is
  already in progress. The most likely explanation is a stale deploy
  still running the previous round's code (whose landing screen genuinely
  was Settings) — exactly the class of confusion the version number above
  now makes checkable in one glance instead of guessing.

**New Game separated from Settings, plus beta-tester Pro grants**:
- The app's landing screen used to *be* Settings — every fresh visit or
  rematch dropped straight into a full editable form (winning score, max
  points, team names, appearance, all expanded). New `NewGameScreen.tsx`
  is the actual landing screen now: a lightweight summary of what a new
  game will use, with "Start Game" to confirm and "Change Settings" as the
  deliberate opt-in to the detailed form.
- This let a real simplification happen underneath: `SettingsScreen` no
  longer needs its old `mode: "new" | "edit"` branching or the
  `canCancel` conditional — it's always reached via an explicit
  navigation action now (never the app's own default state), so there's
  always a sensible place to cancel back to. It always just updates the
  settings draft and hands control back to whoever opened it.
- `page.tsx`'s navigation is unified too: Settings/Account/FAQ all share
  one `openX()`/`goBack()` pattern that remembers whichever screen they
  were opened from, instead of each having its own bespoke wiring.
- `GameOverScreen`'s two buttons ("New Game" instant-rematch + a separate
  "Change settings" link) collapsed into one "New Game" button that goes
  through the same confirm screen — consistent with "confirm before
  starting" applying everywhere, not just on first load. This made the
  store's `newGame()` action genuinely redundant (`startGame()` with the
  current settings does an identical reset), so it's gone — removed
  rather than left as unused dead code.
- **Beta-tester Pro grants**: `lib/entitlements.ts` gained
  `BETA_TESTER_EMAILS` (currently an empty template — add real emails
  when ready) and a single fixed `BETA_GRANT_EXPIRES` date for the whole
  batch. Hardcoded-email, not a promo-code system — see the code comment
  for the reasoning, short version: real infrastructure (a codes table, a
  redemption flow) isn't justified for a one-time, known, small list of
  people. Layered the same way as the existing dev override: applied
  after the real lapse-policy tier, but the dev override still wins on
  top of it, so testing as free/plus still works even if that email
  happens to also be beta-listed. New `scripts/verify-entitlements.ts`
  covers all three layers (real tier + lapse, beta grant, dev override) —
  this logic didn't have dedicated tests before and was easy to get
  subtly wrong.

**The actual gap: no way to *use* a bare code** (reported: opened
therealbirdscore.com fresh, not signed in, no "join a game" anywhere):
- `/watch/[code]` only ever worked if someone clicked a pre-formed link —
  the code already had to be embedded in the URL. Anyone who just had the
  bare code (read aloud, texted as plain text, whatever) had no way to
  actually use it; nothing in the app let you type one in.
- New `app/watch/page.tsx` — a landing page with a 6-character code input
  that navigates to `/watch/[code]` on submit. Added "Watch a Game" to
  `MainMenu.tsx`, right after Settings since it's the one destination that
  genuinely needs no account at all — likely the first thing a new
  invitee wants, before anything else in the app.
- Added a FAQ entry spelling out both paths (link or menu \u2192 code entry),
  since this was a real question, not just a UI gap.

**Two real bugs from a screenshot mid-game (Round 3, still "Generating…")**:
- The invite banner had no failure state — if the sync genuinely failed,
  it said "Generating invite code…" forever with no way to tell a slow
  network apart from a real, persistent error. Now reads `syncStatus` from
  the store: red-tinted with "Couldn't create invite" when it's actually
  failed, and the invite modal itself explains why instead of silently
  doing nothing when tapped. **This is diagnostic, not a root-cause fix**
  — I can't reach `supabase.co` from this sandbox to see why the sync is
  actually failing for this specific account/game. See below for what to
  check.
- The compact mobile Scoreboard strip ("Kevin/Jon 45 · Jared/Ryan 60") was
  a single `justify-between` row sharing space with the "Scoreboard"
  label — fine for the short "Us"/"Them" defaults it was built and tested
  against, wraps badly the moment real names are longer. Restructured to
  stacked rows (label above, totals below, full width), with `truncate`
  as a safety net for pathologically long names.

**Invite as its own flow, plus live viewer count** (from a screenshot — code
existed but was invisible on the actual Game screen):
- The real problem: `InviteCard` only ever lived *inside* the mobile
  Scoreboard sheet — a surface that needs an extra tap to even open, and
  even then the code was easy to miss among totals and the round ledger.
  On desktop it wasn't reachable at all in any obvious way. Removed it
  from `Scoreboard.tsx` entirely and centralized on one clear surface
  instead: a prominent banner right under the header on `GameScreen.tsx`
  — same position on mobile and desktop, impossible to miss, showing
  "Generating invite code…" during the brief real sync and the code itself
  once it exists.
- Tapping the banner opens **`InviteScreen.tsx`**, a dedicated modal — big
  code, one-tap copy link, and a **live viewer count**.
- The viewer count uses Supabase **Presence** (Broadcast's sibling
  primitive, built exactly for "who's connected right now") — a new
  migration, `0004_realtime_presence.sql`, rather than editing
  `0003_realtime_broadcast.sql` (migrations are append-only once shipped).
  Deliberately more permissive than the broadcast policies: viewers need
  to *write* their own presence (`channel.track()` on `/watch/[code]`),
  not just read it, so both directions are open to `anon` here — scoped
  the same way as broadcast, only on a channel matching a real
  `is_realtime` game. The host never calls `.track()` itself, so the count
  naturally reflects only actual viewers, no manual subtraction needed.
- Checked: Supabase's free tier allows 200 concurrent realtime connections
  project-wide. For a niche card game, that's not a practical ceiling —
  didn't build an artificial cap into the app.

**Invite code was there, just backwards** (reported: "not seeing the
mechanism to activate realtime"):
- `GameSync` gated all syncing on `rounds.length > 0` — meaning the join
  code (assigned on that same first sync) didn't exist until *after* the
  first round was scored. Nothing was missing; the invite mechanism just
  couldn't appear until you'd already played a round, backwards from how
  you'd actually want to use it (grab the code, share it, *then* play).
- Fixed with a real signal instead of an ambiguous one: `gameActive` in
  `game-store.ts`, set true the moment Start Game / New Game / Resume is
  pressed — distinct from "zero rounds," which couldn't tell "never
  started" apart from "just started." `GameSync` now syncs immediately on
  `gameActive`, so a pro-tier host's code exists from the moment the game
  begins.
- Added a "Generating your invite code…" state on the host's Scoreboard
  for the brief real network round-trip between Start Game and the code
  actually arriving, so that gap is visible instead of a silent pause.

**Realtime hosting + invite codes** — pro tier:

- **Every pro-tier game gets an automatic join code** (`lib/join-code.ts` —
  6 characters, alphabet excludes 0/O/1/I/L since codes get read aloud at a
  table) generated the moment the game first syncs. No separate "enable
  hosting" toggle — matches "keep it simple, let the invite code do the
  heavy lifting."
- **One scorekeeper, many watchers, enforced server-side, not just in the
  UI.** New migration `0003_realtime_broadcast.sql` adds RLS policies on
  Supabase's `realtime.messages` table — this turned out to be load-bearing
  and not optional: current Supabase projects have Realtime Authorization
  **enabled by default**, meaning without an explicit policy, broadcast
  channels silently don't work for anyone, host included. The policies are
  asymmetric on purpose: anyone (`anon` role, no account) can *receive* on
  a channel that matches a real `is_realtime` game's join code; only the
  account that actually *owns* that game can *send*. Viewers can watch,
  only the host can write — enforced at the database layer.
- **`RealtimeHost.tsx`** broadcasts live state (team names, running
  totals, round history, and the in-progress bid/trump as it's being
  decided — not just completed rounds) via Supabase Realtime Broadcast.
  Deliberately separate from `GameSync.tsx`: that component does durable
  persistence (POST/PATCH to our own API), this does ephemeral pub/sub —
  different transport, different failure modes, no reason to tangle them.
- **`app/watch/[code]/page.tsx`** is the actual viewer — a new public
  route, fully read-only, no sign-in anywhere in the flow. Subscribes to
  the host's channel and mirrors whatever it broadcasts.
- **`InviteCard.tsx`** shows the code + a copyable link on the host's own
  Scoreboard (sidebar and mobile sheet) — hidden on the read-only Game Over
  recap, since inviting people to watch a finished game doesn't make sense.

**One honest caveat, unlike everything else in this codebase**: this is
the first piece of Phase 2 I genuinely could not verify end-to-end from
this environment — `supabase.co` isn't reachable from this sandbox, so
while the RLS policies are written correctly against current Supabase
documentation and the whole thing type-checks and builds clean, the actual
live behavior (does a real anonymous browser really connect, does the host
really broadcast, does a real dropped connection recover) needs a real
test with two actual devices once this is deployed. If watching doesn't
work on the first try, start by checking the Supabase dashboard's Realtime
logs for the channel — that'll show whether the RLS policy is rejecting
the connection or something else entirely.

**Menu, contrast, mobile bid input, team names** (four items in one round):

- **Menu on desktop** (`MainMenu.tsx`) was a full-screen edge-anchored
  drawer at every breakpoint — fine on mobile, disconnected from the
  trigger button on wide screens. Now a compact dropdown anchored directly
  under the button at `lg:` and up; mobile keeps the drawer.
- **Contrast**: re-auditing found three more real instances of the
  `bg-ink` + `text-parchment` bug (invisible navy-on-navy in light mode) —
  including the **Save button in the score-entry modal**, the single
  most-used interactive element in the app. Manually checking files has
  now missed this twice, so `verify-contrast.ts` gained an automated
  structural scan that greps every component for the literal pattern
  instead of relying on a maintained list — it will catch this class of
  bug going forward rather than needing to be rediscovered by eye.
- **Bid input on mobile** (`BidSlider.tsx`): the drag-slider stays on
  desktop (works well with a mouse), replaced on mobile with tap-to-edit
  the number directly (opens a keyboard input) plus a \u00b15 stepper —
  dragging a thin track with a fingertip across 40+ possible positions was
  the actual problem, not the slider concept itself. Shortcuts kept on both.
- **Team names**, $3.99 tier and up: `GameSettings` now carries
  `usTeamName`/`themTeamName` (default "Us"/"Them"), editable via a new
  Settings card (`TeamNamesCard.tsx`, tier-gated with an upsell message for
  free accounts) and threaded through every display surface — the winner
  headline, score totals, the bidding-team picker, the scorecard modal, and
  the round-by-round ledger's description text (column headers stay
  generic for space; the totals directly above them already carry the
  custom name). Also fixed a real gap this surfaced: `GameSync` wasn't
  watching `settings` at all, so a team-name (or even a winning-score)
  edit mid-game via Settings "edit" mode was never reaching Supabase — only
  rounds/game-over triggered a sync before. `PATCH /api/games/[id]` now
  accepts and applies settings updates too.
- Full named individual **players** (not just team names — the "who dealt,
  who held the Rook" stats layer) is still deferred; the schema
  (`players` table) has supported it since the Phase 2 foundation, but
  actually building that UI is its own round given everything else here.

**Dev-only tier switch**, locked to one account:
- New `dev_tier_override` column on `profiles`
  (`supabase/migrations/0002_dev_tier_override.sql`) — deliberately a
  *separate* column from the real `tier`/`plus_purchased_at`/
  `pro_current_period_end` that Stripe's webhooks write to, so switching
  tiers for testing never corrupts real billing state, and a real purchase
  later reads clean data.
- The gate is hardcoded in `lib/entitlements.ts` (`DEV_EMAIL`, currently
  `watkins.jonathan@gmail.com`) and enforced **server-side** in the new
  `app/api/dev-tier/route.ts` — it independently re-checks the
  authenticated session's own email before writing anything, regardless of
  what a request claims. The UI (`DevToolsCard.tsx`, shown on the Account
  screen) only decides whether to *display* the buttons; it isn't the
  security boundary. Changing who this applies to means editing and
  shipping a code change, not flipping a setting.
- `effectiveTier()` now applies the lapse policy first, then layers the dev
  override on top only for that one account — every existing caller
  (`lib/auth-store.ts`, `app/api/games/route.ts`) updated for the new
  required `email`/`devTierOverride` fields on its input.
- One practical note: now that a real personal email is hardcoded into the
  source, it's worth making sure the GitHub repo is private if it isn't
  already — a public repo would make that address visible to anyone
  browsing the code.

**Navigation refactor: menu + real Account/profile page**:
- Replaced the scattered per-screen "← Settings" links with `MainMenu.tsx` —
  one consistent hamburger menu mounted the same way on every screen
  (Settings, Game, Game Over, Account, FAQ). Extensible by construction:
  Settings / Account / FAQ / Send Feedback are rows in a list, not one-off
  UI chrome, so adding a destination later is one more row. "Send Feedback"
  moved here from the old always-floating corner pill (`FeedbackLink.tsx`,
  now removed) — one nav surface instead of two competing floating buttons.
- **Account is now a real screen (`AccountScreen.tsx`), not a Settings
  card.** Signed out: sign-in form. Signed in: email, tier, sign-out, and —
  the part that didn't exist before — an actual list of saved games pulled
  from Supabase, with a "Resume" button on in-progress ones.
- **The bigger piece underneath that list**: `GameSync.tsx`. Before this,
  nothing reached the database until Game Over — an interrupted device
  mid-game meant a lost game even for paying accounts, the exact bug this
  was supposed to prevent. Now an entitled, signed-in account's game syncs
  continuously: `POST /api/games` creates the row the moment the first
  round is scored, `PATCH /api/games/[id]` re-syncs on every subsequent
  round/adjustment/edit and marks it complete at Game Over. Sends the full
  current rounds array each time rather than diffing — simple and correct
  at real Rook round-counts, and self-healing if one sync attempt overlaps
  another (the next change resends the complete state anyway).
- Removed `GameOverScreen`'s old standalone auto-save — it would have
  created a duplicate game row once continuous sync existed. It now just
  reads `syncStatus` from the store for "Saving…" / "Saved" feedback.
  `PendingSaveSync` (the free-tier conversion path) is untouched and still
  correct — it's a different population (someone who just converted,
  never had continuous sync running) with no overlap.
- New `GET /api/games/[id]` + `loadGame()` in the store power **Resume**:
  fetches one game's full round detail and hydrates it back into local
  state, currentGameId included, so the resumed game keeps syncing rather
  than looking like a brand-new one.
- `FaqScreen.tsx` ships with six real Q&As pulled from decisions made this
  conversation (tier structure, realtime model, lapse policy) — a
  placeholder would've been cheaper but wouldn't have proven the menu
  pattern actually holds real content.
- No new migration needed — `supabase/migrations/0001_init.sql`'s schema
  from the Phase 2 foundation already covered everything this round needed.

**Swatch visibility on selection** (from a screenshot — Monochrome selected in dark mode):
- The accent swatch dot's ring (`ring-black/15`) assumed a white unselected
  pill background. Once selected, the pill itself goes dark (`bg-ink`), and
  a dark ring on a dark pill around a dark preview color (dark-mode
  Monochrome specifically) measured **1.03:1** — essentially invisible, the
  swatch stopped functioning as a preview the moment you picked the dark
  option. Ring now adapts to selection state: light (`ring-white/70`, 7.90:1)
  when selected, unchanged when not. Added to `verify-contrast.ts`.

**Persistent Account entry point** (a real gap, not a config bug):
- There was no way to sign in anywhere except inside the Game Over save
  prompt — meaning "no login visible" was expected behavior for anyone
  checking Settings, regardless of whether Supabase was actually configured
  correctly. Added `AccountCard.tsx` as its own collapsible Settings
  section: shows a sign-in form when signed out, or email + tier + sign-out
  when signed in. Reuses `SignInForm` rather than duplicating it.

**In-progress game persistence** (real bug, from an actual interrupted game):
- The game store had no persistence at all — a reload, closed tab, or
  interruption lost everything, free tier or not. This was never a
  Phase-2-gated feature; it's baseline reliability. Fixed with zustand's
  `persist` middleware on `game-store.ts` (same pattern already used for
  `theme-store.ts`), keyed to `localStorage` under `birdscore-game`.
- This alone wasn't enough — `page.tsx`'s Settings-vs-Game screen choice
  lived in local `useState`, never persisted, so even with the data saved a
  reload would still land on Settings first. Added a `hasHydrated` flag
  (via `onRehydrateStorage`) and a resume check: once the persisted state is
  actually readable, if a game was in progress (rounds, or a bid/trump
  mid-entry, or game-over), the app resumes straight to it instead of
  defaulting to Settings. A brief blank frame while `hasHydrated` is false
  avoids a flash of Settings before flipping to Game.

**Phase 2 foundation, round 2** — backend status visibility:
- Added a "No backend" badge next to the Beta badge in Settings
  (`BackendStatusBadge.tsx`), and made `SaveGamePrompt`/`SignInForm` explain
  themselves immediately if Supabase isn't configured, instead of letting
  someone click into a tier picker or sign-in form that would otherwise fail
  with a cryptic client error. All gated on `lib/supabase/config.ts`'s
  `isSupabaseConfigured` — a real production deploy with real credentials
  makes these branches dead code, not just hidden UI.
- Caught the same contrast mistake pattern a third time while building
  this: the badge and both warning messages used a translucent
  `bg-trump-red/10..15` tint, which on the actual felt background measured
  as low as **1.97:1** — nowhere close to AA. Switched all three to solid
  white backgrounds (5.93:1) and added them to `verify-contrast.ts` so this
  specific pattern (translucent tint over a theme-reactive or unverified
  background) can't slip through silently again.

**Phase 2 foundation** — accounts, entitlements, and billing:

Built against the tier structure worked out in chat:

| | Free | $3.99 one-time (`plus`) | $19.99/yr (`pro`) |
|---|---|---|---|
| Account | None | Required | Required |
| History/saves | None (in-memory only) | Permanent | Permanent |
| Named players, team names | — | \u2713 | \u2713 |
| Realtime hosting | — | — | \u2713 (one scorekeeper per game) |
| Realtime viewing | Free, no account, join by code | same | same |
| Enhanced stats (Rook holder, dealer tracking, averages) | — | — | \u2713 |

**What's built:**
- `supabase/migrations/0001_init.sql` — profiles/games/players/rounds schema
  with RLS. `rounds` mirrors `lib/rook-engine.ts`'s `Round` type exactly,
  including the `Adj` row type from the beta feedback rounds. `players`
  exists starting at `plus`, not deferred to `pro` — only the extra stat
  columns on `rounds` (`dealer_player_id`, `rook_holder_player_id`) are
  `pro`-exclusive.
- `lib/entitlements.ts` — the one place tier logic lives. `effectiveTier()`
  is the annual-lapse policy: a lapsed `pro` drops to `plus`, never to
  `free`, since `plus` was a permanent one-time purchase. Every other file
  calls this instead of reading `profile.tier` directly.
- Auth: magic link only, via Supabase Auth (`lib/auth-store.ts`,
  `components/SignInForm.tsx`, `app/auth/callback/route.ts`,
  `middleware.ts` for session refresh).
- Billing: `app/api/checkout/route.ts` creates a Stripe Checkout session for
  either price — independent products, `pro` doesn't require `plus` first,
  matching the standalone-purchase decision. `app/api/stripe-webhook/route.ts`
  verifies the signature and grants entitlements on `checkout.session.completed`
  / `invoice.paid`.
- The save flow: `components/SaveGamePrompt.tsx` is the Game Over prompt for
  anyone who can't save yet. The tricky part was that magic-link sign-in
  means leaving the tab to check email, which would otherwise lose the
  in-memory game that prompted the save — `lib/pending-save.ts` stashes it
  in `localStorage` the moment someone picks a tier, and
  `components/PendingSaveSync.tsx` (mounted globally) completes the actual
  save via `app/api/games/route.ts` once sign-in + payment land, in
  whichever tab notices first. Already-entitled accounts skip the prompt
  entirely and save automatically.

**Deliberately deferred to the next round**, once the above is proven
against real credentials: realtime Broadcast (host writes, read-only
viewers join by code), the actual named-player entry UI (schema supports
it now, no UI yet), and enhanced-stats UI (Rook holder / dealer tracking
entry, the "moneyball" views). Building those on unverified auth/billing
would mean redoing them if something in the foundation needs to change.

### Phase 2 setup — what you need to do

1. **Supabase**: New Project at supabase.com (free tier is fine — 500MB DB,
   50K MAU, no card required; note it auto-pauses after 7 days with no API
   traffic, worth a scheduled ping once this is live day-to-day). Then:
   - SQL Editor → paste and run `supabase/migrations/0001_init.sql`, then
     `0002_dev_tier_override.sql`, then `0003_realtime_broadcast.sql`, then
     `0004_realtime_presence.sql`, then `0005_cancel_game_status.sql` (if
     the GitHub↔Supabase integration is connected, these may already be
     applied automatically — check Database → Migrations first, same as
     with the others).
   - Settings → API → copy the Project URL, `anon` `public` key, and the
     `service_role` key (keep that last one secret — it bypasses RLS).
2. **Stripe**: dashboard.stripe.com, test mode to start.
   - Product catalog → create two products: one with a **one-time** $3.99
     price, one with a **recurring annual** $19.99 price. Copy each
     Price ID (starts `price_`, not the Product ID).
   - Developers → API keys → copy the secret key.
   - Developers → Webhooks → add endpoint → `https://therealbirdscore.com/api/stripe-webhook`
     (or your Vercel preview URL while testing) → subscribe to
     `checkout.session.completed` and `invoice.paid` → copy the signing secret.
3. **Fill in `.env.local`** from `.env.local.example` with all of the above.
4. **Also add the same variables in Vercel** — Project Settings → Environment
   Variables. `.env.local` is git-ignored and never reaches the deployed
   site; Vercel needs its own copy of every value.

Once that's in place, tell me and I'll do a pass confirming sign-in,
checkout, and the save flow actually work end-to-end against real
infrastructure — I built and type-checked all of this, but couldn't run it
live without a real project to point at.

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
