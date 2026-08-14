"use client";

import { useEffect, useState } from "react";

interface AccountDetail {
  email: string | null;
  tier: "free" | "plus" | "pro";
  gamesHosted: number;
  createdAt: string;
}

interface PlayerAppearance {
  name: string;
  count: number;
}

interface DevStats {
  supabase: {
    totalAccounts: number;
    tierCounts: { free: number; plus: number; pro: number };
    signupsLast7Days: number;
    totalGames: number;
    gameStatusCounts: { in_progress: number; completed: number; cancelled: number };
    gamesLast7Days: number;
    totalRounds: number;
    accounts: AccountDetail[];
    playerAppearances: PlayerAppearance[];
  };
  resend:
    | { configured: false }
    | { configured: true; error: string }
    | {
        configured: true;
        recent: { to: string; subject: string; createdAt: string; status: string }[];
        eventCounts: Record<string, number>;
      };
  vercel:
    | { configured: false }
    | { configured: true; error: string }
    | {
        configured: true;
        recent: {
          state: string;
          createdAt: string;
          commitMessage: string | null;
          commitSha: string | null;
        }[];
      };
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-paper-dim p-3 text-center">
      <div className="font-score tabular-score text-2xl font-bold text-ink">{value}</div>
      <div className="mt-0.5 font-body text-[10px] uppercase tracking-wide text-ink/60">{label}</div>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TIER_LABEL: Record<string, string> = { free: "Free", plus: "Plus", pro: "Pro" };

/** Shown in place of a "not connected" message — paste a key, it saves to
 * a locked-down Supabase table and works immediately, no Vercel dashboard
 * trip needed. Not literally editing an env var (a running app can't do
 * that to itself), but the same practical outcome. */
function KeySetupForm({
  fields,
  onSaved,
}: {
  fields: { key: string; label: string; placeholder: string }[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dev-stats/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Couldn't save");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="font-body text-[11px] font-semibold text-ink/70">{f.label}</label>
          <input
            type="password"
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            autoComplete="off"
            className="mt-0.5 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-xs text-ink"
          />
        </div>
      ))}
      {error && <p className="font-body text-xs text-trump-red">{error}</p>}
      <button
        onClick={save}
        disabled={saving || Object.values(values).every((v) => !v?.trim())}
        className="w-full rounded-full bg-ink py-2 font-body text-xs font-semibold text-paper disabled:opacity-50"
      >
        {saving ? "Saving\u2026" : "Save & Connect"}
      </button>
    </div>
  );
}

