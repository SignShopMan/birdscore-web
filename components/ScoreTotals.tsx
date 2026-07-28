"use client";

export function ScoreTotals({ us, them }: { us: number; them: number }) {
  const usLeads = us > them;
  const themLeads = them > us;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={`rounded-card p-4 text-center ${
          usLeads ? "bg-brass/25 ring-1 ring-brass" : "bg-parchment-dim"
        }`}
      >
        <div className="font-body text-xs uppercase tracking-[0.2em] text-ink/60">Us</div>
        <div className="font-score tabular-score text-5xl font-bold text-ink">{us}</div>
      </div>
      <div
        className={`rounded-card p-4 text-center ${
          themLeads ? "bg-brass/25 ring-1 ring-brass" : "bg-parchment-dim"
        }`}
      >
        <div className="font-body text-xs uppercase tracking-[0.2em] text-ink/60">Them</div>
        <div className="font-score tabular-score text-5xl font-bold text-ink">{them}</div>
      </div>
    </div>
  );
}
