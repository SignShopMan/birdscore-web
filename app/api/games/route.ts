import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectiveTier, canSaveHistory } from "@/lib/entitlements";
import { roundsToDbRows } from "@/lib/game-persistence";

/**
 * POST creates a new game row. Used two ways: (1) the moment an entitled,
 * signed-in user starts a game — see lib/game-store.ts's Supabase sync —
 * so it exists as "in_progress" from the first round, not just at the end;
 * and (2) the Game Over "save this game" conversion path for someone who
 * just upgraded, saving what was held in memory (see SaveGamePrompt /
 * PendingSaveSync).
 *
 * GET lists the signed-in user's games, most recent first, with computed
 * running totals — the actual read side of history, which didn't exist
 * before this round (saving worked, nothing ever displayed it back).
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, pro_current_period_end, email, dev_tier_override")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const tier = effectiveTier({
    tier: profile.tier,
    proCurrentPeriodEnd: profile.pro_current_period_end,
    email: profile.email,
    devTierOverride: profile.dev_tier_override,
  });
  if (!canSaveHistory(tier)) {
    return NextResponse.json(
      { error: "Saving game history requires the $3.99 tier or above" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { settings, rounds, winner, usTeamName, themTeamName } = body as {
    settings: { winningScore: number; maxPointsPerRound: number };
    rounds: Array<{
      round: number;
      rowType: "Round" | "Adj";
      usScore: number;
      themScore: number;
      trump?: string;
      bidTeam?: string;
      bid?: number;
      dealerIndex?: number;
      shootMoon?: boolean;
      label?: string;
    }>;
    winner: "US" | "THEM" | null;
    usTeamName?: string;
    themTeamName?: string;
  };

  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      owner_id: user.id,
      winning_score: settings.winningScore,
      max_points_per_round: settings.maxPointsPerRound,
      us_team_name: usTeamName ?? "Us",
      them_team_name: themTeamName ?? "Them",
      status: winner ? "completed" : "in_progress",
      winner,
      completed_at: winner ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: gameError?.message ?? "Failed to save game" }, { status: 500 });
  }

  if (rounds.length > 0) {
    const { error: roundsError } = await supabase
      .from("rounds")
      .insert(roundsToDbRows(game.id, rounds as never));
    if (roundsError) {
      return NextResponse.json({ error: roundsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ gameId: game.id });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data: games, error } = await supabase
    .from("games")
    .select("id, winning_score, max_points_per_round, us_team_name, them_team_name, status, winner, created_at, completed_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!games || games.length === 0) {
    return NextResponse.json({ games: [] });
  }

  // One extra query for totals rather than N — fetch every round for every
  // listed game at once and sum client-side (in this route), instead of a
  // per-game round-trip.
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("game_id, us_score, them_score")
    .in("game_id", games.map((g) => g.id));

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  const totals = new Map<string, { us: number; them: number }>();
  for (const r of rounds ?? []) {
    const t = totals.get(r.game_id) ?? { us: 0, them: 0 };
    t.us += r.us_score;
    t.them += r.them_score;
    totals.set(r.game_id, t);
  }

  const result = games.map((g) => ({
    id: g.id,
    winningScore: g.winning_score,
    maxPointsPerRound: g.max_points_per_round,
    usTeamName: g.us_team_name,
    themTeamName: g.them_team_name,
    status: g.status,
    winner: g.winner,
    createdAt: g.created_at,
    completedAt: g.completed_at,
    usTotal: totals.get(g.id)?.us ?? 0,
    themTotal: totals.get(g.id)?.them ?? 0,
  }));

  return NextResponse.json({ games: result });
}
