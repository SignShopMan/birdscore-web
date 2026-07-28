"use client";

export function ScoreTotals({ us, them }: { us: number; them: number }) {
  const usLeads = us > them;
  const themLeads = them > us;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={`rounded-card p-4 text-center ${
          usLeads ? "bg-brass/25 ring-2 ring-brass" : "bg-paper-dim"
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/75">Us</span>
          {usLeads && (
            <span className="rounded-full bg-brass px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink">
              Leading
            </span>
          )}
        </div>
        <div className="font-score tabular-score text-5xl font-bold text-ink">{us}</div>
      </div>
      <div
        className={`rounded-card p-4 text-center ${
          themLeads ? "bg-brass/25 ring-2 ring-brass" : "bg-paper-dim"
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-body text-xs uppercase tracking-[0.2em] text-ink/75">Them</span>
          {themLeads && (
            <span className="rounded-full bg-brass px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink">
              Leading
            </span>
          )}
        </div>
        <div className="font-score tabular-score text-5xl font-bold text-ink">{them}</div>
      </div>
    </div>
  );
}
