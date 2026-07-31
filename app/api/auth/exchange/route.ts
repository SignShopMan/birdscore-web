import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Does the actual exchangeCodeForSession — split out from the callback
 * page specifically so this only ever fires on a genuine click, not on
 * the GET request itself. See app/auth/callback/page.tsx for why: some
 * mail providers and security scanners prefetch links inside emails
 * before a human ever clicks them, which silently consumes a single-use
 * magic-link token before the real click happens. Supabase's own docs
 * name this as a known issue and recommend exactly this pattern —
 * requiring a real interaction (not the page just loading) before the
 * code actually gets consumed.
 */
export async function POST(request: NextRequest) {
  const { code } = (await request.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "Missing sign-in code" }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
