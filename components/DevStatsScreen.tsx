"use client";

import { useEffect, useState } from "react";

interface DevStats {
  supabase: {
    totalAccounts: number;
    tierCounts: { free: number; plus: number; pro: number };
    signupsLast7Days: number;
    totalGames: number;
    gameStatusCounts: { in_progress: number; completed: number; cancelled: number };
    gamesLast7Days: number;
    totalRounds: number;
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

export function DevStatsScreen({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<DevStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dev-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.supabase) setStats(data);
        else setError(data.error ?? "Couldn't load stats");
      })
      .catch(() => setError("Couldn't load stats"));
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-felt">
      <div className="mx-auto max-w-lg px-5 py-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4"
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

            <section>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-parchment/75">
                Email (Resend)
              </p>
              <div className="mt-2 rounded-card bg-paper p-3">
                {!stats.resend.configured && (
                  <p className="font-body text-xs text-ink/60">
                    Not connected — add <code>RESEND_API_KEY</code> to enable.
                  </p>
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
                  <p className="font-body text-xs text-ink/60">
                    Not connected — add <code>VERCEL_TOKEN</code> and <code>VERCEL_PROJECT_ID</code>{" "}
                    to enable.
                  </p>
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
