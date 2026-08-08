import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Webhooks can't carry a user's auth cookie — Stripe is calling this, not
// the signed-in browser — so this route uses the Supabase SERVICE ROLE key
// instead of the anon key, bypassing RLS. That's correct here (the whole
// point is writing another user's profile row) but means this file must
// NEVER be reachable except via a verified Stripe signature, and
// SUPABASE_SERVICE_ROLE_KEY must never be exposed client-side (no
// NEXT_PUBLIC_ prefix — that's deliberate).
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  const supabase = serviceClient();

  // Idempotency gate: insert event.id before doing anything else. A
  // unique-constraint conflict means this exact event was already
  // processed (Stripe redelivers on timeout/ambiguous response, and
  // webhook endpoints should tolerate that) — skip processing entirely
  // rather than relying on every handler below happening to be a safe
  // no-op to repeat. See 0010_processed_stripe_events.sql.
  const { error: dedupeError } = await supabase
    .from("processed_stripe_events")
    .insert({ event_id: event.id });
  if (dedupeError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const tier = session.metadata?.tier as "plus" | "pro" | undefined;
      if (!userId || !tier) break;

      if (tier === "plus") {
        await supabase
          .from("profiles")
          .update({
            tier: "plus",
            plus_purchased_at: new Date().toISOString(),
            stripe_customer_id: session.customer as string,
          })
          .eq("id", userId);
      } else {
        // Subscription — the actual period end comes from the subscription
        // object, not the checkout session, so fetch it.
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await supabase
          .from("profiles")
          .update({
            tier: "pro",
            pro_current_period_end: new Date(
              subscription.items.data[0].current_period_end * 1000
            ).toISOString(),
            stripe_customer_id: session.customer as string,
          })
          .eq("id", userId);
      }
      break;
    }

    // Annual renewal — extends the period end. If this never fires again
    // (cancelled), effectiveTier() in lib/entitlements.ts naturally drops
    // the account to "plus" once the existing period_end passes — no
    // separate "downgrade" write needed here.
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = invoice.parent?.subscription_details?.subscription as
        | string
        | undefined;
      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
      await supabase
        .from("profiles")
        .update({
          pro_current_period_end: new Date(
            subscription.items.data[0].current_period_end * 1000
          ).toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
