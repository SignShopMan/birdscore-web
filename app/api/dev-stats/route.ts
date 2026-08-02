import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDevStatsViewer, effectiveTier } from "@/lib/entitlements";

const DAY_MS = 24 * 60 * 60 * 1000;

async function getSupabaseStats() {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("tier, pro_current_period_end, email, dev_tier_override, created_at");

  const { data: games } = await admin.from("games").select("status, created_at");
  const { count: roundCount } = await admin
    .from("rounds")
    .select("*", { count: "exact", head: true });

  const sevenDaysAgo = Date.now() - 7 * DAY_MS;
  const tierCounts = { free: 0, plus: 0, pro: 0 };
  let signupsLast7Days = 0;

  for (const p of profiles ?? []) {
    const tier = effectiveTier({
      tier: p.tier,
      proCurrentPeriodEnd: p.pro_current_period_end,
      email: p.email,
      devTierOverride: p.dev_tier_override,
      createdAt: p.created_at,
    });
    tierCounts[tier]++;
    if (new Date(p.created_at).getTime() > sevenDaysAgo) signupsLast7Days++;
  }

  const gameStatusCounts = { in_progress: 0, completed: 0, cancelled: 0 };
  let gamesLast7Days = 0;
  for (const g of games ?? []) {
    gameStatusCounts[g.status as keyof typeof gameStatusCounts]++;
    if (new Date(g.created_at).getTime() > sevenDaysAgo) gamesLast7Days++;
  }

  return {
    totalAccounts: profiles?.length ?? 0,
    tierCounts,
    signupsLast7Days,
    totalGames: games?.length ?? 0,
    gameStatusCounts,
    gamesLast7Days,
    totalRounds: roundCount ?? 0,
  };
}

async function getResendStats() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { configured: false as const };

  const res = await fetch("https://api.resend.com/emails", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { configured: true as const, error: `Resend API returned ${res.status}` };

  const data = await res.json();
  const emails = (data.data ?? []) as Array<{
    to: string[];
    subject: string;
    created_at: string;
    last_event: string;
  }>;

  const eventCounts: Record<string, number> = {};
  for (const e of emails) {
    eventCounts[e.last_event] = (eventCounts[e.last_event] ?? 0) + 1;
  }

  return {
    configured: true as const,
    recent: emails.slice(0, 10).map((e) => ({
      to: e.to[0],
      subject: e.subject,
      createdAt: e.created_at,
      status: e.last_event,
    })),
    eventCounts,
  };
}

async function getVercelStats() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return { configured: false as const };

  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return { configured: true as const, error: `Vercel API returned ${res.status}` };

  const data = await res.json();
  const deployments = (data.deployments ?? []) as Array<{
    uid: string;
    url: string;
    state: string;
    created: number;
    meta?: { githubCommitMessage?: string; githubCommitSha?: string };
  }>;

  return {
    configured: true as const,
    recent: deployments.map((d) => ({
      state: d.state,
      createdAt: new Date(d.created).toISOString(),
      commitMessage: d.meta?.githubCommitMessage ?? null,
      commitSha: d.meta?.githubCommitSha?.slice(0, 7) ?? null,
    })),
  };
}

export async function GET(_request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isDevStatsViewer(user.email ?? null)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [supabaseStats, resend, vercel] = await Promise.all([
    getSupabaseStats(),
    getResendStats(),
    getVercelStats(),
  ]);

  return NextResponse.json({ supabase: supabaseStats, resend, vercel });
}
