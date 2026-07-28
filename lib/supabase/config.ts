/**
 * Whether Supabase env vars are actually present — checked once here so
 * every component that needs to know ("should I show a working sign-in
 * form, or explain that the backend isn't set up yet?") agrees, instead of
 * each independently guessing and drifting out of sync.
 *
 * NEXT_PUBLIC_ vars get statically inlined at build time, so in a real
 * production deploy with real credentials this evaluates to `true` and any
 * "not configured" branches that check it become dead code — no runtime
 * cost, no leftover dev-mode UI shipping to real users.
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
