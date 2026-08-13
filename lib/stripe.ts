import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

/** Lazily-created singleton — only instantiated when a checkout or webhook
 * route actually runs, never on the free-tier play path. */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set — add it to .env.local");
    }
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeSingleton;
}

/**
 * Two independent Stripe Prices, matching the standalone-purchase decision:
 * PRO does not require PLUS to have been bought first — someone can jump
 * straight to $19.99/year without ever purchasing the $6.99 one-time price.
 * Create both in the Stripe dashboard (test mode to start) and drop their
 * IDs into .env.local — see README's Phase 2 setup section.
 */
export const STRIPE_PRICE_IDS = {
  plus: process.env.STRIPE_PRICE_PLUS_ONE_TIME, // one-time, $6.99
  pro: process.env.STRIPE_PRICE_PRO_ANNUAL, // recurring annual, $19.99
} as const;
