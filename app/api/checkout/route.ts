import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a Stripe Checkout session for the "plus" (one-time $3.99) or
 * "pro" (annual $19.99, standalone — doesn't require plus first) tier.
 * Requires a signed-in Supabase user; the client should send them through
 * sign-in first if there's no session yet.
 */
export async function POST(request: NextRequest) {
  const { tier } = (await request.json()) as { tier: "plus" | "pro" };

  if (tier !== "plus" && tier !== "pro") {
    return NextResponse.json({ error: "tier must be 'plus' or 'pro'" }, { status: 400 });
  }

  const priceId = STRIPE_PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json(
      { error: `STRIPE_PRICE_${tier === "plus" ? "PLUS_ONE_TIME" : "PRO_ANNUAL"} is not set` },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required before checkout" }, { status: 401 });
  }

  const stripe = getStripe();
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: tier === "plus" ? "payment" : "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, tier },
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
