"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { SignInForm } from "./SignInForm";
import { stashPendingSave } from "@/lib/pending-save";
import { Round, GameSettings } from "@/lib/rook-engine";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Shown at Game Over for anyone who can't save history yet. Stashes the
 * finished game the moment they express intent to save (before sign-in
 * sends them to check email), so PendingSaveSync can complete it once
 * they're back with an entitled account — see lib/pending-save.ts. */
export function SaveGamePrompt({
  settings,
  rounds,
  winner,
}: {
  settings: GameSettings;
  rounds: Round[];
  winner: "US" | "THEM" | null;
}) {
  const { userId } = useAuthStore();
  const [selected, setSelected] = useState<"plus" | "pro" | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (tier: "plus" | "pro") => {
    setSelected(tier);
    stashPendingSave({ settings, rounds, winner });
  };

  const startCheckout = async (tier: "plus" | "pro") => {
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong starting checkout.");
        setCheckingOut(false);
      }
    } catch {
      setError("Couldn't reach checkout — try again.");
      setCheckingOut(false);
    }
  };

  return (
    <div className="rounded-card bg-paper p-4 text-left shadow-card">
      <p className="font-display text-lg font-semibold text-ink">Save this game?</p>
      <p className="mt-1 font-body text-xs text-ink/70">
        This game only lives in your browser right now — starting a new one clears it for
        good.
      </p>

      {!isSupabaseConfigured ? (
        <p className="mt-3 rounded-md bg-white p-2 font-body text-xs text-trump-red">
          Saving isn&rsquo;t set up in this environment yet — Supabase/Stripe aren&rsquo;t
          configured. See the README&rsquo;s Phase 2 setup section.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => choose("plus")}
              className={`rounded-md p-3 text-left ring-1 ${
                selected === "plus"
                  ? "bg-ink text-paper ring-ink"
                  : "bg-white text-ink ring-ink/20"
              }`}
            >
              <div className="font-body text-sm font-bold">$3.99</div>
              <div className="font-body text-[11px] opacity-80">History, named players</div>
            </button>
            <button
              onClick={() => choose("pro")}
              className={`rounded-md p-3 text-left ring-1 ${
                selected === "pro"
                  ? "bg-ink text-paper ring-ink"
                  : "bg-white text-ink ring-ink/20"
              }`}
            >
              <div className="font-body text-sm font-bold">$19.99/yr</div>
              <div className="font-body text-[11px] opacity-80">+ Realtime, full stats</div>
            </button>
          </div>

          {selected && !userId && (
            <div className="mt-3 border-t border-ink/10 pt-3">
              <p className="mb-2 font-body text-xs text-ink/60">
                Sign in first — we'll pick up checkout right after.
              </p>
              <SignInForm />
            </div>
          )}

          {selected && userId && (
            <button
              onClick={() => startCheckout(selected)}
              disabled={checkingOut}
              className="mt-3 w-full rounded-full bg-brass py-2.5 font-body text-sm font-semibold uppercase tracking-wide text-ink disabled:opacity-50"
            >
              {checkingOut
                ? "Redirecting\u2026"
                : `Continue \u2014 ${selected === "plus" ? "$3.99" : "$19.99/yr"}`}
            </button>
          )}

          {error && <p className="mt-2 font-body text-xs text-trump-red">{error}</p>}
        </>
      )}
    </div>
  );
}
