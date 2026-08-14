"use client";

import { create } from "zustand";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { effectiveTier, isDevAccount, Tier } from "./entitlements";

interface AuthState {
  userId: string | null;
  email: string | null;
  tier: Tier;
  // Raw stored override (or null) — separate from `tier`, which is always
  // the *resolved* value. The dev-tools UI needs to know which button is
  // currently selected, not just the effective result.
  devTierOverride: Tier | null;
  loading: boolean;
  // True from the moment a session appears (initial load or a fresh
  // sign-in) until refreshProfile() actually resolves. `tier` itself
  // can't be trusted as "this account isn't entitled" during that window
  // — it's just sitting at its previous value (often the "free" default
  // right after a sign-out) until the real profile row comes back. Screens
  // that gate a real decision on tier (SaveGamePrompt, UpgradeCard) should
  // check this too, not just `tier` alone — otherwise an already-entitled
  // account signing back in can briefly render as "not entitled" and
  // falsely offer to save/upgrade a game that was already synced.
  refreshingProfile: boolean;
  magicLinkSent: boolean;

  init: () => void;
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
  // Types the code from the email directly, instead of clicking the link
  // — the actual fix for PWA sign-in on iOS: Safari and an installed
  // standalone PWA are completely separate storage contexts there, so
  // clicking the link signs you into Safari, not the app icon you
  // launched from. Typing a code never leaves the PWA at all, sidestepping
  // the isolation entirely rather than trying to work around it.
  verifyOtpCode: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setDevTierOverride: (tier: Tier | null) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  email: null,
  tier: "free",
  devTierOverride: null,
  loading: true,
  refreshingProfile: false,
  magicLinkSent: false,

  init: () => {
    if (!isSupabaseConfigured) {
      // Supabase isn't configured yet — stay on "free", no error, no crash.
      // This is what lets free-tier play work with zero backend dependency.
      set({ loading: false });
      return;
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({ userId: session.user.id, email: session.user.email ?? null, refreshingProfile: true });
        get().refreshProfile();
      }
      set({ loading: false });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          userId: session.user.id,
          email: session.user.email ?? null,
          refreshingProfile: true,
        });
        get().refreshProfile();
      } else {
        set({
          userId: null,
          email: null,
          tier: "free",
          devTierOverride: null,
          refreshingProfile: false,
        });
      }
    });
  },

  sendMagicLink: async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (!error) set({ magicLinkSent: true });
    return { error: error?.message ?? null };
  },

  verifyOtpCode: async (email: string, code: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ userId: null, email: null, tier: "free", devTierOverride: null, magicLinkSent: false });
  },

  refreshProfile: async () => {
    const { userId } = get();
    if (!userId) return;
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from("profiles")
        .select("tier, pro_current_period_end, email, dev_tier_override, created_at")
        .eq("id", userId)
        .single();
      if (data) {
        set({
          tier: effectiveTier({
            tier: data.tier,
            proCurrentPeriodEnd: data.pro_current_period_end,
            email: data.email,
            devTierOverride: data.dev_tier_override,
            createdAt: data.created_at,
          }),
          devTierOverride: data.dev_tier_override,
        });
      }
    } finally {
      // Cleared here regardless of success/failure/no-row — this is the
      // signal that `tier` can now be trusted as the real answer, not the
      // stale/default value it may have been sitting at during the fetch.
      set({ refreshingProfile: false });
    }
  },

  // Client-side check here is only for the UI (don't render the buttons for
  // anyone else) — the real, non-bypassable gate is server-side in
  // app/api/dev-tier/route.ts, which independently verifies the signed-in
  // email before writing anything.
  setDevTierOverride: async (tier) => {
    const { email } = get();
    if (!isDevAccount(email)) {
      return { error: "Not authorized" };
    }
    const res = await fetch("/api/dev-tier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Failed to set dev tier" };
    await get().refreshProfile();
    return { error: null };
  },
}));
