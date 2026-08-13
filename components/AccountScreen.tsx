"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { isDevStatsViewer } from "@/lib/entitlements";
import { SignInForm } from "./SignInForm";
import { MainMenu } from "./MainMenu";
import { DevToolsCard } from "./DevToolsCard";
import { DevStatsScreen } from "./DevStatsScreen";

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  plus: "Plus ($6.99 one time)",
  pro: "Pro ($19.99/yr)",
};

/** Account identity and sign-in only now — the games list and partner
 * stats moved to their own HistoryScreen, since "my account" and "my game
 * history" are genuinely different things someone comes here for. */
export function AccountScreen({
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onOpenResources,
  onBack,
}: {
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onOpenResources: () => void;
  onBack: () => void;
}) {
  const { userId, email, tier, loading, signOut } = useAuthStore();
  const [devStatsOpen, setDevStatsOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
      <header className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4"
        >
          &larr; Back
        </button>
        <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} onOpenResources={onOpenResources} />
      </header>
      <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">Your Account</h1>

      <div className="mt-8 rounded-card bg-paper p-4 shadow-card">
        {loading ? (
          <p className="font-body text-xs text-ink/70">Checking sign-in status&hellip;</p>
        ) : !userId ? (
          <div>
            <p className="mb-2 font-body text-xs text-ink/70">
              An account is only needed to save game history, use named players, or host
              realtime games — you can keep playing without one.
            </p>
            <SignInForm />
          </div>
        ) : (
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
        )}
      </div>

      <DevToolsCard />

      {isDevStatsViewer(email) && (
        <button
          onClick={() => setDevStatsOpen(true)}
          className="mt-3 w-full rounded-full bg-white py-2.5 font-body text-xs font-semibold text-ink ring-1 ring-ink/20"
        >
          Dev Stats
        </button>
      )}
      {devStatsOpen && <DevStatsScreen onClose={() => setDevStatsOpen(false)} />}
    </div>
  );
}
