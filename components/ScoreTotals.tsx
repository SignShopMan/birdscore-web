"use client";

export function ScoreTotals({
  us,
  them,
  usLabel = "Us",
  themLabel = "Them",
  // True only on the actual Game Over screen. "Leading" describes an
  // ongoing, undecided comparison — showing it right under a headline
  // that's already declared a winner ("X wins") reads as a stale,
  // redundant label. "Won" says the same visual thing (which side is
  // highlighted) without contradicting the headline.
  gameOver = false,
}: {
  us: number;
  them: number;
  usLabel?: string;
  themLabel?: string;
  gameOver?: boolean;
}) {
  const usLeads = us > them;
  const themLeads = them > us;
  const badgeLabel = gameOver ? "Won" : "Leading";
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={`rounded-card p-4 text-center ${
          usLeads ? "bg-brass-tint ring-2 ring-brass" : "bg-paper-dim"
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="truncate font-body text-xs uppercase tracking-[0.2em] text-ink/75">
            {usLabel}
          </span>
          {usLeads && (
            <span className="shrink-0 rounded-full bg-brass px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink">
              {badgeLabel}
            </span>
          )}
        </div>
        <div className="font-score tabular-score text-4xl font-bold text-ink">{us}</div>
      </div>
      <div
        className={`rounded-card p-4 text-center ${
          themLeads ? "bg-brass-tint ring-2 ring-brass" : "bg-paper-dim"
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="truncate font-body text-xs uppercase tracking-[0.2em] text-ink/75">
            {themLabel}
          </span>
          {themLeads && (
            <span className="shrink-0 rounded-full bg-brass px-1.5 py-0.5 font-body text-[9px] font-bold uppercase tracking-wide text-ink">
              {badgeLabel}
            </span>
          )}
        </div>
        <div className="font-score tabular-score text-4xl font-bold text-ink">{them}</div>
      </div>
    </div>
  );
}
