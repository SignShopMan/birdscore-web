"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { joinCodeChannel } from "@/lib/join-code";
import { Round, Team, TrumpColor, TRUMP_HEX } from "@/lib/rook-engine";
import { ScoreTotals } from "@/components/ScoreTotals";
import { Scoreboard } from "@/components/Scoreboard";

interface LiveState {
  usTeamName: string;
  themTeamName: string;
  rounds: Round[];
  dealerIndex: number;
  current: { bidTeam: Team; bid: number; trump: TrumpColor | null; shootMoon: boolean } | null;
  gameOver: boolean;
  winner: Team | null;
}

/**
 * Read-only — nothing here ever writes back to the game. Subscribes to the
 * host's Broadcast channel (see RealtimeHost.tsx) and mirrors whatever it
 * sends. No account, no sign-in: knowing the code in the URL is the only
 * thing required to watch, by design (see supabase/migrations/
 * 0003_realtime_broadcast.sql for the RLS policy this depends on).
 */
export default function WatchPage({ params }: { params: { code: string } }) {
  const [state, setState] = useState<LiveState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(joinCodeChannel(params.code))
      .on("broadcast", { event: "state" }, ({ payload }) => setState(payload as LiveState))
      .subscribe(async (status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          await channel.track({ watching_since: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [params.code]);

  if (!state) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">
          {connected ? "Connected" : "Connecting\u2026"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-parchment">
          Waiting for the host
        </h1>
        <p className="mt-2 font-body text-sm text-parchment/75">
          Nothing to show yet — this updates the moment they bid their first round.
        </p>
      </div>
    );
  }

  const { usTeamName, themTeamName, rounds, current, gameOver, winner } = state;
  const usTotal = rounds.reduce((sum, r) => sum + r.usScore, 0);
  const themTotal = rounds.reduce((sum, r) => sum + r.themScore, 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
      <p className="font-body text-xs uppercase tracking-[0.3em] text-brass">
        {gameOver ? "Game Over" : "Watching Live"}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-parchment">
        {gameOver && winner ? `${winner === "US" ? usTeamName : themTeamName} wins` : "BirdScore"}
      </h1>

      <div className="mt-6">
        <ScoreTotals us={usTotal} them={themTotal} usLabel={usTeamName} themLabel={themTeamName} />
      </div>

      {!gameOver && current && (
        <div className="mt-4 rounded-card p-6 text-center shadow-card" style={{
          backgroundColor: current.trump ? TRUMP_HEX[current.trump] : "#1B2A3A",
        }}>
          <div className="font-body text-sm uppercase tracking-[0.3em] text-white">
            {current.bidTeam === "US" ? usTeamName : themTeamName}
            {current.trump ? ` \u00B7 ${current.trump} Trump` : " bidding\u2026"}
          </div>
          <div className="mt-2 font-score tabular-score text-7xl font-bold text-white">
            {current.bid}
          </div>
        </div>
      )}

      <div className="mt-6 h-72 flex-1 text-left lg:h-96">
        <Scoreboard
          rounds={rounds}
          usTotal={usTotal}
          themTotal={themTotal}
          usLabel={usTeamName}
          themLabel={themTeamName}
          onUpdateRound={() => {}}
          onDeleteRound={() => {}}
          readOnly
          hideTotals
        />
      </div>
    </div>
  );
}
