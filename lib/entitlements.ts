export type Tier = "free" | "plus" | "pro";

export interface Profile {
  id: string;
  email: string | null;
  tier: Tier;
  plusPurchasedAt: string | null;
  proCurrentPeriodEnd: string | null;
  stripeCustomerId: string | null;
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
 * This is the ONE function that should ever compute "what tier does this
 * account actually have right now" — call it wherever a raw profile.tier
 * would otherwise be read directly, so the lapse rule can't be
 * accidentally bypassed by reading the stored column straight.
 */
export function effectiveTier(profile: Pick<Profile, "tier" | "proCurrentPeriodEnd">): Tier {
  if (profile.tier !== "pro") return profile.tier;
  const periodEnd = profile.proCurrentPeriodEnd;
  if (!periodEnd) return "plus"; // pro with no period end on record shouldn't happen, but fail safe
  return new Date(periodEnd) > new Date() ? "pro" : "plus";
}
