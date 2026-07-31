export type Tier = "free" | "plus" | "pro";

export interface Profile {
  id: string;
  email: string | null;
  tier: Tier;
  plusPurchasedAt: string | null;
  proCurrentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  devTierOverride: Tier | null;
  createdAt: string;
}

/**
 * Hardcoded, not configurable via env var or admin UI — this is
 * intentional. A dev-tier-switch feature is powerful enough (full access
 * to every paid tier with no payment) that it should never be possible to
 * accidentally widen it to another account by changing a setting
 * somewhere. Changing who this applies to means changing this line of
 * code, reviewing it, and shipping it — not flipping a flag.
 */
const DEV_EMAIL = "watkins.jonathan@gmail.com";

export function isDevAccount(email: string | null): boolean {
  return email?.toLowerCase() === DEV_EMAIL;
}

/**
 * A few free Pro accounts for beta testers — hardcoded emails rather than
 * a promo/redemption code system, deliberately. That's real infrastructure
 * (a codes table, a redemption API route, UI for entering one) for what's
 * a one-time, known, small list of people. If this ever needs to become
 * an ongoing self-serve thing (more testers added over time, distributed
 * without collecting emails first), a promo code system becomes worth
 * building — not for this.
 *
 * Add emails here, lowercase, once collected. The grant is 12 months per
 * person, anchored to profiles.created_at — i.e. whenever that email
 * actually registers/signs in for the first time, not a shared date for
 * the whole batch. That matches the intent directly (register → 12 months
 * of Pro from that moment) and needs no extra column: created_at is
 * already set exactly at first sign-up by the handle_new_user trigger in
 * 0001_init.sql. One real edge case worth knowing: if someone already had
 * a BirdScore account *before* being added here, their clock started at
 * their original signup, not at whenever their email gets added to this
 * list — fine for testers registering fresh after being added, worth
 * double-checking if that's ever not the case.
 */
const BETA_TESTER_EMAILS: string[] = [
  // "kevin@example.com",
  // "jared@example.com",
  // "ryan@example.com",
  "andyjwatkins@gmail.com",
  "dank@gmail.com"
];
const BETA_GRANT_MONTHS = 12;

export function isBetaTester(email: string | null): boolean {
  return !!email && BETA_TESTER_EMAILS.includes(email.toLowerCase());
}

export function withinBetaGrantWindow(createdAt: string): boolean {
  const expires = new Date(createdAt);
  expires.setMonth(expires.getMonth() + BETA_GRANT_MONTHS);
  return new Date() < expires;
}

/**
 * What each tier unlocks — kept in one place so a UI component or an API
 * route never has to reimplement the tier logic itself, just call these.
 */
export function canSaveHistory(tier: Tier): boolean {
  return tier === "plus" || tier === "pro";
}

export function canUseNamedPlayers(tier: Tier): boolean {
  return tier === "plus" || tier === "pro";
}

export function canHostRealtime(tier: Tier): boolean {
  return tier === "pro";
}

export function canUseEnhancedStats(tier: Tier): boolean {
  return tier === "pro";
}

/**
 * Applies the annual-lapse policy: if a pro subscription's current period
 * has ended, the account drops to "plus" (they keep whatever they'd
 * permanently paid for — history, named players) rather than "free".
 * A pro who never separately bought plus still lands on plus after lapsing,
 * since the $19.99 purchase includes everything plus unlocks (see the
 * standalone-annual decision) — so there's nothing to claw back below that.
 *
 * Then, ONLY for the one hardcoded dev account, a dev_tier_override (if
 * set) takes priority over all of the above. This is deliberately layered
 * on top rather than mixed into the real tier logic — the real
 * tier/plus_purchased_at/pro_current_period_end columns stay exactly what
 * Stripe's webhooks actually wrote, untouched by testing, so a real
 * purchase later isn't reading corrupted state.
 *
 * The beta-tester grant sits between those two: applied after the real
 * lapse-policy tier, but before the dev override (which always wins, so
 * the dev account can still test the "free" or "plus" view even if that
 * same email happened to be on the beta list).
 *
 * This is the ONE function that should ever compute "what tier does this
 * account actually have right now" — call it wherever a raw profile.tier
 * would otherwise be read directly, so neither the lapse rule, the beta
 * grant, nor the dev override can be accidentally bypassed by reading the
 * stored column straight.
 */
export function effectiveTier(
  profile: Pick<Profile, "tier" | "proCurrentPeriodEnd" | "email" | "devTierOverride" | "createdAt">
): Tier {
  const real = ((): Tier => {
    if (profile.tier !== "pro") return profile.tier;
    const periodEnd = profile.proCurrentPeriodEnd;
    if (!periodEnd) return "plus"; // pro with no period end on record shouldn't happen, but fail safe
    return new Date(periodEnd) > new Date() ? "pro" : "plus";
  })();

  const withBetaGrant =
    isBetaTester(profile.email) && withinBetaGrantWindow(profile.createdAt) ? "pro" : real;

  if (isDevAccount(profile.email) && profile.devTierOverride) {
    return profile.devTierOverride;
  }
  return withBetaGrant;
}
