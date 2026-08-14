"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { joinCodeChannel, isValidJoinCodeFormat } from "@/lib/join-code";
import { Round, Team, TrumpColor, TRUMP_HEX } from "@/lib/rook-engine";
import { ScoreTotals } from "@/components/ScoreTotals";
import { Scoreboard } from "@/components/Scoreboard";

interface LiveState {
  usTeamName: string;
  themTeamName: string;
  players: [string, string, string, string] | null;
  rounds: Round[];
  dealerIndex: number;
  current: {
    bidTeam: Team;
    bidderSeat: number | null;
    bid: number;
    trump: TrumpColor | null;
    shootMoon: boolean;
  } | null;
  gameOver: boolean;
  winner: Team | null;
}

const SEAT_FALLBACK_LABELS = ["Seat 1", "Seat 2", "Seat 3", "Seat 4"];

type GameCheck = "checking" | "invalid_format" | "not_found" | "found";

/**
 * Read-only — nothing here ever writes back to the game. Subscribes to the
 * host's Broadcast channel (see RealtimeHost.tsx) and mirrors whatever it
 * sends. No account, no sign-in: knowing the code in the URL is the only
 * thing required to watch, by design (see supabase/migrations/
 * 0003_realtime_broadcast.sql for the RLS policy this depends on).
 *
 * Validates the code before ever subscribing to anything — a QA report
 * found that typing pure punctuation, or any other nonsense string, into
 * this page produced "Connected — Waiting for the host," because the old
 * version only checked whether the Realtime *transport* subscribed
 * successfully, which happens for any topic name at all regardless of
 * whether it means anything. That's a WebSocket-layer success, not
 * confirmation a real game exists. Format is checked locally
 * (isValidJoinCodeFormat); actual existence needs a real lookup against
 * the games table (0006_public_join_code_check.sql is what makes that
 * lookup possible for an anonymous viewer at all).
 */
