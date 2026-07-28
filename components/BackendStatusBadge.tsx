"use client";

import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Only ever renders when Supabase isn't configured — in a real deploy with
 * real credentials this is dead code, not a badge that's just hidden. */
export function BackendStatusBadge() {
  if (isSupabaseConfigured) return null;

  return (
    <span
      className="rounded-full bg-white px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-trump-red ring-1 ring-trump-red/40"
      title="NEXT_PUBLIC_SUPABASE_URL / ANON_KEY aren't set — see .env.local.example"
    >
      No backend
    </span>
  );
}
