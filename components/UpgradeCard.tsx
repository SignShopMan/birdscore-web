"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isNativeIOS } from "@/lib/platform";

/**
 * The only proactive way to upgrade — before this, SaveGamePrompt (shown
 * at Game Over for a non-entitled account) was the sole purchase entry
 * point in the whole app, meaning nobody could upgrade until after
 * finishing a full game first. Deliberately simpler than SaveGamePrompt's
 * flow: no pending-save stash needed (there's no finished-but-unsaved
 * game to preserve across the Stripe redirect here — any in-progress game
 * is already safe in localStorage regardless of tier), and sign-in is the
 * caller's job (AccountScreen only renders this once already signed in).
 */
export function UpgradeCard({ tier }: { tier: "free" | "plus" | "pro" }) {
  const [checkingOut, setCheckingOut] = useState<"plus" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read after mount, not during render — Capacitor.isNativePlatform() only
  // reflects reality once the client-side bridge has loaded (see
  // SaveGamePrompt.tsx, same reasoning).
  const [nativeIOS, setNativeIOS] = useState(false);
  useEffect(() => setNativeIOS(isNativeIOS()), []);

  const startCheckout = async (checkoutTier: "plus" | "pro") => {
    setCheckingOut(checkoutTier);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: checkoutTier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong starting checkout.");
        setCheckingOut(null);
      }
    } catch {
      setError("Couldn't reach checkout — try again.");
      setCheckingOut(null);
    }
  };

  // App Store guideline 3.1.1 — digital purchases on native iOS must go
  // through StoreKit, not Stripe. Same gate as SaveGamePrompt.tsx, the
  // only other purchase surface. Nobody but the one native-app user hits
  // this branch today.
  if (nativeIOS) return null;
  if (!isSupabaseConfigured) return null;
  if (tier === "pro") return null; // already at the top tier

  return (
    <div className="mt-3 rounded-card bg-paper p-4 shadow-card">
      <p className="font-display text-base font-semibold text-ink">Upgrade</p>
      <div className={`mt-3 grid gap-2 ${tier === "free" ? "grid-cols-2" : "grid-cols-1"}`}>
        {tier === "free" && (
          <button
            onClick={() => startCheckout("plus")}
            disabled={checkingOut !== null}
            className="rounded-md bg-white p-3 text-left ring-1 ring-ink/20 disabled:opacity-50"
          >
            <div className="font-body text-sm font-bold text-ink">
              {checkingOut === "plus" ? "Redirecting…" : "$6.99 one time"}
            </div>
            <div className="font-body text-[11px] text-ink/70">History, named players</div>
          </button>
        )}
        <button
          onClick={() => startCheckout("pro")}
          disabled={checkingOut !== null}
          className="rounded-md bg-white p-3 text-left ring-1 ring-ink/20 disabled:opacity-50"
        >
          <div className="font-body text-sm font-bold text-ink">
            {checkingOut === "pro" ? "Redirecting…" : "$19.99/yr"}
          </div>
          <div className="font-body text-[11px] text-ink/70">+ Realtime, full stats</div>
        </button>
      </div>
      {error && <p className="mt-2 font-body text-xs text-trump-red">{error}</p>}
    </div>
  );
}
