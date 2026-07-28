import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectiveTier, canSaveHistory } from "@/lib/entitlements";

/**
 * Persists a completed (or in-progress) game and its rounds. This is the
 * other half of the Game Over "save this game" prompt — the game state
 * held in the client's zustand store gets POSTed here at the moment
 * someone converts, so nothing from the session that prompted the upgrade
 * gets lost.
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
    .select("tier, pro_current_period_end")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const tier = effectiveTier({
    tier: profile.tier,
    proCurrentPeriodEnd: profile.pro_current_period_end,
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
    const { error: roundsError } = await supabase.from("rounds").insert(
      rounds.map((r) => ({
        game_id: game.id,
        round_number: r.round,
        row_type: r.rowType,
        us_score: r.usScore,
        them_score: r.themScore,
        trump: r.trump ?? null,
        bid_team: r.bidTeam ?? null,
        bid: r.bid ?? null,
        dealer_index: r.dealerIndex ?? null,
        shoot_moon: r.shootMoon ?? null,
        label: r.label ?? null,
      }))
    );
    if (roundsError) {
      return NextResponse.json({ error: roundsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ gameId: game.id });
}
