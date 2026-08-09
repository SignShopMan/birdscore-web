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
 *
 * Also tracks Presence on the same channel to compute a live viewer count
 * — the host never calls .track() itself, so presenceState() naturally
 * reflects only connected /watch viewers, no manual subtraction needed.
 */
export function RealtimeHost() {
  const {
    joinCode,
    settings,
    rounds,
    trump,
    bid,
    bidTeam,
    shootMoon,
    dealerIndex,
    gameOver,
    winner,
    setViewerCount,
  } = useGameStore();
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
        setViewerCount(0);
      }
      return;
    }

    if (activeCodeRef.current !== joinCode) {
      channelRef.current?.unsubscribe();
      const supabase = createClient();
      const channel = supabase.channel(joinCodeChannel(joinCode));
      channel.on("presence", { event: "sync" }, () => {
        setViewerCount(Object.keys(channel.presenceState()).length);
      });
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
        // Named players weren't broadcast at all before — beta feedback
        // was that watchers had no way to see who dealt or held the Rook,
        // live or per past round. Safe to send unconditionally: hosting
        // realtime at all already requires Pro (canHostRealtime), the
        // same tier canUseEnhancedStats requires, so there's no separate
        // entitlement being bypassed by including it here.
        players: settings.players,
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
