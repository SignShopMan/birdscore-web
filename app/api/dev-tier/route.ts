import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDevAccount, Tier } from "@/lib/entitlements";

/**
 * Sets (or clears) the calling account's dev_tier_override. This is the
 * actual security boundary for the whole dev-tier-switch feature — not the
 * UI, which only decides whether to *show* the buttons. Even a hand-crafted
 * request to this endpoint gets rejected unless the authenticated session's
 * own email matches, independent of anything the request body claims.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isDevAccount(user.email ?? null)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { tier } = (await request.json()) as { tier: Tier | null };
  if (tier !== null && tier !== "free" && tier !== "plus" && tier !== "pro") {
    return NextResponse.json({ error: "tier must be 'free', 'plus', 'pro', or null" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ dev_tier_override: tier })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
