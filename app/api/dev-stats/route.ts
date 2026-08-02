import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDevStatsViewer, effectiveTier } from "@/lib/entitlements";

const DAY_MS = 24 * 60 * 60 * 1000;

interface DevConfig {
  resendApiKey: string | null;
  vercelToken: string | null;
  vercelProjectId: string | null;
}

/** Checks the in-app-editable dev_config table first, falls back to a
 * real env var if that row's field is empty — either mechanism works,
 * paste-in-app or a real Vercel env var, whichever's more convenient. */
async function getDevConfig(admin: ReturnType<typeof createAdminClient>): Promise<DevConfig> {
  const { data } = await admin
    .from("dev_config")
    .select("resend_api_key, vercel_token, vercel_project_id")
    .eq("id", 1)
    .maybeSingle();

  return {
    resendApiKey: data?.resend_api_key || process.env.RESEND_API_KEY || null,
    vercelToken: data?.vercel_token || process.env.VERCEL_TOKEN || null,
    vercelProjectId: data?.vercel_project_id || process.env.VERCEL_PROJECT_ID || null,
  };
}

async function getSupabaseStats(admin: ReturnType<typeof createAdminClient>) {
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, tier, pro_current_period_end, email, dev_tier_override, created_at");

  const { data: games } = await admin.from("games").select("owner_id, status, created_at");
  const { count: roundCount } = await admin
    .from("rounds")
    .select("*", { count: "exact", head: true });
  const { data: players } = await admin.from("players").select("display_name");

  const sevenDaysAgo = Date.now() - 7 * DAY_MS;
  const tierCounts = { free: 0, plus: 0, pro: 0 };
  let signupsLast7Days = 0;

  const gamesHostedByOwner = new Map<string, number>();
  for (const g of games ?? []) {
    gamesHostedByOwner.set(g.owner_id, (gamesHostedByOwner.get(g.owner_id) ?? 0) + 1);
  }

  const accounts = (profiles ?? [])
    .map((p) => ({
      email: p.email,
      tier: effectiveTier({
        tier: p.tier,
        proCurrentPeriodEnd: p.pro_current_period_end,
        email: p.email,
        devTierOverride: p.dev_tier_override,
        createdAt: p.created_at,
      }),
      gamesHosted: gamesHostedByOwner.get(p.id) ?? 0,
      createdAt: p.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  // Named-player appearances across every game, not just your own — the
  // point is seeing who's actually shown up at the table, not just who
  // has an account. Raw string counts, not fuzzy-matched — "Kevin" and
  // "Kevin " would show as two separate entries here, which is honest
  // given nothing links these to real accounts yet (that's the verified-
  // players feature still being discussed, not something to fake here).
  const playerCounts = new Map<string, number>();
  for (const p of players ?? []) {
    const name = p.display_name.trim();
    if (!name) continue;
    playerCounts.set(name, (playerCounts.get(name) ?? 0) + 1);
  }
  const playerAppearances = Array.from(playerCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAccounts: profiles?.length ?? 0,
    tierCounts,
    signupsLast7Days,
    totalGames: games?.length ?? 0,
    gameStatusCounts,
    gamesLast7Days,
    totalRounds: roundCount ?? 0,
    accounts,
    playerAppearances,
  };
}

async function getResendStats(config: DevConfig) {
  if (!config.resendApiKey) return { configured: false as const };

  const res = await fetch("https://api.resend.com/emails", {
    headers: { Authorization: `Bearer ${config.resendApiKey}` },
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

async function getVercelStats(config: DevConfig) {
  if (!config.vercelToken || !config.vercelProjectId) return { configured: false as const };

  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${config.vercelProjectId}&limit=5`,
    { headers: { Authorization: `Bearer ${config.vercelToken}` } }
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

  const admin = createAdminClient();
  const config = await getDevConfig(admin);

  const [supabaseStats, resend, vercel] = await Promise.all([
    getSupabaseStats(admin),
    getResendStats(config),
    getVercelStats(config),
  ]);

  return NextResponse.json({ supabase: supabaseStats, resend, vercel });
}
