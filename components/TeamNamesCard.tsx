"use client";

import { useAuthStore } from "@/lib/auth-store";
import { canUseNamedPlayers } from "@/lib/entitlements";

export function TeamNamesCard({
  usTeamName,
  themTeamName,
  onChangeUs,
  onChangeThem,
}: {
  usTeamName: string;
  themTeamName: string;
  onChangeUs: (v: string) => void;
  onChangeThem: (v: string) => void;
}) {
  const { tier } = useAuthStore();
  const entitled = canUseNamedPlayers(tier);

  if (!entitled) {
    return (
      <p className="font-body text-xs text-ink/70">
        Custom team names are part of the $3.99 tier — sign in from the menu to unlock
        them. Games play as &ldquo;Us&rdquo; and &ldquo;Them&rdquo; until then.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="font-body text-xs font-semibold text-ink/70">Us</label>
        <input
          type="text"
          value={usTeamName}
          maxLength={24}
          onChange={(e) => onChangeUs(e.target.value)}
          placeholder="Us"
          className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
        />
      </div>
      <div>
        <label className="font-body text-xs font-semibold text-ink/70">Them</label>
        <input
          type="text"
          value={themTeamName}
          maxLength={24}
          onChange={(e) => onChangeThem(e.target.value)}
          placeholder="Them"
          className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
        />
      </div>
    </div>
  );
}
