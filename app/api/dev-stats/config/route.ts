import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDevStatsViewer } from "@/lib/entitlements";

/**
 * Saves Resend/Vercel credentials for Dev Stats — the practical
 * alternative to literally editing a Vercel environment variable, which
 * isn't something a running app can do to itself (process.env is
 * read-only at runtime, set only at build/deploy time). This gets to the
 * same place — paste a key, it works, no dashboard trip — through a
 * locked-down Supabase table instead (see 0007_dev_config.sql).
 *
 * Only ever updates fields actually present in the request body, so
 * saving a new Resend key doesn't require also re-sending the Vercel
 * token in the same request.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isDevStatsViewer(user.email ?? null)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await request.json()) as {
    resendApiKey?: string;
    vercelToken?: string;
    vercelProjectId?: string;
  };

  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  if (body.resendApiKey !== undefined) update.resend_api_key = body.resendApiKey.trim();
  if (body.vercelToken !== undefined) update.vercel_token = body.vercelToken.trim();
  if (body.vercelProjectId !== undefined) update.vercel_project_id = body.vercelProjectId.trim();

  const admin = createAdminClient();
  const { error } = await admin.from("dev_config").upsert({ id: 1, ...update });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
