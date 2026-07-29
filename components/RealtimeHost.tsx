"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useGameStore } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canHostRealtime } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/client";
import { joinCodeChannel } from "@/lib/join-code";

/**
 * Broadcasts the host's live game state to anyone watching via join code —
 * separate from GameSync on purpose: that component handles durable
 * persistence (POST/PATCH to our own API), this handles ephemeral pub/sub
 * (Supabase Realtime Broadcast) — different transport, different failure
 * modes, no reason to tangle them together.
 *
 * Watches the in-progress bid/trump/team fields too, not just saved
 * rounds — the whole point of watching live is seeing the auction happen,
 * not just completed rounds popping in. Sends the full current state each
 * time rather than a diff, same self-healing simplicity as GameSync: if a
 * send happens before the channel finishes subscribing, the next state
 * change re-sends everything anyway.
 */
export function RealtimeHost() {
  const { joinCode, settings, rounds, trump, bid, bidTeam, shootMoon, dealerIndex, gameOver, winner } =
    useGameStore();
  const { tier } = useAuthStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeCodeRef = useRef<string | null>(null);

  const canHost = canHostRealtime(tier);

  useEffect(() => {
    if (!canHost || !joinCode) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
        activeCodeRef.current = null;
      }
      return;
    }

    if (activeCodeRef.current !== joinCode) {
      channelRef.current?.unsubscribe();
      const supabase = createClient();
      const channel = supabase.channel(joinCodeChannel(joinCode));
      channel.subscribe();
      channelRef.current = channel;
      activeCodeRef.current = joinCode;
    }

    const current =
      bidTeam && (bid != null || shootMoon)
        ? { bidTeam, bid: shootMoon ? settings.maxPointsPerRound : bid, trump, shootMoon }
        : null;

    channelRef.current?.send({
      type: "broadcast",
      event: "state",
      payload: {
        usTeamName: settings.usTeamName,
        themTeamName: settings.themTeamName,
        rounds,
        dealerIndex,
        current,
        gameOver,
        winner,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canHost, joinCode, rounds, trump, bid, bidTeam, shootMoon, dealerIndex, gameOver, winner, settings]);

  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  return null;
}
