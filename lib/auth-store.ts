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
        set({ userId: session.user.id, email: session.user.email ?? null });
        get().refreshProfile();
      }
      set({ loading: false });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ userId: session.user.id, email: session.user.email ?? null });
        get().refreshProfile();
      } else {
        set({ userId: null, email: null, tier: "free", devTierOverride: null });
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
