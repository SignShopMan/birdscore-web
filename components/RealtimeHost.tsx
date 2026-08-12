"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useGameStore } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canHostRealtime } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/client";
import { joinCodeChannel } from "@/lib/join-code";

// Self-healing safety net for drops this doesn't otherwise catch — a
// backgrounded WKWebView suspends JS entirely (Realtime's own reconnect
// timers included), so there's no guarantee the socket resumed cleanly by
// the time anything else notices. Only fires during genuine lulls between
// state changes (a real change already sends fresh state on its own),
// which is exactly when a screen would've locked mid-game.
const HEARTBEAT_MS = 10_000;

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
 *
 * Reconnection: a multi-hour card game has long gaps between taps
 * (dealing, bidding chatter) — exactly when a phone screen locks and
 * background network activity gets suspended. Beta feedback was that
 * viewers stopped getting updates and the host had to do something
 * unrelated (any UI interaction) before things "caught up" — that's this
 * exact failure mode: the channel silently goes dead and nothing brought
 * it back. Visibility-change now forces a real reconnect (not just an
 * assumption the old socket resumed), and the heartbeat above covers
 * whatever that doesn't.
 */
export function RealtimeHost() {
  const {
    joinCode,
    settings,
    rounds,
    trump,
    bid,
    bidTeam,
    bidderSeat,
    shootMoon,
    dealerIndex,
    gameOver,
    winner,
    setViewerCount,
  } = useGameStore();
  const { tier } = useAuthStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeCodeRef = useRef<string | null>(null);
  // Always holds the latest payload so the heartbeat and the
  // visibility-triggered resend send whatever's actually current, not a
  // stale snapshot from whenever the interval/listener were set up.
  const payloadRef = useRef<Record<string, unknown> | null>(null);

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

    const current =
      bidTeam && (bid != null || shootMoon)
        ? { bidTeam, bidderSeat, bid: shootMoon ? settings.maxPointsPerRound : bid, trump, shootMoon }
        : null;
    const payload = {
      usTeamName: settings.usTeamName,
      themTeamName: settings.themTeamName,
      players: settings.players,
      rounds,
      dealerIndex,
      current,
      gameOver,
      winner,
    };
    payloadRef.current = payload;

    const connect = () => {
      channelRef.current?.unsubscribe();
      const supabase = createClient();
      const channel = supabase.channel(joinCodeChannel(joinCode));
      channel.on("presence", { event: "sync" }, () => {
        setViewerCount(Object.keys(channel.presenceState()).length);
      });
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" && payloadRef.current) {
          channel.send({ type: "broadcast", event: "state", payload: payloadRef.current });
        }
      });
      channelRef.current = channel;
      activeCodeRef.current = joinCode;
    };

    if (activeCodeRef.current !== joinCode) {
      connect();
    } else {
      channelRef.current?.send({ type: "broadcast", event: "state", payload });
    }

    // Reconnects outright rather than trusting the old socket resumed on
    // its own — see the reconnection note above.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") connect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const heartbeat = setInterval(() => {
      if (payloadRef.current) {
        channelRef.current?.send({
          type: "broadcast",
          event: "state",
          payload: payloadRef.current,
        });
      }
    }, HEARTBEAT_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(heartbeat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canHost,
    joinCode,
    rounds,
    trump,
    bid,
    bidTeam,
    bidderSeat,
    shootMoon,
    dealerIndex,
    gameOver,
    winner,
    settings,
  ]);

  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  return null;
}
