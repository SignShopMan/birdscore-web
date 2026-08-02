import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Bypasses RLS entirely using the service role key — deliberately a
 * separate file from server.ts (the normal per-user client), so it's
 * never accidentally reached for on a player-facing path. This exists
 * for exactly one narrow purpose: aggregate stats across *all* accounts
 * (total signups, total games) for the Dev Stats screen, which by
 * definition can't be scoped to a single user's RLS-visible rows.
 *
 * Every caller of this MUST independently verify isDevStatsViewer(email)
 * BEFORE using it — this client has no awareness of who's asking, it
 * simply has full access to everything. The route calling this is the
 * only thing standing between "authorized" and "not."
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