export default function WatchPage({ params }: { params: { code: string } }) {
  const [gameCheck, setGameCheck] = useState<GameCheck>("checking");
  const [state, setState] = useState<LiveState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const normalized = params.code.trim().toUpperCase();
    if (!isValidJoinCodeFormat(normalized)) {
      setGameCheck("invalid_format");
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    // check_join_code is a security-definer RPC (0009_join_code_rpc.sql) —
    // returns a plain boolean, never a row, so there's no games data for
    // an anonymous caller to read regardless of how this is called.
    supabase
      .rpc("check_join_code", { code: normalized })
      .then(({ data }) => {
        if (cancelled) return;
        setGameCheck(data ? "found" : "not_found");
      });

    return () => {
      cancelled = true;
    };
  }, [params.code]);

  // Reconnects outright on visibility rather than assuming the old socket
  // resumed on its own — a backgrounded/locked phone suspends JS (and any
  // reconnect logic Realtime itself would otherwise run) entirely, so
  // there's no guarantee the subscription is even alive again by the time
  // the screen comes back. See RealtimeHost.tsx for the host-side half of
  // this same fix — beta feedback was that watchers stopped getting
  // updates until something unrelated happened to force a reconnect.
  useEffect(() => {
    if (gameCheck !== "found") return;
    const supabase = createClient();
    const code = params.code.trim().toUpperCase();
    let channel: ReturnType<typeof supabase.channel>;

    const connect = () => {
      channel?.unsubscribe();
      channel = supabase
        .channel(joinCodeChannel(code))
        .on("broadcast", { event: "state" }, ({ payload }) => setState(payload as LiveState))
        .subscribe(async (status) => {
          setConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") {
            await channel.track({ watching_since: new Date().toISOString() });
          }
        });
    };
    connect();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") connect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      channel?.unsubscribe();
    };
  }, [gameCheck, params.code]);

  if (gameCheck === "checking") {
    return <div className="min-h-dvh bg-felt" />;
  }

  if (gameCheck === "invalid_format") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-trump-red">Invalid Code</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-parchment">
          That doesn&rsquo;t look like a real code
        </h1>
        <p className="mt-2 font-body text-sm text-parchment/75">
          Codes are 6 characters, letters and numbers only — check for typos or extra
          characters.
        </p>
        <a
          href="/watch"
          className="mt-6 rounded-full bg-brass px-6 py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink"
        >
          Try another code
        </a>
      </div>
    );
  }

  if (gameCheck === "not_found") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-trump-red">Game Not Found</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-parchment">
          That code isn&rsquo;t connected to a live game
        </h1>
        <p className="mt-2 font-body text-sm text-parchment/75">
          The code is shaped right, but nothing&rsquo;s using it right now — double-check with
          whoever&rsquo;s hosting, or the game may have ended.
        </p>
        <a
          href="/watch"
          className="mt-6 rounded-full bg-brass px-6 py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-ink"
        >
          Try another code
        </a>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-brass-text">
          {connected ? "Connected" : "Connecting\u2026"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-parchment">
          Waiting for the host
        </h1>
        <p className="mt-2 font-body text-sm text-parchment/75">
          Nothing to show yet — this updates the moment they bid their first round.
        </p>
        <a
          href="/watch"
          className="mt-6 font-body text-xs text-parchment/60 underline underline-offset-4"
        >
          Try another code
        </a>
      </div>
    );
  }

  const { usTeamName, themTeamName, players, dealerIndex, rounds, current, gameOver, winner } = state;
  const usTotal = rounds.reduce((sum, r) => sum + r.usScore, 0);
  const themTotal = rounds.reduce((sum, r) => sum + r.themScore, 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
      <p className="font-body text-xs uppercase tracking-[0.3em] text-brass-text">
        {gameOver ? "Game Over" : "Watching Live"}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-parchment">
        {gameOver && winner ? `${winner === "US" ? usTeamName : themTeamName} wins` : "BirdScore"}
      </h1>
      <p className="mt-1 font-body text-xs text-parchment/60">
        You&rsquo;re watching someone else&rsquo;s live Rook game — the score updates in real
        time as they play.{" "}
        <a href="/" className="underline underline-offset-4">
          What&rsquo;s BirdScore?
        </a>
      </p>

      {/* Beta feedback: the current dealer was already broadcast
          (dealerIndex, below) but never actually shown to watchers —
          same brass-banner treatment GameScreen's own dealer badge uses,
          just without a "change" affordance since watchers can't. */}
      {!gameOver && (
        <div className="mt-4 flex items-center gap-1.5 self-start rounded-full bg-brass/20 px-4 py-2 font-body text-sm font-semibold text-parchment ring-1 ring-brass/50">
          <span className="font-normal text-parchment/70">Dealer</span>
          <span>{players ? players[dealerIndex] : SEAT_FALLBACK_LABELS[dealerIndex]}</span>
        </div>
      )}

      <div className="mt-6">
        <ScoreTotals us={usTotal} them={themTotal} usLabel={usTeamName} themLabel={themTeamName} />
      </div>

      {!gameOver && current && (
        <div className="mt-4 rounded-card p-6 text-center shadow-card" style={{
          backgroundColor: current.trump ? TRUMP_HEX[current.trump] : "#1B2A3A",
        }}>
          <div className="font-body text-sm uppercase tracking-[0.3em] text-white">
            {current.bidderSeat != null && players
              ? players[current.bidderSeat]
              : current.bidTeam === "US"
              ? usTeamName
              : themTeamName}
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
          settings={{
            winningScore: 0,
            maxPointsPerRound: 0,
            usTeamName,
            themTeamName,
            players,
            spreadWin: false,
          }}
          onUpdateRound={() => {}}
          onDeleteRound={() => {}}
          readOnly
          hideTotals
          showDealerRook={players !== null}
        />
      </div>
    </div>
  );
}