export function DevStatsScreen({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<DevStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  const load = () => {
    fetch("/api/dev-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.supabase) setStats(data);
        else setError(data.error ?? "Couldn't load stats");
      })
      .catch(() => setError("Couldn't load stats"));
  };

  useEffect(load, []);

  const visibleAccounts = stats
    ? showAllAccounts
      ? stats.supabase.accounts
      : stats.supabase.accounts.slice(0, 5)
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-felt">
      <div className="mx-auto max-w-lg px-5 py-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="font-body text-xs uppercase tracking-[0.3em] text-brass-text underline underline-offset-4"
          >
            &larr; Back
          </button>
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-parchment">Dev Stats</h1>
        <p className="mt-1 font-body text-xs text-parchment/60">Visible only to your account.</p>

        {error && <p className="mt-6 font-body text-sm text-trump-red">{error}</p>}
        {!error && !stats && <p className="mt-6 font-body text-sm text-parchment/75">Loading&hellip;</p>}

        {stats && (
          <div className="mt-6 space-y-6">
            <section>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
                Accounts
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatBox label="Total" value={stats.supabase.totalAccounts} />
                <StatBox label="Free" value={stats.supabase.tierCounts.free} />
                <StatBox label="Plus" value={stats.supabase.tierCounts.plus} />
                <StatBox label="Pro" value={stats.supabase.tierCounts.pro} />
              </div>
              <p className="mt-2 font-body text-xs text-parchment/60">
                {stats.supabase.signupsLast7Days} new in the last 7 days
              </p>

              <div className="mt-3 rounded-card bg-paper-dim p-2 shadow-card">
                {stats.supabase.accounts.length === 0 && (
                  <p className="p-2 text-center font-body text-xs text-ink/60">No accounts yet.</p>
                )}
                {visibleAccounts.map((a) => (
                  <div key={a.email ?? a.createdAt} className="flex items-center justify-between gap-2 rounded-md px-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-body text-xs font-semibold text-ink">
                        {a.email ?? "(no email)"}
                      </p>
                      <p className="font-body text-[11px] text-ink/50">
                        Joined {formatDate(a.createdAt)} &middot; {a.gamesHosted} game
                        {a.gamesHosted === 1 ? "" : "s"} hosted
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-body text-[10px] font-semibold text-ink ring-1 ring-ink/15">
                      {TIER_LABEL[a.tier]}
                    </span>
                  </div>
                ))}
                {stats.supabase.accounts.length > 5 && (
                  <button
                    onClick={() => setShowAllAccounts((v) => !v)}
                    className="mt-1 w-full rounded-md py-1.5 font-body text-[11px] font-semibold text-ink/60"
                  >
                    {showAllAccounts ? "Show fewer" : `Show all ${stats.supabase.accounts.length}`}
                  </button>
                )}
              </div>
            </section>

            <section>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
                Games
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatBox label="Total" value={stats.supabase.totalGames} />
                <StatBox label="In Progress" value={stats.supabase.gameStatusCounts.in_progress} />
                <StatBox label="Completed" value={stats.supabase.gameStatusCounts.completed} />
                <StatBox label="Rounds Scored" value={stats.supabase.totalRounds} />
              </div>
              <p className="mt-2 font-body text-xs text-parchment/60">
                {stats.supabase.gamesLast7Days} started in the last 7 days
              </p>
            </section>

            {stats.supabase.playerAppearances.length > 0 && (
              <section>
                <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
                  Who&rsquo;s Actually Playing
                </p>
                <p className="mt-1 font-body text-[11px] text-parchment/50">
                  Named-player appearances across every game, not just accounts — raw name
                  matches, so slightly different spellings of the same person show up
                  separately.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {stats.supabase.playerAppearances.map((p) => (
                    <span
                      key={p.name}
                      className="rounded-full bg-paper px-3 py-1.5 font-body text-xs text-ink shadow-card"
                    >
                      <span className="font-semibold">{p.name}</span>{" "}
                      <span className="text-ink/50">&middot; {p.count}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
                Email (Resend)
              </p>
              <div className="mt-2 rounded-card bg-paper p-3">
                {!stats.resend.configured && (
                  <KeySetupForm
                    fields={[
                      { key: "resendApiKey", label: "Resend API Key", placeholder: "re_..." },
                    ]}
                    onSaved={load}
                  />
                )}
                {stats.resend.configured && "error" in stats.resend && (
                  <p className="font-body text-xs text-trump-red">{stats.resend.error}</p>
                )}
                {stats.resend.configured && "recent" in stats.resend && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.resend.eventCounts).map(([status, count]) => (
                        <span
                          key={status}
                          className="rounded-full bg-paper-dim px-2 py-1 font-body text-[11px] text-ink"
                        >
                          {status}: {count}
                        </span>
                      ))}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {stats.resend.recent.slice(0, 5).map((e, i) => (
                        <li key={i} className="font-body text-[11px] text-ink/70">
                          {formatDateTime(e.createdAt)} &middot; {e.to} &middot; {e.status}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>

            <section>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
                Deploys (Vercel)
              </p>
              <div className="mt-2 rounded-card bg-paper p-3">
                {!stats.vercel.configured && (
                  <KeySetupForm
                    fields={[
                      { key: "vercelToken", label: "Vercel Access Token", placeholder: "..." },
                      { key: "vercelProjectId", label: "Vercel Project ID", placeholder: "prj_..." },
                    ]}
                    onSaved={load}
                  />
                )}
                {stats.vercel.configured && "error" in stats.vercel && (
                  <p className="font-body text-xs text-trump-red">{stats.vercel.error}</p>
                )}
                {stats.vercel.configured && "recent" in stats.vercel && (
                  <ul className="space-y-1">
                    {stats.vercel.recent.map((d, i) => (
                      <li key={i} className="font-body text-[11px] text-ink/70">
                        <span
                          className={
                            d.state === "READY"
                              ? "font-semibold text-trump-green"
                              : d.state === "ERROR"
                              ? "font-semibold text-trump-red"
                              : "font-semibold text-ink"
                          }
                        >
                          {d.state}
                        </span>{" "}
                        &middot; {formatDateTime(d.createdAt)}
                        {d.commitMessage && <> &middot; {d.commitMessage}</>}
                        {d.commitSha && <> ({d.commitSha})</>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
