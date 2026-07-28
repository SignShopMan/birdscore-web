"use client";

import { create } from "zustand";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { effectiveTier, Tier } from "./entitlements";

interface AuthState {
  userId: string | null;
  email: string | null;
  tier: Tier;
  loading: boolean;
  magicLinkSent: boolean;

  init: () => void;
  sendMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  email: null,
  tier: "free",
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
        set({ userId: null, email: null, tier: "free" });
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

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ userId: null, email: null, tier: "free", magicLinkSent: false });
  },

  refreshProfile: async () => {
    const { userId } = get();
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("tier, pro_current_period_end")
      .eq("id", userId)
      .single();
    if (data) {
      set({ tier: effectiveTier({ tier: data.tier, proCurrentPeriodEnd: data.pro_current_period_end }) });
    }
  },
}));
