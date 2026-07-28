import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser Supabase client on demand — NOT a module-level singleton
 * created at import time. This matters: free-tier play (no account, nothing
 * saved) never calls this function at all, so a project without real
 * Supabase credentials yet doesn't break basic gameplay. Only sign-in and
 * save-game code paths ever invoke it, and only then does a missing env var
 * surface as an error — correctly, since that's exactly when it matters.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
