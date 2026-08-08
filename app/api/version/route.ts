import { NextResponse } from "next/server";

/**
 * Lets an already-open client find out a newer deploy exists. Vercel always
 * routes this request to whichever serverless function is currently live,
 * so — unlike lib/version.ts's APP_VERSION, which is baked into the client
 * bundle at build time and frozen from then on — this always reflects
 * what's actually deployed right now. See UpdateChecker.tsx for how it's
 * used to detect drift and prompt a reload.
 */
export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";
  return NextResponse.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
