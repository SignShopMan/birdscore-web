"use client";

import { useAuthStore } from "@/lib/auth-store";
import { SignInForm } from "./SignInForm";

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  plus: "Plus ($3.99)",
  pro: "Pro ($19.99/yr)",
};

/** Persistent sign-in/account status, always reachable from Settings — the
 * only other sign-in entry point (SaveGamePrompt) is buried inside Game
 * Over, which only helps someone who's already finished a game. */
export function AccountCard() {
  const { userId, email, tier, loading, signOut } = useAuthStore();

  if (loading) {
    return <p className="font-body text-xs text-ink/60">Checking sign-in status\u2026</p>;
  }

  if (!userId) {
    return (
      <div>
        <p className="mb-2 font-body text-xs text-ink/70">
          An account is only needed to save game history, use named players, or host
          realtime games — you can keep playing without one.
        </p>
        <SignInForm />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-body text-sm text-ink">
        Signed in as <span className="font-semibold">{email}</span>
      </p>
      <p className="font-body text-xs text-ink/70">
        Tier: <span className="font-semibold">{TIER_LABEL[tier] ?? tier}</span>
      </p>
      <button
        onClick={signOut}
        className="mt-1 rounded-full bg-white px-4 py-1.5 font-body text-xs font-semibold text-ink ring-1 ring-ink/20"
      >
        Sign out
      </button>
    </div>
  );
}
