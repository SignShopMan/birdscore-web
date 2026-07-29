export type Tier = "free" | "plus" | "pro";

export interface Profile {
  id: string;
  email: string | null;
  tier: Tier;
  plusPurchasedAt: string | null;
  proCurrentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  devTierOverride: Tier | null;
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
 * This is the ONE function that should ever compute "what tier does this
 * account actually have right now" — call it wherever a raw profile.tier
 * would otherwise be read directly, so neither the lapse rule nor the dev
 * override can be accidentally bypassed by reading the stored column
 * straight.
 */
export function effectiveTier(
  profile: Pick<Profile, "tier" | "proCurrentPeriodEnd" | "email" | "devTierOverride">
): Tier {
  const real = ((): Tier => {
    if (profile.tier !== "pro") return profile.tier;
    const periodEnd = profile.proCurrentPeriodEnd;
    if (!periodEnd) return "plus"; // pro with no period end on record shouldn't happen, but fail safe
    return new Date(periodEnd) > new Date() ? "pro" : "plus";
  })();

  if (isDevAccount(profile.email) && profile.devTierOverride) {
    return profile.devTierOverride;
  }
  return real;
}
