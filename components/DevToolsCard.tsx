"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { isDevAccount, Tier } from "@/lib/entitlements";

const OPTIONS: { key: Tier | null; label: string }[] = [
  { key: null, label: "Real tier" },
  { key: "free", label: "Free" },
  { key: "plus", label: "Plus" },
  { key: "pro", label: "Pro" },
];

/**
 * Only ever renders for the one hardcoded dev account (lib/entitlements.ts's
 * DEV_EMAIL) — this client-side check is just so the buttons don't show up
 * for anyone else; the actual enforcement is server-side in
 * app/api/dev-tier/route.ts, which independently re-checks the signed-in
 * email and rejects the write regardless of what this component does.
 */
export function DevToolsCard() {
  const { email, devTierOverride, setDevTierOverride } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isDevAccount(email)) return null;

  const choose = async (t: Tier | null) => {
    setBusy(true);
    setError(null);
    const { error } = await setDevTierOverride(t);
    if (error) setError(error);
    setBusy(false);
  };

  return (
    <div className="mt-6 rounded-card bg-paper p-4 shadow-card ring-2 ring-brass">
      <p className="font-body text-sm font-semibold text-ink">Developer Tools</p>
      <p className="mt-1 font-body text-xs text-ink/60">
        Switch which tier this account effectively has, for testing. Doesn&rsquo;t touch
        real billing data — visible only to this account.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map(({ key, label }) => (
          <button
            key={label}
            onClick={() => choose(key)}
            disabled={busy}
            className={`rounded-full px-4 py-1.5 font-body text-sm disabled:opacity-50 ${
              devTierOverride === key ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 font-body text-xs text-trump-red">{error}</p>}
    </div>
  );
}
