import { Round } from "@/lib/rook-engine";

export interface DbRoundRow {
  game_id: string;
  round_number: number;
  row_type: "Round" | "Adj";
  us_score: number;
  them_score: number;
  trump: string | null;
  bid_team: string | null;
  bid: number | null;
  dealer_index: number | null;
  shoot_moon: boolean | null;
  label: string | null;
}

export function roundsToDbRows(gameId: string, rounds: Round[]): DbRoundRow[] {
  return rounds.map((r) => ({
    game_id: gameId,
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
  }));
}

/** Inverse of roundsToDbRows — used to hydrate a saved game back into the
 * client's game store (Resume) or to display full round detail. */
export function dbRowsToRounds(
  rows: Array<{
    id: string;
    round_number: number;
    row_type: "Round" | "Adj";
    us_score: number;
    them_score: number;
    trump: string | null;
    bid_team: string | null;
    bid: number | null;
    dealer_index: number | null;
    shoot_moon: boolean | null;
    label: string | null;
    created_at: string;
  }>
): Round[] {
  return rows.map((r) => ({
    rowId: r.id,
    round: r.round_number,
    rowType: r.row_type,
    usScore: r.us_score,
    themScore: r.them_score,
    trump: (r.trump ?? undefined) as Round["trump"],
    bidTeam: (r.bid_team ?? undefined) as Round["bidTeam"],
    bid: r.bid ?? undefined,
    dealerIndex: r.dealer_index ?? undefined,
    shootMoon: r.shoot_moon ?? undefined,
    label: r.label ?? undefined,
    createdAt: r.created_at,
  }));
}
